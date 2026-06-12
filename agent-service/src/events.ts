import { supabase } from "./db/supabase.js";

/**
 * Runtime event stream + per-node run records (build brief §10).
 * Stable event schema — UI polls now, SSE/WebSocket can reuse later.
 * DB write failures are surfaced loudly (QC P1: no silent state drift).
 */

export type RunEventType =
  | "run.queued" | "run.started" | "run.completed" | "run.rejected" | "run.blocked" | "run.failed"
  | "node.started" | "node.retrying" | "node.partial" | "node.completed" | "node.failed"
  | "approval.requested" | "approval.approved" | "approval.rejected"
  | "artifact.created" | "tool.completed";

export interface RunContext {
  runId: string;
  projectId?: string | null;
}

export async function emitEvent(
  ctx: RunContext,
  type: RunEventType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.from("workflow_run_events").insert({
    workflow_run_id: ctx.runId,
    project_id: ctx.projectId ?? null,
    type,
    payload,
  });
  if (error) console.error(`[events] ${type} write FAILED (state may drift): ${error.message}`);
}

export async function nodeStarted(ctx: RunContext, nodeId: string): Promise<void> {
  await emitEvent(ctx, "node.started", { nodeId });
  const { error } = await supabase.from("workflow_node_runs").upsert(
    {
      workflow_run_id: ctx.runId,
      project_id: ctx.projectId ?? null,
      node_id: nodeId,
      status: "running",
      started_at: new Date().toISOString(),
      finished_at: null,
      error: null,
    },
    { onConflict: "workflow_run_id,node_id" },
  );
  if (error) console.error(`[events] node_run start FAILED: ${error.message}`);
  await supabase.from("workflow_runs").update({ current_node: nodeId }).eq("id", ctx.runId);
}

export async function nodeFinished(
  ctx: RunContext,
  nodeId: string,
  status: "success" | "partial" | "rejected" | "failed" | "awaiting_approval" | "blocked",
  outputSummary?: Record<string, unknown>,
  error?: { message: string; class?: string },
): Promise<void> {
  await emitEvent(ctx, status === "failed" ? "node.failed" : "node.completed", {
    nodeId,
    status,
    ...(error ? { error: error.message } : {}),
  });
  const { error: dbErr } = await supabase.from("workflow_node_runs").upsert(
    {
      workflow_run_id: ctx.runId,
      project_id: ctx.projectId ?? null,
      node_id: nodeId,
      status,
      output_summary: outputSummary ?? null,
      error: error ?? null,
      finished_at: new Date().toISOString(),
    },
    { onConflict: "workflow_run_id,node_id" },
  );
  if (dbErr) console.error(`[events] node_run finish FAILED: ${dbErr.message}`);
}

/** Wrap a graph node: emits started/completed/failed + records the node run. */
export function instrument<S extends { runId: string; projectId?: string }>(
  nodeId: string,
  fn: (s: S) => Promise<Partial<S> & Record<string, unknown>>,
) {
  return async (s: S) => {
    const ctx: RunContext = { runId: s.runId, projectId: s.projectId };
    await nodeStarted(ctx, nodeId);
    try {
      const out = await fn(s);
      // Note: interrupt() THROWS GraphInterrupt — it skips this success path,
      // so approval nodes stay "running" until the worker marks awaiting_approval.
      const blocked = (out as { blocked?: { node: string; reason: string } }).blocked;
      if (blocked && blocked.node === nodeId) {
        await nodeFinished(ctx, nodeId, "blocked", summarize(out), { message: blocked.reason });
      } else {
        await nodeFinished(ctx, nodeId, "success", summarize(out));
      }
      return out;
    } catch (e) {
      const name = (e as Error)?.name ?? "";
      if (name.includes("Interrupt")) throw e; // not a failure — graph is pausing
      await nodeFinished(ctx, nodeId, "failed", undefined, { message: (e as Error).message });
      throw e;
    }
  };
}

function summarize(out: Record<string, unknown>): Record<string, unknown> {
  const notes = out.notes as string[] | undefined;
  return {
    keys: Object.keys(out),
    notePreview: notes?.length ? String(notes[notes.length - 1]).slice(0, 280) : undefined,
  };
}
