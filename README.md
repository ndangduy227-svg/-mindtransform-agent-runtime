# Mindtransform Agent Platform

Monorepo for the Mind Agent Platform — internal AI agents + the public Mind AI
Consultant. Two deployables that share one Supabase database and one Neo4j
knowledge graph.

> **Architecture source of truth:** `12_Agents/08_Agent_Runtime_Tool/Agents_Architecture_v3_GraphRAG.md`

## Architecture (v3)

```
┌─────────────────────────────┐   HTTP    ┌──────────────────────────────┐
│ Next.js (this root) ─ Vercel │ ───────►  │ agent-service/ ─ Railway      │
│ = CONTROL PLANE              │ /run      │ = ENGINE (always-on)          │
│  • Config Studio (UI)        │ /consult  │  • LangGraph.js workflows     │
│  • Cost dashboard            │ /approve  │  • pg-boss queue + worker     │
│  • Approval UI               │ /status   │  • GraphRAG (Neo4j) layer     │
│  • Web Mind public + chat    │ ◄───────  │  • tool connectors            │
└──────────────┬───────────────┘  status   └───────────────┬──────────────┘
               │                                            │
               └────────► Supabase Postgres ◄───────────────┘
                          (config · state · queue · cost · leads)
                                       │
                                  Neo4j Aura
                            (knowledge graph + vector index)
```

- **Control Plane (Next.js, this root)** — where humans configure agents, watch
  cost, and approve workflow steps. Does **not** run agents itself; calls the engine over HTTP.
- **Engine (`agent-service/`)** — always-on Node/TS service. Runs long workflows,
  holds state (checkpoints), calls models + GraphRAG + tools. Deploys to Railway.
- **GraphRAG** — knowledge stored as a graph (Industry→Pain→Solution→CaseStudy)
  on Neo4j with a native vector index. Lets agents reason over relationships
  (multi-hop), powering the MIND "compounding asset".

## Repo layout

```
src/                  Next.js Control Plane (Config Studio, dashboards, public chat)
  app/api/            CRUD + LLM test routes
  components/, lib/
supabase/migrations/  Postgres schema (agents, sessions, model_calls, RLS, …)
agent-service/        ⬅ ENGINE (LangGraph.js + GraphRAG + pg-boss). See its README.
```

## Quick start

**Control Plane (Next.js):**
```bash
npm install
npm run dev        # http://localhost:3000
```

**Engine:** see [`agent-service/README.md`](./agent-service/README.md).

## Build roadmap (v3)

| Phase | Scope |
|---|---|
| P0 | agent-service skeleton: server + worker + pg-boss + Neo4j ping + hello graph |
| P1 | Consultant sync (`/consult`) + GraphRAG query + real cost logging → dashboard |
| P2 | WF_01 async: research→plan→build→marketing, retry, approval interrupt, GraphRAG ingest |
| P3 | multi-tenant: deployments + Lark embed + per-tenant billing |

Stop after P2 → run MIND with one real client before P3.

## Founder setup (accounts/keys — see v3 doc §8)

Railway · Neo4j Aura · Supabase · model API keys (Groq/Gemini/Claude) · Lark app.
Fill `agent-service/.env`, run `agent-service/schema/neo4j_constraints.cypher`,
then ingest the KB seed docs.
