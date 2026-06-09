import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { DATABASE_URL } from "../db/supabase.js";

/**
 * LangGraph checkpointer (short-term state) on Supabase Postgres.
 * Enables resume-after-crash + pause/resume (interrupt → /approve → resume).
 * Consultant (sync) runs WITHOUT a checkpointer; only async workflows use it.
 */
let saver: PostgresSaver | null = null;

export async function getCheckpointer(): Promise<PostgresSaver> {
  if (saver) return saver;
  saver = PostgresSaver.fromConnString(DATABASE_URL);
  await saver.setup(); // creates checkpoint tables if absent
  return saver;
}
