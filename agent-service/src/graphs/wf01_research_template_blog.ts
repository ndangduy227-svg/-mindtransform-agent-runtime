import { StateGraph, Annotation, interrupt, START, END } from "@langchain/langgraph";
import { getCheckpointer } from "../memory/checkpointer.js";
import { retrieveGraph, makeCallModel } from "../nodes/index.js";
import { pickProvider } from "../models/router.js";

/**
 * WF_01 Research → Plan → Build → (approval) → Marketing — ASYNC (v3 §3.2).
 * Background, queued, checkpointed each node, interrupt for founder approval.
 * Nodes call GraphRAG for industry/pain/solution knowledge.
 *
 * Skeleton: node bodies are minimal; wire real prompts/tools per stage.
 */

// Workflow state (the "ba lô" carried node → node)
const WF = Annotation.Root({
  tenantId: Annotation<string>(),
  runId: Annotation<string>(),
  vertical: Annotation<string>(), // e.g. "Spa"
  question: Annotation<string>(),
  context: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  notes: Annotation<string[]>({ reducer: (a, b) => [...(a ?? []), ...b], default: () => [] }),
  approved: Annotation<boolean>({ reducer: (_, b) => b, default: () => false }),
});

async function research(s: typeof WF.State) {
  const r = await retrieveGraph({ tenantId: s.tenantId, question: `pain points ngành ${s.vertical}` });
  const reply = await makeCallModel(pickProvider("gemini"), "research")({
    ...s,
    context: r.context,
    question: `Tóm tắt pain points vận hành điển hình của ngành ${s.vertical} (3-5 gạch đầu dòng, tiếng Việt).`,
  });
  return { context: r.context, notes: reply.notes ?? [] };
}

async function plan(s: typeof WF.State) {
  // Plan prefers the heavier model (Sonnet); falls back while key absent.
  const reply = await makeCallModel(pickProvider("anthropic"), "plan")({
    ...s,
    question: `Dựa trên research:\n${s.notes.join("\n")}\nĐề xuất blueprint giải pháp Lark Base cho ngành ${s.vertical} (kiến trúc bảng + automation, ngắn gọn).`,
  });
  return { notes: reply.notes ?? [] };
}

async function build(s: typeof WF.State) {
  // TODO: call lark_template_build tool with retry loop (see nodes.shouldRetry).
  return { notes: [`[build] template spec for ${s.vertical} (stub)`] };
}

async function approvalGate(s: typeof WF.State) {
  // ⏸ INTERRUPT: persist checkpoint, surface for founder. Resume via /approve.
  const decision = interrupt({
    type: "approval",
    runId: s.runId,
    summary: `Duyệt template + plan cho ${s.vertical}?`,
  });
  return { approved: decision === "approve" };
}

async function marketing(s: typeof WF.State) {
  // TODO: parallel blog ‖ screenshot → aggregate. Stub sequential.
  const reply = await makeCallModel(pickProvider("gemini"), "marketing")({
    ...s,
    question: `Viết 3 hook marketing ngắn (tiếng Việt) cho giải pháp ${s.vertical} dựa trên:\n${s.notes.slice(-1)[0] ?? ""}`,
  });
  return { notes: reply.notes ?? [] };
}

export async function buildWf01() {
  const checkpointer = await getCheckpointer();
  return new StateGraph(WF)
    .addNode("research", research)
    .addNode("plan", plan)
    .addNode("build", build)
    .addNode("approval", approvalGate)
    .addNode("marketing", marketing)
    .addEdge(START, "research")
    .addEdge("research", "plan")
    .addEdge("plan", "build")
    .addEdge("build", "approval")
    .addEdge("approval", "marketing")
    .addEdge("marketing", END)
    .compile({ checkpointer });
}
