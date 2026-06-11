import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";
import { resolveTenant } from "./tenant/context.js";
import { runConsultant } from "./graphs/mind_consultant.js";
import { enqueueWorkflow } from "./queue/index.js";
import { ping as neo4jPing } from "./graphrag/neo4j.js";
import { KNOWN_GRAPHS } from "./worker_graphs.js";
import { emitEvent } from "./events.js";

/**
 * API (thin): enqueue + read status. Heavy work runs in worker.ts.
 * Routes: /health /status (public) · /consult /run /approve (x-api-key).
 */
const app = new Hono();

// ── service-to-service auth (skip health/status) ──────────────
const API_KEY = process.env.ENGINE_API_KEY ?? "";
app.use("*", async (c, next) => {
  const path = c.req.path;
  if (path === "/health" || path === "/status") return next();
  if (!API_KEY) {
    console.warn("[server] ENGINE_API_KEY not set — rejecting protected route");
    return c.json({ error: "engine auth not configured" }, 503);
  }
  if (c.req.header("x-api-key") !== API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
});

app.get("/health", (c) => c.json({ ok: true, service: "agent-service" }));
app.get("/status", async (c) => c.json({ neo4j: await neo4jPing() }));

// ── schemas ────────────────────────────────────────────────────
const ConsultBody = z.object({
  message: z.string().min(1).max(8000),
  history: z.array(z.string().max(8000)).max(50).default([]),
  tenantId: z.string().max(64).optional(),
  projectId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

const RunBody = z.object({
  graph: z.string().max(80).default("wf_01_the_mind_flow"),
  input: z.record(z.unknown()).default({}),
  runId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  tenantId: z.string().max(64).optional(),
});

const ApproveBody = z.object({
  runId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]).default("approve"),
  graph: z.string().max(80).default("wf_01_the_mind_flow"),
  tenantId: z.string().max(64).optional(),
});

// SYNC — Consultant (user waits a few seconds, no queue)
app.post("/consult", async (c) => {
  const parsed = ConsultBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const tenant = resolveTenant(parsed.data.tenantId);
  const result = await runConsultant(parsed.data.message, tenant.tenantId, parsed.data.history, {
    projectId: parsed.data.projectId,
    sessionId: parsed.data.sessionId,
  });
  return c.json(result);
});

// ASYNC — start a background workflow, return run_id immediately
app.post("/run", async (c) => {
  const parsed = RunBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { graph, input, runId: bodyRunId, projectId, tenantId } = parsed.data;
  if (!KNOWN_GRAPHS.includes(graph)) {
    return c.json({ error: `unknown graph: ${graph}`, known: KNOWN_GRAPHS }, 422);
  }
  const tenant = resolveTenant(tenantId);
  const runId = bodyRunId ?? crypto.randomUUID();
  await enqueueWorkflow({ runId, graph, tenantId: tenant.tenantId, projectId, input });
  await emitEvent({ runId, projectId }, "run.queued", { graph });
  return c.json({ runId, status: "queued" });
});

// Resume an interrupted workflow with the founder's REAL decision
app.post("/approve", async (c) => {
  const parsed = ApproveBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { runId, decision, graph, tenantId } = parsed.data;
  if (!KNOWN_GRAPHS.includes(graph)) {
    return c.json({ error: `unknown graph: ${graph}`, known: KNOWN_GRAPHS }, 422);
  }
  const tenant = resolveTenant(tenantId);
  await enqueueWorkflow({
    runId,
    graph,
    tenantId: tenant.tenantId,
    input: {},
    resumeFrom: runId,
    decision, // carried through the job — worker resumes with this, never hard-codes
  });
  return c.json({ runId, status: "resuming", decision });
});

const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port });
console.log(`[agent-service] API listening on :${port}`);
