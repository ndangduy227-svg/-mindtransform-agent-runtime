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
- LLM provider status and test endpoints
- Supabase/database status and migration endpoints

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

LLM provider status:

```text
http://localhost:3000/api/llm/providers
```

Test one provider from the server:

```bash
curl -X POST http://localhost:3000/api/llm/test \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"groq\",\"dryRun\":true}"
```

Database setup status:

```text
http://localhost:3000/api/database/status
```

Migration SQL:

```text
http://localhost:3000/api/database/migration
```

## Supabase

Supabase is **not required** for this first UI deploy.

For MVP, create a separate Supabase project manually, run the SQL migration in `supabase/migrations/0001_agent_runtime_schema.sql`, then set:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

The app can check configuration automatically. It cannot create a Supabase project unless a Supabase Management token/project workflow is added:

```text
SUPABASE_ACCESS_TOKEN=
SUPABASE_PROJECT_REF=
```

## LLM Providers

Provider keys stay server-side in `.env.local` or Vercel env:

```text
GROQ_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OPENROUTER_API_KEY=
```

Supported route styles:

```text
OpenAI: Responses API
Groq: OpenAI-compatible chat completions
Gemini: generateContent
Claude: Anthropic Messages API
9Router/OpenRouter: OpenAI-compatible chat completions
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
