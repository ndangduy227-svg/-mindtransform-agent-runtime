import { supabase } from "../db/supabase.js";

/**
 * Model router (cascade) + cost logging.
 * Providers/env names aligned with Next.js control plane (src/lib/llm.ts).
 * Skeleton: real provider calls are stubbed — wire fetch per provider.
 */
export type Provider = "groq" | "gemini" | "anthropic";

interface CallOpts {
  tenantId: string;
  stage: string;
  runId?: string;
  maxTokens?: number;
}

interface CallResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

// USD per 1M tokens (in/out) — keep in sync with control-plane pricing table.
const PRICE: Record<Provider, { in: number; out: number }> = {
  groq: { in: 0.05, out: 0.08 },
  gemini: { in: 0.3, out: 2.5 },
  anthropic: { in: 3, out: 15 },
};

export async function callModel(
  provider: Provider,
  prompt: string,
  opts: CallOpts,
): Promise<CallResult> {
  // TODO: real provider fetch (Groq/Gemini/Anthropic). Stub echoes prompt.
  const tokensIn = Math.ceil(prompt.length / 4);
  const text = `[stub:${provider}] reply for stage=${opts.stage}`;
  const tokensOut = Math.ceil(text.length / 4);
  const costUsd =
    (tokensIn / 1e6) * PRICE[provider].in + (tokensOut / 1e6) * PRICE[provider].out;

  await logModelCall({ provider, tokensIn, tokensOut, costUsd, ...opts });
  return { text, tokensIn, tokensOut, costUsd };
}

/** Embedding for GraphRAG (vector index). Stub returns zero-vector. */
export async function embed(text: string): Promise<number[]> {
  // TODO: real embedding call (EMBEDDING_MODEL). 768 dims placeholder.
  void text;
  return new Array(768).fill(0);
}

async function logModelCall(row: {
  provider: Provider;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  tenantId: string;
  stage: string;
  runId?: string;
}): Promise<void> {
  // Writes to `model_calls` (see supabase_tier0_schema.sql) → feeds cost dashboard.
  const { error } = await supabase.from("model_calls").insert({
    provider: row.provider,
    tokens_in: row.tokensIn,
    tokens_out: row.tokensOut,
    cost_usd: row.costUsd,
    tenant_id: row.tenantId,
    stage: row.stage,
    run_id: row.runId ?? null,
  });
  if (error) console.warn("[router] model_calls log failed:", error.message);
}
