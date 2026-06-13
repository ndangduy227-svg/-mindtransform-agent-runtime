-- 0005 - approval integrity, durable workflow outputs, and internal CMS.

create table if not exists approval_decision_duplicates_archive (
  like approval_decisions including all
);
alter table approval_decision_duplicates_archive
  add column if not exists archived_at timestamptz not null default now(),
  add column if not exists archive_reason text not null default 'duplicate approval decision';
alter table approval_decision_duplicates_archive enable row level security;

with ranked as (
  select id, row_number() over (
    partition by approval_request_id
    order by created_at, id
  ) as row_number
  from approval_decisions
),
duplicates as (
  select id from ranked where row_number > 1
)
insert into approval_decision_duplicates_archive (
  id, approval_request_id, decision, actor, reason, created_at
)
select d.id, d.approval_request_id, d.decision, d.actor, d.reason, d.created_at
from approval_decisions d
join duplicates on duplicates.id = d.id
on conflict (id) do nothing;

with ranked as (
  select id, row_number() over (
    partition by approval_request_id
    order by created_at, id
  ) as row_number
  from approval_decisions
)
delete from approval_decisions
where id in (select id from ranked where row_number > 1);

create unique index if not exists approval_decisions_request_uniq
  on approval_decisions (approval_request_id);

alter table side_effect_receipts
  drop constraint if exists side_effect_receipts_idempotency_key_key;
create unique index if not exists side_effect_receipts_run_idempotency_uniq
  on side_effect_receipts (workflow_run_id, idempotency_key);

create or replace function decide_workflow_approval(
  p_approval_request_id uuid,
  p_decision text,
  p_actor text,
  p_reason text default null
)
returns table(run_id uuid, interrupt_id text, decision text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request approval_requests%rowtype;
  v_existing_decision text;
begin
  if p_decision not in ('approve', 'reject') then
    raise exception 'invalid approval decision';
  end if;

  select *
    into v_request
    from approval_requests
   where id = p_approval_request_id
   for update;

  if not found then
    raise exception 'approval request not found';
  end if;
  if v_request.status = 'resume_failed' then
    select approval_decisions.decision
      into v_existing_decision
      from approval_decisions
     where approval_request_id = p_approval_request_id;
    if v_existing_decision <> p_decision then
      raise exception 'approval request already decided differently';
    end if;
    update approval_requests
       set status = p_decision
     where id = p_approval_request_id;
    return query select v_request.run_id, v_request.interrupt_id, p_decision;
    return;
  end if;
  if v_request.status <> 'pending' then
    raise exception 'approval request already decided';
  end if;
  if v_request.run_id is null then
    raise exception 'approval request has no workflow run';
  end if;

  insert into approval_decisions (
    approval_request_id, decision, actor, reason
  ) values (
    p_approval_request_id, p_decision, coalesce(nullif(p_actor, ''), 'Founder'), p_reason
  );

  update approval_requests
     set status = p_decision
   where id = p_approval_request_id;

  return query select v_request.run_id, v_request.interrupt_id, p_decision;
end;
$$;

revoke all on function decide_workflow_approval(uuid, text, text, text) from public;
grant execute on function decide_workflow_approval(uuid, text, text, text) to service_role;

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  workflow_run_id uuid references workflow_runs(id) on delete set null,
  slug text not null unique,
  title text not null,
  excerpt text,
  content_md text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_published_idx
  on blog_posts (status, published_at desc);

alter table blog_posts enable row level security;
