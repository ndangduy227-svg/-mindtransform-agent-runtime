import { Command } from "@langchain/langgraph";
import { getBoss, WF_QUEUE, type WorkflowJob } from "./queue/index.js";
import { GRAPH_FACTORIES } from "./worker_graphs.js";
import { supabase } from "./db/supabase.js";

/**
 * Worker: pulls jobs from pg-boss → runs the LangGraph workflow.
 * QC P0/P1 fixes encoded here:
 *  - resume uses the REAL founder decision (never hard-coded approve)
 *  - reject routes to the rejected branch; run status = "rejected"
 *  - retryable errors are RE-THROWN so pg-boss retry policy engages;
 *    non-retryable errors ack the job and mark the run failed
 *  - unknown graph marks the run failed (not silently dropped)
 *  - approval requests are deduped by run_id + interrupt_id (upsert)
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

async function setRunStatus(runId: string, status: string, output?: unknown, input?: unknown) {
  const row: Record<string, unknown> = { id: runId, status };
  if (output !== undefined) row.output = output;
  if (input !== undefined) row.input = input;
  if (["done", "failed", "rejected"].includes(status)) row.finished_at = new Date().toISOString();
  const { error } = await supabase.from("workflow_runs").upsert(row, { onConflict: "id" });
  if (error) console.warn(`[worker] workflow_runs upsert failed: ${error.message}`);
}

/** Dedupe by run_id + interrupt_id — re-delivery/resume never creates a second request. */
async function upsertApprovalRequest(runId: string, interruptId: string, summary: string) {
  const { error } = await supabase.from("approval_requests").upsert(
    {
      run_id: runId,
      interrupt_id: interruptId,
      request_type: "workflow_approval",
      payload: { runId, summary },
      status: "pending",
    },
    { onConflict: "run_id,interrupt_id" },
  );
  if (error) console.warn(`[worker] approval_requests upsert failed: ${error.message}`);
}

async function handle(job: WorkflowJob): Promise<void> {
  const factory = GRAPH_FACTORIES[job.graph];
  if (!factory) {
    console.error(`[worker] unknown graph: ${job.graph}`);
    await setRunStatus(job.runId, "failed", { error: `unknown graph: ${job.graph}` }, job.input);
    return; // non-retryable: ack
  }
  const graph = await factory();
  const config = { configurable: { thread_id: job.runId } };

  try {
    const result = job.resumeFrom
      ? await graph.invoke(new Command({ resume: job.decision ?? "approve" }), config)
      : await graph.invoke(
          {
            tenantId: job.tenantId,
            runId: job.runId,
            vertical: (job.input?.vertical as string) ?? "Spa",
          },
          config,
        );

    // Paused? — pending next-nodes on the checkpoint mean an interrupt fired.
    const st = await graph.getState(config);
    if (st.next?.length) {
      const intr = st.tasks?.flatMap((t: any) => t.interrupts ?? [])[0];
      const interruptId: string = intr?.ns?.[0] ?? intr?.id ?? `${job.runId}:interrupt`;
      console.log(`[worker] run ${job.runId} paused for approval (${interruptId})`);
      await setRunStatus(job.runId, "awaiting_approval", undefined, job.input);
      await upsertApprovalRequest(job.runId, interruptId, intr?.value?.summary ?? "Workflow approval");
      return;
    }

    // Finished: approve path → done; reject path → rejected.
    const finalStatus = result?.approved === false ? "rejected" : "done";
    console.log(`[worker] run ${job.runId} ${finalStatus}`);
    await setRunStatus(job.runId, finalStatus, { notes: result?.notes ?? [] }, job.input);
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (isRetryableError(msg)) {
      console.warn(`[worker] run ${job.runId} transient error, letting queue retry: ${msg}`);
      throw e; // pg-boss retryLimit/backoff engages
    }
    console.error(`[worker] run ${job.runId} FAILED (non-retryable):`, msg);
    await setRunStatus(job.runId, "failed", { error: msg }, job.input);
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
