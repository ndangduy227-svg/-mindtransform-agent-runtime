-- 0003 — QC P0 fixes (HANDOFF_Oto_Hop_Nhat_Runtime_QC_2026-06-11):
--   1) create workflow_runs / workflow_step_runs (code uses them; 0001 didn't)
--   2) approval_requests: run_id + interrupt_id with UNIQUE for dedupe
--   3) drop "Allow anon full access" policies — no anonymous writes to runtime
-- Engine + Control Plane API routes use the service role (server-side only).
-- Idempotent: safe on fresh DBs and on the live DB where some objects exist.

-- ── 1. workflow run tables ─────────────────────────────────────
create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_version_id uuid,
  session_id uuid references sessions(id) on delete set null,
  status text not null default 'running',  -- running | awaiting_approval | done | rejected | failed
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists workflow_step_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references workflow_runs(id) on delete cascade,
  workflow_step_id uuid,
  step_order integer,
  name text,
  status text not null default 'pending',
  output jsonb,
  started_at timestamptz,
  finished_at timestamptz
);

-- ── 2. approval dedupe (unique per run + interrupt) ────────────
alter table approval_requests add column if not exists run_id uuid;
alter table approval_requests add column if not exists interrupt_id text;
-- Full (non-partial) unique index — PostgREST ON CONFLICT requires it.
-- NULL pairs (legacy rows) stay distinct under default NULLS DISTINCT.
create unique index if not exists approval_requests_run_interrupt_uniq
  on approval_requests (run_id, interrupt_id);

-- ── 3. RLS lockdown — remove anon full access everywhere ──────
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
  loop
    execute format('drop policy if exists "Allow anon full access" on public.%I', t);
  end loop;
end
$$;

-- Enable RLS on the new tables too (service role bypasses RLS by design).
alter table workflow_runs enable row level security;
alter table workflow_step_runs enable row level security;

-- No anon policies are recreated. Anonymous role now has NO row access to
-- runtime tables. Server-side code (engine worker + Next.js API routes) must
-- use SUPABASE_SERVICE_ROLE_KEY. Browser never receives the service key.
