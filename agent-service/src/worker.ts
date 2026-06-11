import { Command } from "@langchain/langgraph";
import { getBoss, WF_QUEUE, type WorkflowJob } from "./queue/index.js";
import { buildWf01 } from "./graphs/wf01_research_template_blog.js";
import { supabase } from "./db/supabase.js";

/**
 * Worker: pulls jobs from pg-boss → runs the LangGraph workflow.
 * Handles fresh runs and resume-after-approval (interrupt → /approve → resume).
 * Mirrors run lifecycle into Supabase so the Control Plane UI can follow:
 *   running → awaiting_approval (+ approval_requests row) → done | failed
 */

const GRAPHS: Record<string, () => Promise<any>> = {
  wf01_research_template_blog: buildWf01,
};

async function setRunStatus(runId: string, status: string, output?: unknown, input?: unknown) {
  const row: Record<string, unknown> = { id: runId, status };
  if (output !== undefined) row.output = output;
  if (input !== undefined) row.input = input;
  if (status === "done" || status === "failed") row.finished_at = new Date().toISOString();
  // Upsert: Control Plane pre-creates the row; direct engine /run calls don't.
  const { error } = await supabase.from("workflow_runs").upsert(row, { onConflict: "id" });
  if (error) console.warn(`[worker] workflow_runs upsert failed: ${error.message}`);
}

async function createApprovalRequest(runId: string, summary: string) {
  const { error } = await supabase.from("approval_requests").insert({
    request_type: "workflow_approval",
    payload: { runId, summary },
    status: "pending",
  });
  if (error) console.warn(`[worker] approval_requests insert failed: ${error.message}`);
}

async function handle(job: WorkflowJob) {
  const factory = GRAPHS[job.graph];
  if (!factory) {
    console.error(`[worker] unknown graph: ${job.graph}`);
    return;
  }
  const graph = await factory();
  const config = { configurable: { thread_id: job.runId } };

  try {
    const result = job.resumeFrom
      ? await graph.invoke(new Command({ resume: "approve" }), config)
      : await graph.invoke(
          {
            tenantId: job.tenantId,
            runId: job.runId,
            vertical: (job.input?.vertical as string) ?? "Spa",
          },
          config,
        );

    // Detect pause via checkpoint state: pending next-nodes = interrupted.
    // (invoke() result does not reliably carry __interrupt__ in this version.)
    const st = await graph.getState(config);
    if (st.next?.length) {
      const intr = st.tasks?.flatMap((t: any) => t.interrupts ?? [])[0];
      console.log(`[worker] run ${job.runId} paused for approval`);
      await setRunStatus(job.runId, "awaiting_approval", undefined, job.input);
      await createApprovalRequest(job.runId, intr?.value?.summary ?? "Workflow approval");
      return;
    }

    console.log(`[worker] run ${job.runId} completed`);
    await setRunStatus(job.runId, "done", { notes: result?.notes ?? [] }, job.input);
  } catch (e) {
    console.error(`[worker] run ${job.runId} FAILED:`, (e as Error).message);
    await setRunStatus(job.runId, "failed", { error: (e as Error).message });
  }
}

async function main() {
  const boss = await getBoss();
  await boss.createQueue(WF_QUEUE);
  await boss.work<WorkflowJob>(WF_QUEUE, async ([job]) => {
    console.log(`[worker] picked job ${job.data.runId} (${job.data.graph})`);
    await handle(job.data);
  });
  console.log("[agent-service] worker started, listening on queue:", WF_QUEUE);
}

main().catch((e) => {
  console.error("[worker] fatal", e);
  process.exit(1);
});
