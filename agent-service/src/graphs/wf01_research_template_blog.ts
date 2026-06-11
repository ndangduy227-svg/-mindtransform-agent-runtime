import { StateGraph, Annotation, interrupt, START, END } from "@langchain/langgraph";
import { getCheckpointer } from "../memory/checkpointer.js";
import { retrieveGraph, makeCallModel } from "../nodes/index.js";
import { pickProvider } from "../models/router.js";
import { instrument } from "../events.js";

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
  projectId: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
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
  // NOTE: no non-idempotent side effects in this node — it re-runs on resume.
  const decision = interrupt({
    type: "approval",
    runId: s.runId,
    summary: `Duyệt template + plan cho ${s.vertical}?`,
    action: "scope_approval",
  });
  return { approved: decision === "approve" };
}

async function rejected(s: typeof WF.State) {
  // Terminal branch for reject: no marketing, no publish. Worker maps
  // approved=false on a finished run to status "rejected".
  return { notes: [`[rejected] scope cho ${s.vertical} bị từ chối — dừng workflow.`] };
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
    .addNode("research", instrument("research", research))
    .addNode("plan", instrument("plan", plan))
    .addNode("build", instrument("build", build))
    // approval NOT instrumented: interrupt() throws to pause; the worker
    // records awaiting_approval + approval.requested when it sees the pause.
    .addNode("approval", approvalGate)
    .addNode("marketing", instrument("marketing", marketing))
    .addNode("rejected", instrument("rejected", rejected))
    .addEdge(START, "research")
    .addEdge("research", "plan")
    .addEdge("plan", "build")
    .addEdge("build", "approval")
    // Conditional: founder decision routes the branch. Reject NEVER reaches marketing.
    .addConditionalEdges("approval", (s) => (s.approved ? "marketing" : "rejected"), {
      marketing: "marketing",
      rejected: "rejected",
    })
    .addEdge("marketing", END)
    .addEdge("rejected", END)
    .compile({ checkpointer });
}

/** Canonical name (The Mind Flow). Old ID kept as alias — same graph, not a copy. */
export const CANONICAL_GRAPH_ID = "wf_01_the_mind_flow";
export const LEGACY_GRAPH_ALIAS = "wf01_research_template_blog";
