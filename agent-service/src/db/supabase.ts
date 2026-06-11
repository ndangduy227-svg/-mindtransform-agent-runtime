import { createClient } from "@supabase/supabase-js";

/**
 * Supabase service-role client — engine side.
 * Used for: config read, cost/model_calls log, leads, queue helpers.
 * State checkpoints go through LangGraph PostgresSaver (see memory/checkpointer.ts).
 */
const url = process.env.SUPABASE_URL;
// Prefer service_role (bypasses RLS). Anon fallback: reads may work, writes likely blocked by RLS.
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("[supabase] SUPABASE_URL / key missing — DB calls will fail.");
} else if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[supabase] using ANON key — writes (model_calls, runs) may be blocked by RLS.");
}

export const supabase = createClient(url ?? "", key ?? "", {
  auth: { persistSession: false },
});

export const DATABASE_URL = process.env.DATABASE_URL ?? "";
