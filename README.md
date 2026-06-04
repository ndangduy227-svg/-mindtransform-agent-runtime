# Mindtransform Agent Runtime

First deployable version of **Mind Agent Center**, the internal control center for Mindtransform's agent-led agency runtime.

## What This Is

This v0 is a deployable Next.js app with mock data. It is meant to prove the product surface before wiring Supabase, model calls, and workflow execution.

The app currently includes:

- Config Studio for agent/workflow/memory version setup
- Agent Registry with SOW, input contracts, output contracts, and policies
- Workflow Registry for `Website MindAI -> Proposal Seed`
- Session Inbox for website intake leads
- Memory Control for context snapshots and protected facts
- Runtime Database map
- Cost and Eval console
- API health endpoint
- Runtime summary endpoint

## Current Status

```text
UI: implemented
Mock data: implemented
API health: implemented
Supabase persistence: not yet implemented
LLM/model calls: not yet implemented
Workflow runner: not yet implemented
Vercel deploy: pending
```

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Health:

```text
http://localhost:3000/api/health
```

Runtime summary:

```text
http://localhost:3000/api/runtime/summary
```

## Supabase

Supabase is **not required** for this first UI deploy.

When moving to v1 persistence, create a separate Supabase project for the runtime and set:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Planned table groups:

```text
Identity:
organizations, contacts, leads

Agents:
agents, agent_versions, agent_skills, agent_tool_permissions, agent_eval_rubrics

Workflows:
workflows, workflow_versions, workflow_steps, workflow_runs, workflow_run_events

Sessions:
sessions, session_messages, handoffs, lead_qualification

Memory:
context_snapshots, memory_items, protected_facts

Tools and cost:
tools, tool_calls, approval_requests, model_calls, cost_events, eval_runs
```

## Deployment

Vercel is the target deployment platform.

```bash
vercel
vercel --prod
```

If deploying from CI, use:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

## Product Principle

```text
Website owns UX.
Agent Runtime owns intelligence, state, workflow, memory, tools, approvals, and evidence.
```

The first proof workflow:

```text
Website MindAI chat
  -> runtime session
  -> consultant diagnosis
  -> context snapshot
  -> lead qualification
  -> proposal seed
  -> founder approval
  -> Planner handoff
```
