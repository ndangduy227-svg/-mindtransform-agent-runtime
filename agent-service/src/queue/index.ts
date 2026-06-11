import PgBoss from "pg-boss";
import { DATABASE_URL } from "../db/supabase.js";

/**
 * pg-boss queue on Supabase Postgres — background workflow jobs + retry.
 * Sync chat (/consult) does NOT use the queue; only async workflows (/run).
 */
let boss: PgBoss | null = null;

export const WF_QUEUE = "workflow_run";

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  boss = new PgBoss(DATABASE_URL);
  boss.on("error", (e) => console.error("[pg-boss]", e));
  await boss.start();
  await boss.createQueue(WF_QUEUE).catch(() => {}); // idempotent; exists = fine
  return boss;
}

export interface WorkflowJob {
  runId: string;
  graph: string; // e.g. "wf_01_the_mind_flow" (alias: wf01_research_template_blog)
  tenantId: string;
  input: Record<string, unknown>;
  resumeFrom?: string; // checkpoint thread id when resuming after approval
  decision?: "approve" | "reject"; // founder decision carried into interrupt resume
}

export async function enqueueWorkflow(job: WorkflowJob): Promise<string | null> {
  const b = await getBoss();
  return b.send(WF_QUEUE, job, { retryLimit: 2, retryBackoff: true });
}
