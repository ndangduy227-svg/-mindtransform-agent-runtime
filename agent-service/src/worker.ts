import { Command } from "@langchain/langgraph";
import { getBoss, WF_QUEUE, type WorkflowJob } from "./queue/index.js";
import { GRAPH_FACTORIES } from "./worker_graphs.js";
import { supabase } from "./db/supabase.js";
import { emitEvent, nodeFinished, type RunContext } from "./events.js";

/**
 * Worker: pulls jobs from pg-boss → runs the LangGraph workflow.
 * Lifecycle is mirrored to Supabase (workflow_runs + node runs + event stream)
 * so the Project Workspace / Graph Viewer can follow along by polling.
 */

/** Transient signatures → let pg-boss retry. Policy/auth/validation → fail fast. */
export function isRetryableError(message: string): boolean {
  if (/(row-level security|permission denied|unauthorized|forbidden|invalid input|schema)/i.test(message)) {
    return false; // POLICY_DENIED / AUTH / SCHEMA_DRIFT — retrying blindly is wrong
  }
  return /(timeout|timed out|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up|fetch failed|429|rate.?limit|50[234]|limited)/i.test(
    message,
  );
}

async function setRunStatus(job: WorkflowJob, status: string, output?: unknown) {
  const row: Record<string, unknown> = {
    id: job.runId,
    status,
    graph_key: job.graph,
  };
  // Resume jobs don't carry projectId — NEVER null-overwrite the linkage.
  if (job.projectId) row.project_id = job.projectId;
  if (output !== undefined) row.output = output;
  if (Object.keys(job.input ?? {}).length) row.input = job.input;
  if (["done", "failed", "rejected", "blocked"].includes(status)) row.finished_at = new Date().toISOString();
  const { error } = await supabase.from("workflow_runs").upsert(row, { onConflict: "id" });
  if (error) console.error(`[worker] workflow_runs upsert FAILED: ${error.message}`);
}

/** Dedupe by run_id + interrupt_id — re-delivery/resume never creates a second request. */
async function upsertApprovalRequest(
  runId: string,
  interruptId: string,
  value: Record<string, unknown>,
) {
  const { error } = await supabase.from("approval_requests").upsert(
    {
      run_id: runId,
      interrupt_id: interruptId,
      request_type: "workflow_approval",
      payload: { runId, ...value },
      status: "pending",
    },
    { onConflict: "run_id,interrupt_id" },
  );
  if (error) console.error(`[worker] approval_requests upsert FAILED: ${error.message}`);
}

async function handle(job: WorkflowJob): Promise<void> {
  const ctx: RunContext = { runId: job.runId, projectId: job.projectId };
  const factory = GRAPH_FACTORIES[job.graph];
  if (!factory) {
    console.error(`[worker] unknown graph: ${job.graph}`);
    await setRunStatus(job, "failed", { error: `unknown graph: ${job.graph}` });
    await emitEvent(ctx, "run.failed", { error: `unknown graph: ${job.graph}` });
    return; // non-retryable: ack
  }
  const graph = await factory();
  const config = { configurable: { thread_id: job.runId } };

  try {
    let result;
    if (job.resumeFrom) {
      const decision = job.decision ?? "approve";
      // which approval node is pending? (there are 2 gates now)
      const pre = await graph.getState(config);
      const pendingNode: string = pre.next?.[0] ?? "scope_approval";
      await emitEvent(ctx, decision === "approve" ? "approval.approved" : "approval.rejected", {
        decision,
        nodeId: pendingNode,
      });
      // The decision is already durable before this job is enqueued.
      await nodeFinished(ctx, pendingNode, decision === "approve" ? "success" : "rejected", { decision });
      result = await graph.invoke(new Command({ resume: decision }), config);
    } else {
      await setRunStatus(job, "running");
      await emitEvent(ctx, "run.started", { graph: job.graph, input: job.input });
      result = await graph.invoke(
        {
          tenantId: job.tenantId,
          runId: job.runId,
          projectId: job.projectId ?? "",
          vertical: (job.input?.vertical as string) ?? "Spa",
          objective: (job.input?.objective as string) ?? "",
          clientName: (job.input?.clientName as string) ?? "",
          brief: (job.input?.brief as string) ?? "",
        },
        config,
      );
    }

    // Paused? — pending next-nodes on the checkpoint mean an interrupt fired.
    const st = await graph.getState(config);
    if (st.next?.length) {
      const intr = st.tasks?.flatMap((t: any) => t.interrupts ?? [])[0];
      const interruptId: string = intr?.ns?.[0] ?? intr?.id ?? `${job.runId}:interrupt`;
      const nodeId: string = st.next[0] ?? "approval";
      const value =
        intr?.value && typeof intr.value === "object"
          ? (intr.value as Record<string, unknown>)
          : { summary: String(intr?.value ?? "Workflow approval") };
      console.log(`[worker] run ${job.runId} paused for approval (${interruptId})`);
      await setRunStatus(job, "awaiting_approval");
      await nodeFinished(ctx, nodeId, "awaiting_approval", value);
      await supabase.from("workflow_runs").update({ current_node: nodeId }).eq("id", job.runId);
      await upsertApprovalRequest(job.runId, interruptId, value);
      await emitEvent(ctx, "approval.requested", {
        nodeId,
        interruptId,
        ...value,
      });
      return;
    }

    // Finished — map The Mind Flow terminals (brief §6/§7):
    //   blocked (tool/credential missing) · rejected (scope refused after revisions)
    //   done + draft (publish refused) · done
    let finalStatus = "done";
    if (result?.blocked) finalStatus = "blocked";
    else if (result?.scopeApproved === false) finalStatus = "rejected";
    const output = {
      notes: result?.notes ?? [],
      blocked: result?.blocked ?? null,
      publishStatus: result?.publishApproved === false ? "draft" : result?.publicUrl ? "published" : null,
      publicUrl: result?.publicUrl || null,
      baseUrl: result?.baseUrl || null,
      appToken: result?.appToken || null,
      evidence: result?.evidence ?? [],
      docsArtifactUri: result?.docsArtifactUri || null,
      blogArtifactUri: result?.blogArtifactUri || null,
      warnings: result?.warnings ?? [],
    };
    console.log(`[worker] run ${job.runId} ${finalStatus}${result?.blocked ? ` (blocked@${result.blocked.node})` : ""}`);
    await setRunStatus(job, finalStatus, output);
    const eventType =
      finalStatus === "done" ? "run.completed" : finalStatus === "blocked" ? "run.blocked" : "run.rejected";
    await emitEvent(ctx, eventType, {
      noteCount: result?.notes?.length ?? 0,
      ...(result?.blocked ? { blocker: result.blocked } : {}),
    });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (isRetryableError(msg)) {
      console.warn(`[worker] run ${job.runId} transient error, letting queue retry: ${msg}`);
      await emitEvent(ctx, "node.retrying", { error: msg });
      throw e; // pg-boss retryLimit/backoff engages
    }
    console.error(`[worker] run ${job.runId} FAILED (non-retryable):`, msg);
    await setRunStatus(job, "failed", { error: msg });
    await emitEvent(ctx, "run.failed", { error: msg });
  }
}

async function main() {
  const boss = await getBoss();
  await boss.work<WorkflowJob>(WF_QUEUE, async ([job]) => {
    console.log(`[worker] picked job ${job.data.runId} (${job.data.graph})`);
    await handle(job.data);
  });
  console.log("[agent-service] worker started, listening on queue:", WF_QUEUE);
}

// Only start the loop when run directly (worker.ts is also imported by tests).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("worker.ts") || process.argv[1]?.endsWith("worker.js")) {
  main().catch((e) => {
    console.error("[worker] fatal", e);
    process.exit(1);
  });
}

export { handle, setRunStatus };
