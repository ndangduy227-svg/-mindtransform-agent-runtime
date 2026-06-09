import { createClient } from "@supabase/supabase-js";

/**
 * Supabase service-role client — engine side.
 * Used for: config read, cost/model_calls log, leads, queue helpers.
 * State checkpoints go through LangGraph PostgresSaver (see memory/checkpointer.ts).
 */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn("[supabase] SUPABASE_URL / SERVICE_ROLE_KEY missing — DB calls will fail.");
}

export const supabase = createClient(url ?? "", key ?? "", {
  auth: { persistSession: false },
});

export const DATABASE_URL = process.env.DATABASE_URL ?? "";
