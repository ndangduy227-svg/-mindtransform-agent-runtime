# Mindtransform Agent Platform

Monorepo for the Mind Agent Platform — internal AI agents + the public Mind AI
Consultant. Two deployables sharing one Supabase database and one Neo4j
knowledge graph.

> Architecture: `12_Agents/08_Agent_Runtime_Tool/Agents_Architecture_v3_GraphRAG.md`
> Canonical workflow: **The Mind Flow** (`wf_01_the_mind_flow`) —
> `12_Agents/01_Workflows/WF_01_The_Mind_Flow.md`
> QC baseline: `12_Agents/08_Agent_Runtime_Tool/HANDOFF_Oto_Hop_Nhat_Runtime_QC_2026-06-11.md`

## Architecture (v3)

```
┌─────────────────────────────┐   HTTP    ┌──────────────────────────────┐
│ Next.js (this root) ─ Vercel │ ───────►  │ agent-service/ ─ Railway      │
│ = CONTROL PLANE              │ /run      │ = ENGINE (always-on)          │
│  • Agents / Workflows / Chat │ /consult  │  • LangGraph.js workflows     │
│  • Runs + Approvals          │ /approve  │  • pg-boss queue + worker     │
│  • Costs dashboard           │ /status   │  • GraphRAG (Neo4j) layer     │
└──────────────┬───────────────┘ ◄───────  │  • model router + cost log    │
               │                            └───────────────┬──────────────┘
               └────────► Supabase Postgres ◄───────────────┘
                                       │
                                  Neo4j Aura
```

## Status — honest, per QC verification levels

Levels: **orchestration verified** (core loop proven) · **connector
implemented** (code exists, not proven live) · **connector live verified**
(proven against the real external system) · **production ready**.

| Piece | Level | Evidence |
|---|---|---|
| Queue → graph → checkpoint → interrupt → resume | orchestration verified | live runs + 15 automated tests |
| Approval semantics (approve / **reject** / duplicate) | orchestration verified | tests + live reject run `45409d2c` ended `rejected`, no marketing |
| Notes reducer (no duplication) | orchestration verified | automated test |
| Queue retry propagation (retryable vs fail-fast) | orchestration verified | error-classifier tests |
| Engine API auth (x-api-key) + Zod validation | orchestration verified | 401/422 verified live |
| RLS lockdown (no anon access to runtime tables) | live verified | anon read returns empty post-0003 |
| Migrations incl. `workflow_runs` (0001–0003) | live verified | applied to live DB |
| GraphRAG ingest + multi-hop query (Neo4j Aura) | live verified | sample-doc smoke; **grounding relevance gate NOT built** (known cross-domain leak) |
| Model router + real cost logging → `model_calls` | live verified | Groq usage rows with provider-reported tokens |
| Lark build tool | **stub** | returns placeholder — not workflow output |
| Screenshot / evidence tool | **stub** | — |
| Publisher + post-publish verification | **not built** | — |
| Idempotency / resource registry / receipts | **not built** | — |
| Projects / chat-per-project / Graph Viewer UI | **not built** | build brief: The Mind Flow Runtime v1 |
| Engine deploy on Railway | **not done** | runs locally |

**The Mind Flow business workflow is NOT end-to-end yet** — research/plan run
on real models, but build/evidence/publish are stubs. See the build brief and
QC handoff for the P1/P2 backlog (execution harness, real tools, projects UI).

## Repo layout

```
src/                  Next.js Control Plane (views, API routes)
supabase/migrations/  0001 schema · 0002 (superseded) · 0003 runs + RLS lockdown
agent-service/        ENGINE — see agent-service/README.md
```

## Quick start

```bash
# Control Plane (needs SUPABASE_SERVICE_ROLE_KEY + AGENT_SERVICE_KEY in .env.local)
npm install && npm run dev          # http://localhost:3000

# Engine (fill agent-service/.env: Supabase, Neo4j, model keys, ENGINE_API_KEY)
cd agent-service && npm install
npm test                            # 15 tests: approval semantics, retry classifier
npx tsx --env-file=.env src/graphrag/setup.ts   # one-shot Neo4j schema
npm run dev:server                  # API :8080 (x-api-key required on /run /approve)
npm run dev:worker
```

## Next (from The Mind Flow build brief)

P0 correctness/security ✅ (this commit) → P1 execution harness (node contract,
error taxonomy, idempotency/receipts) → P2 real tools (Lark adapter, evidence,
publisher, verification) → Projects/Graph-Viewer UI → Railway deploy.
