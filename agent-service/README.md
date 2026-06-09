# agent-service — Mind Agent Platform Engine (v3)

Always-on workflow runtime for Mindtransform. **LangGraph.js** orchestration +
**GraphRAG on Neo4j** knowledge layer + **pg-boss** queue on Supabase Postgres.
Deploys to **Railway**; the Next.js app (repo root) is the Control Plane on Vercel.

> Architecture source of truth: `12_Agents/08_Agent_Runtime_Tool/Agents_Architecture_v3_GraphRAG.md`

## What this is / isn't

- **Engine** = this folder. Runs long workflows, holds state, talks to models + Neo4j + tools.
- **Control Plane** = the Next.js app at repo root (config UI, cost dashboard, approval UI). Calls this engine over HTTP.
- Shared **Supabase** (state/cost/queue/leads) + shared **Neo4j** (knowledge graph).

## Status: SKELETON

All files compile-shaped but provider calls, GraphRAG extraction, and tool spawns
are **stubs** marked with `TODO`. This is the P0 scaffold from the v3 roadmap.

## Layout

```
src/
  server.ts      API: /health /status /consult(sync) /run(async) /approve
  worker.ts      pg-boss consumer → runs LangGraph workflows (+ resume)
  graphs/        mind_consultant (sync) · wf01_research_template_blog (async)
  nodes/         reusable nodes: retrieveGraph, callModel, runTool, retry
  graphrag/      neo4j client · ingest (doc→graph) · query (hybrid vector+traverse)
  memory/        PostgresSaver checkpointer (pause/resume)
  models/        provider router + cost logging → model_calls
  tenant/        tenant context + cost cap + max_iterations
  tools/         web_search · lark_template_build · screenshot (stubs)
  queue/         pg-boss enqueue/consume
  db/            supabase client
schema/neo4j_constraints.cypher   constraints + vector index + MIND seed
```

## Run locally (after founder fills credentials)

```bash
cd agent-service
cp .env.example .env        # fill Supabase, Neo4j, model keys
npm install
# 1. create Neo4j constraints + index (paste schema/neo4j_constraints.cypher in Neo4j Browser)
# 2. start API + worker in two terminals
npm run dev:server
npm run dev:worker
# 3. smoke test
curl localhost:8080/health
curl localhost:8080/status            # neo4j ping
curl -XPOST localhost:8080/consult -H 'content-type: application/json' \
  -d '{"message":"Spa 3 chi nhánh chase báo cáo qua Zalo"}'
```

## Deploy (Railway)

Two services from this one image (see `Dockerfile`):
- **api**: `npm run start:server`
- **worker**: `npm run start:worker`

Set all `.env` vars in Railway. Point the Next.js Control Plane's "Run" actions
at the api service URL.

## Build order (v3 roadmap)

- **P0** skeleton (this) → wire Supabase + Neo4j ping + 1 hello graph end-to-end
- **P1** Consultant sync + GraphRAG query + real cost logging
- **P2** WF_01 async: 4 nodes + retry + interrupt approval + GraphRAG ingest
- **P3** multi-tenant: deployments + Lark embed + billing

## Founder TODO before this runs

Accounts/keys (see v3 doc §8): Railway, **Neo4j Aura**, Supabase, model API keys,
Lark app. Then `npm install`, fill `.env`, run constraints cypher, ingest KB seed.
