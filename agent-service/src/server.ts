import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { resolveTenant } from "./tenant/context.js";
import { runConsultant } from "./graphs/mind_consultant.js";
import { enqueueWorkflow } from "./queue/index.js";
import { ping as neo4jPing } from "./graphrag/neo4j.js";

/**
 * API (thin): enqueue + read status. Heavy work runs in worker.ts.
 * Routes: /health /status /consult (sync) /run (async) /approve
 */
const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, service: "agent-service" }));

app.get("/status", async (c) => {
  return c.json({ neo4j: await neo4jPing() });
});

// SYNC — Consultant (user waits a few seconds, no queue)
app.post("/consult", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const tenant = resolveTenant(body.tenantId);
  const result = await runConsultant(body.message ?? "", tenant.tenantId, body.history ?? []);
  return c.json(result);
});

// ASYNC — start a background workflow, return run_id immediately
app.post("/run", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const tenant = resolveTenant(body.tenantId);
  const runId = crypto.randomUUID();
  await enqueueWorkflow({
    runId,
    graph: body.graph ?? "wf01_research_template_blog",
    tenantId: tenant.tenantId,
    input: body.input ?? {},
  });
  return c.json({ runId, status: "queued" });
});

// Resume an interrupted workflow after founder approval
app.post("/approve", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const tenant = resolveTenant(body.tenantId);
  await enqueueWorkflow({
    runId: body.runId,
    graph: body.graph ?? "wf01_research_template_blog",
    tenantId: tenant.tenantId,
    input: {},
    resumeFrom: body.runId, // worker resumes from checkpoint + injects decision
  });
  return c.json({ runId: body.runId, status: "resuming", decision: body.decision ?? "approve" });
});

const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port });
console.log(`[agent-service] API listening on :${port}`);
