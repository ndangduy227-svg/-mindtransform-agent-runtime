create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  industry text,
  created_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  name text,
  email text,
  phone text,
  source text not null default 'mind_ai',
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  status text not null default 'new',
  score integer,
  recommended_offer text,
  pain_summary text,
  created_at timestamptz not null default now()
);

create table if not exists model_routes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  primary_provider text not null,
  primary_model text not null,
  fallback_providers jsonb not null default '[]'::jsonb,
  cost_policy jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text not null,
  owner text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  version text not null,
  mission text not null,
  sow_in jsonb not null default '[]'::jsonb,
  sow_out jsonb not null default '[]'::jsonb,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  model_route_id uuid references model_routes(id) on delete set null,
  memory_policy jsonb not null default '{}'::jsonb,
  approval_policy jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  unique(agent_id, version)
);

create table if not exists agent_skills (
  id uuid primary key default gen_random_uuid(),
  agent_version_id uuid not null references agent_versions(id) on delete cascade,
  kind text not null check (kind in ('skill', 'child_skill')),
  slug text not null,
  purpose text not null,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  permission text not null default 'allowed'
);

create table if not exists agent_scripts (
  id uuid primary key default gen_random_uuid(),
  agent_version_id uuid not null references agent_versions(id) on delete cascade,
  slug text not null,
  runtime text not null default 'node',
  path text not null,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  permission text not null default 'approval_required'
);

create table if not exists agent_mcp_servers (
  id uuid primary key default gen_random_uuid(),
  agent_version_id uuid not null references agent_versions(id) on delete cascade,
  name text not null,
  server_ref text not null,
  allowed_methods jsonb not null default '[]'::jsonb,
  permission text not null default 'approval_required'
);

create table if not exists agent_cli_tools (
  id uuid primary key default gen_random_uuid(),
  agent_version_id uuid not null references agent_versions(id) on delete cascade,
  name text not null,
  command_policy jsonb not null default '{}'::jsonb,
  permission text not null default 'approval_required'
);

create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists workflow_versions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  version text not null,
  trigger_schema jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  unique(workflow_id, version)
);

create table if not exists workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_version_id uuid not null references workflow_versions(id) on delete cascade,
  step_order integer not null,
  name text not null,
  owner_agent_id uuid references agents(id) on delete set null,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  approval_required boolean not null default false
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  source text not null default 'website_mindai',
  status text not null default 'open',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null,
  content text not null,
  token_estimate integer,
  created_at timestamptz not null default now()
);

create table if not exists context_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  source_message_start uuid,
  source_message_end uuid,
  summary text not null,
  decisions jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  handoff_delta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists protected_facts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  fact_key text not null,
  fact_value jsonb not null,
  source_ref text,
  freshness_status text not null default 'current',
  created_at timestamptz not null default now()
);

create table if not exists handoffs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  from_agent_id uuid references agents(id) on delete set null,
  to_agent_id uuid references agents(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists lead_qualification (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  score integer not null,
  fit_reason text,
  recommended_offer text,
  urgency text,
  next_action text,
  created_at timestamptz not null default now()
);

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete set null,
  request_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists approval_decisions (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references approval_requests(id) on delete cascade,
  decision text not null,
  actor text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists tool_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete set null,
  agent_version_id uuid references agent_versions(id) on delete set null,
  tool_kind text not null,
  tool_name text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status text not null default 'pending',
  approval_request_id uuid references approval_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists model_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete set null,
  agent_version_id uuid references agent_versions(id) on delete set null,
  provider text not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  cost_usd numeric(12, 6),
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists eval_cases (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  input jsonb not null default '{}'::jsonb,
  expected jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists eval_runs (
  id uuid primary key default gen_random_uuid(),
  eval_case_id uuid not null references eval_cases(id) on delete cascade,
  agent_version_id uuid references agent_versions(id) on delete set null,
  status text not null,
  score numeric(5, 2),
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
