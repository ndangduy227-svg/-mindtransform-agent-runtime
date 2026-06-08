/**
 * LLM client — supports Groq (primary) and Gemini (fallback).
 * Both use REST APIs directly, no SDK needed.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface LLMResponse {
  content: string
  provider: string
  model: string
  prompt_tokens?: number
  completion_tokens?: number
}

// ─── Groq (OpenAI-compatible API) ───────────────────────────────
async function callGroq(messages: ChatMessage[], model = "llama-3.3-70b-versatile"): Promise<LLMResponse> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error("Missing GROQ_API_KEY")

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return {
    content: data.choices?.[0]?.message?.content || "",
    provider: "groq",
    model,
    prompt_tokens: data.usage?.prompt_tokens,
    completion_tokens: data.usage?.completion_tokens,
  }
}

// ─── Google Gemini ──────────────────────────────────────────────
async function callGemini(messages: ChatMessage[], model = "gemini-2.0-flash"): Promise<LLMResponse> {
  const key = process.env.GOOGLE_API_KEY
  if (!key) throw new Error("Missing GOOGLE_API_KEY")

  // Convert ChatMessage format to Gemini format
  const systemMsg = messages.find(m => m.role === "system")
  const chatMsgs = messages.filter(m => m.role !== "system")

  const contents = chatMsgs.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const body: Record<string, unknown> = { contents }
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  }
  body.generationConfig = { temperature: 0.7, maxOutputTokens: 1024 }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    provider: "gemini",
    model,
    prompt_tokens: data.usageMetadata?.promptTokenCount,
    completion_tokens: data.usageMetadata?.candidatesTokenCount,
  }
}

// ─── Router: try Groq first, fallback to Gemini ────────────────
export async function chat(messages: ChatMessage[]): Promise<LLMResponse> {
  // Try Groq first (has key)
  if (process.env.GROQ_API_KEY) {
    try {
      return await callGroq(messages)
    } catch (e) {
      console.error("Groq failed, trying fallback:", e)
    }
  }

  // Fallback to Gemini
  if (process.env.GOOGLE_API_KEY) {
    try {
      return await callGemini(messages)
    } catch (e) {
      console.error("Gemini also failed:", e)
    }
  }

  throw new Error("No LLM provider available. Set GROQ_API_KEY or GOOGLE_API_KEY.")
}
