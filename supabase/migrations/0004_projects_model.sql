-- 0004 — The Mind Flow Runtime v1, Build Order step 1 (build brief §4, §9, §10):
-- projects/chat model, runtime events, per-node runs, receipts/artifacts,
-- and usage-accounting dimensions on model_calls.
-- Idempotent. RLS enabled everywhere; NO anon policies (0003 lockdown stands).

-- ── projects + workflow pin ────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  objective text,
  industry text,
  client_name text,
  status text not null default 'active',   -- active | archived
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_workflows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workflow_key text not null,              -- e.g. wf_01_the_mind_flow
  workflow_version text not null default 'v1',
  pinned_at timestamptz not null default now(),
  unique (project_id, workflow_key)
);

-- ── project linkage on existing tables ─────────────────────────
alter table sessions       add column if not exists project_id uuid references projects(id) on delete set null;
alter table workflow_runs  add column if not exists project_id uuid references projects(id) on delete set null;
alter table workflow_runs  add column if not exists graph_key text;
alter table workflow_runs  add column if not exists current_node text;

-- ── usage accounting dimensions (build brief §8) ───────────────
alter table model_calls add column if not exists project_id uuid;
alter table model_calls add column if not exists workflow_run_id uuid;
alter table model_calls add column if not exists node_id text;
alter table model_calls add column if not exists source text default 'workflow';      -- chat | workflow
alter table model_calls add column if not exists usage_source text default 'provider_reported'; -- provider_reported | estimated
create index if not exists model_calls_project_idx on model_calls (project_id, created_at desc);

-- ── per-node run records (Graph Viewer source) ─────────────────
create table if not exists workflow_node_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null,
  project_id uuid,
  node_id text not null,
  status text not null default 'running', -- running | awaiting_approval | retrying | success | partial | rejected | failed | blocked
  retry_count integer not null default 0,
  output_summary jsonb,
  error jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (workflow_run_id, node_id)
);

-- ── runtime event stream (build brief §10) ─────────────────────
create table if not exists workflow_run_events (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null,
  project_id uuid,
  type text not null,        -- run.queued|run.started|node.started|node.completed|node.failed|approval.requested|approval.approved|approval.rejected|artifact.created|tool.completed|run.completed|run.blocked|run.failed|run.rejected
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists workflow_run_events_run_idx on workflow_run_events (workflow_run_id, created_at);

-- ── artifacts / external resources / receipts (§9, QC §13) ────
create table if not exists artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  workflow_run_id uuid,
  kind text not null,            -- research_md | template_plan | blog_md | post_json | media | receipt
  name text not null,
  uri text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists external_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  logical_key text not null,     -- e.g. opportunities.pipeline_by_stage
  kind text not null,            -- lark_table | lark_view | lark_form | lark_dashboard | cms_post
  external_id text,
  external_url text,
  receipt jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, logical_key)
);

create table if not exists side_effect_receipts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  workflow_run_id uuid,
  node_id text,
  operation text not null,       -- lark.view.upsert | publish.static_git | ...
  idempotency_key text not null,
  status text not null,          -- verified | partial | failed
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);

-- ── RLS on every new table (service-role only; no anon policies) ─
do $$
declare t text;
begin
  foreach t in array array[
    'projects','project_workflows','workflow_node_runs','workflow_run_events',
    'artifacts','external_resources','side_effect_receipts'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$$;
