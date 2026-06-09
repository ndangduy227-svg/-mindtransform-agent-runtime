import { Command } from "@langchain/langgraph";
import { getBoss, WF_QUEUE, type WorkflowJob } from "./queue/index.js";
import { buildWf01 } from "./graphs/wf01_research_template_blog.js";

/**
 * Worker: pulls jobs from pg-boss → runs the LangGraph workflow.
 * Handles fresh runs and resume-after-approval (interrupt → /approve → resume).
 * Deploy as a SEPARATE Railway service from the same image (start:worker).
 */

const GRAPHS: Record<string, () => Promise<any>> = {
  wf01_research_template_blog: buildWf01,
};

async function handle(job: WorkflowJob) {
  const factory = GRAPHS[job.graph];
  if (!factory) {
    console.error(`[worker] unknown graph: ${job.graph}`);
    return;
  }
  const graph = await factory();
  const config = { configurable: { thread_id: job.runId } };

  if (job.resumeFrom) {
    // Resume from checkpoint, feeding the approval decision into interrupt()
    await graph.invoke(new Command({ resume: "approve" }), config);
    console.log(`[worker] resumed run ${job.runId}`);
    return;
  }

  await graph.invoke(
    { tenantId: job.tenantId, runId: job.runId, vertical: job.input?.vertical ?? "Spa" },
    config,
  );
  console.log(`[worker] completed/paused run ${job.runId}`);
}

async function main() {
  const boss = await getBoss();
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
