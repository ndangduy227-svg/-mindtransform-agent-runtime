import { StateGraph, Annotation, interrupt, START, END } from "@langchain/langgraph";
import { getCheckpointer } from "../memory/checkpointer.js";
import { retrieveGraph, makeCallModel } from "../nodes/index.js";

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
  const reply = await makeCallModel("gemini", "research")({ ...s, context: r.context });
  return { context: r.context, notes: reply.notes ?? [] };
}

async function plan(s: typeof WF.State) {
  // Plan uses the heavier model (ba-dx blueprint). Sonnet via router.
  const reply = await makeCallModel("anthropic", "plan")(s);
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
  const reply = await makeCallModel("gemini", "marketing")(s);
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
