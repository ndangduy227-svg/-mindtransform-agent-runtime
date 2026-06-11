import { callModel } from "../models/router.js";
import { graphQuery, renderContext } from "../graphrag/query.js";

/**
 * Mind AI Consultant — SYNC chat (v3 §3.1).
 * No queue, no checkpoint. One GraphRAG read (read-only) + one model reply.
 * This is the Map/Isolate funnel: ask, diagnose, capture lead signals.
 *
 * Kept as a plain async function (not a full StateGraph) because sync chat
 * doesn't need checkpoint/interrupt — that's the whole point of §3.1.
 */
export interface ConsultResult {
  reply: string;
  contextUsed: string;
}

const ROLE = `Bạn là Mind AI Consultant của Mindtransform. Theo phương pháp MIND (Map → Isolate):
hỏi đúng vấn đề, phân tích nhu cầu vận hành, KHÔNG bán tool vội. Trả lời ngắn, thực tế, tiếng Việt.`;

export async function runConsultant(
  message: string,
  tenantId: string,
  history: string[] = [],
  meta: { projectId?: string; sessionId?: string } = {},
): Promise<ConsultResult> {
  // 1 GraphRAG read for relevant industry/pain knowledge
  const ctx = await graphQuery(message, tenantId);
  const contextText = renderContext(ctx);

  const prompt = [
    ROLE,
    contextText ? `# Tri thức liên quan\n${contextText}` : "",
    history.length ? `# Lịch sử\n${history.join("\n")}` : "",
    `# Khách\n${message}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Gemini Flash preferred; Groq fallback while GOOGLE_API_KEY absent.
  const provider = process.env.GOOGLE_API_KEY ? "gemini" : "groq";
  const { text } = await callModel(provider, prompt, {
    tenantId,
    stage: "consult",
    source: "chat",
    projectId: meta.projectId,
    sessionId: meta.sessionId,
  });

  return { reply: text, contextUsed: contextText };
}
