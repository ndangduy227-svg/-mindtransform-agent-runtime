import { supabase } from "../db/supabase.js";

/**
 * Model router (cascade) + cost logging.
 * Providers/env aligned with the Next.js control plane (src/lib/llm.ts):
 *   GROQ_API_KEY · GOOGLE_API_KEY (gemini) · ANTHROPIC_API_KEY
 * Embeddings via Gemini text-embedding-004 (GOOGLE_API_KEY).
 */
export type Provider = "groq" | "gemini" | "anthropic";

interface CallOpts {
  tenantId: string;
  stage: string;
  runId?: string;
  sessionId?: string;
  maxTokens?: number;
  system?: string;
}

interface CallResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

// USD per 1M tokens (in/out) — keep in sync with control-plane pricing.
const PRICE: Record<Provider, { in: number; out: number }> = {
  groq: { in: 0.05, out: 0.08 },
  gemini: { in: 0.3, out: 2.5 },
  anthropic: { in: 3, out: 15 },
};

const MODEL: Record<Provider, string> = {
  groq: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  gemini: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  anthropic: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
};

export async function callModel(
  provider: Provider,
  prompt: string,
  opts: CallOpts,
): Promise<CallResult> {
  const maxTokens = opts.maxTokens ?? 1024;
  let text = "";
  let tokensIn = 0;
  let tokensOut = 0;

  if (provider === "groq") {
    ({ text, tokensIn, tokensOut } = await callGroq(prompt, opts.system, maxTokens));
  } else if (provider === "gemini") {
    ({ text, tokensIn, tokensOut } = await callGemini(prompt, opts.system, maxTokens));
  } else {
    ({ text, tokensIn, tokensOut } = await callAnthropic(prompt, opts.system, maxTokens));
  }

  const costUsd =
    (tokensIn / 1e6) * PRICE[provider].in + (tokensOut / 1e6) * PRICE[provider].out;

  await logModelCall({
    provider,
    model: MODEL[provider],
    tokensIn,
    tokensOut,
    costUsd,
    sessionId: opts.sessionId,
  });
  return { text, tokensIn, tokensOut, costUsd };
}

// ── Groq (OpenAI-compatible) ──────────────────────────────────
async function callGroq(prompt: string, system: string | undefined, maxTokens: number) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Missing GROQ_API_KEY");
  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ];
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL.groq, messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return {
    text: d.choices?.[0]?.message?.content ?? "",
    tokensIn: d.usage?.prompt_tokens ?? 0,
    tokensOut: d.usage?.completion_tokens ?? 0,
  };
}

// ── Gemini ────────────────────────────────────────────────────
async function callGemini(prompt: string, system: string | undefined, maxTokens: number) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_API_KEY");
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL.gemini}:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return {
    text: d.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    tokensIn: d.usageMetadata?.promptTokenCount ?? 0,
    tokensOut: d.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// ── Anthropic ─────────────────────────────────────────────────
async function callAnthropic(prompt: string, system: string | undefined, maxTokens: number) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL.anthropic,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return {
    text: d.content?.[0]?.text ?? "",
    tokensIn: d.usage?.input_tokens ?? 0,
    tokensOut: d.usage?.output_tokens ?? 0,
  };
}

// ── Embeddings (Gemini text-embedding-004 → 768 dims) ─────────
export async function embed(text: string): Promise<number[]> {
  const key = process.env.GOOGLE_API_KEY;
  const model = process.env.EMBEDDING_MODEL || "text-embedding-004";
  if (!key) {
    console.warn("[router] GOOGLE_API_KEY missing — embed() returns zero-vector");
    return new Array(768).fill(0);
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text }] } }),
    },
  );
  if (!res.ok) throw new Error(`Embedding ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return d.embedding?.values ?? new Array(768).fill(0);
}

// ── Cost log → model_calls (schema: supabase_tier0_schema.sql) ─
async function logModelCall(row: {
  provider: Provider;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  sessionId?: string;
}): Promise<void> {
  const { error } = await supabase.from("model_calls").insert({
    provider: row.provider,
    model: row.model,
    prompt_tokens: row.tokensIn,
    completion_tokens: row.tokensOut,
    cost_usd: Number(row.costUsd.toFixed(6)),
    status: "completed",
    session_id: row.sessionId ?? null,
  });
  if (error) console.warn("[router] model_calls log failed:", error.message);
}
