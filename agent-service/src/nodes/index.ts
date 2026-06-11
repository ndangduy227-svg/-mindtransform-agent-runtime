import { callModel, type Provider } from "../models/router.js";
import { graphQuery, renderContext } from "../graphrag/query.js";
import { runTool } from "../tools/index.js";

/**
 * Reusable graph nodes. A node = one unit of work in a LangGraph workflow.
 * State shape is workflow-specific; these helpers stay generic.
 */

export interface BaseState {
  tenantId: string;
  runId?: string;
  projectId?: string;
  question?: string;
  context?: string;
  notes?: string[];
  toolResult?: { ok: boolean; output: string };
  attempt?: number;
}

/** retrieveGraph: GraphRAG read → inject context (v3 §2.4). */
export async function retrieveGraph(state: BaseState): Promise<Partial<BaseState>> {
  if (!state.question) return {};
  const ctx = await graphQuery(state.question, state.tenantId);
  return { context: renderContext(ctx) };
}

/** callModelNode: prompt = role + context + question → model reply.
 *  Returns DELTA only ([text]) — the graph reducer appends; returning the
 *  whole array here would double notes every node (QC P2 finding). */
export function makeCallModel(provider: Provider, stage: string) {
  return async (state: BaseState): Promise<Partial<BaseState>> => {
    const prompt = [state.context ?? "", state.question ?? ""].join("\n\n");
    const { text } = await callModel(provider, prompt, {
      tenantId: state.tenantId,
      stage,
      runId: state.runId,
      projectId: state.projectId,
      source: "workflow",
    });
    return { notes: [text] };
  };
}

/** runToolNode + checkOutput: tool calling with retry loop (v3 §4). */
export function makeRunTool(toolName: string) {
  return async (state: BaseState): Promise<Partial<BaseState>> => {
    const result = await runTool(toolName, {}, { tenantId: state.tenantId });
    return { toolResult: result, attempt: (state.attempt ?? 0) + 1 };
  };
}

/** Branch helper: retry if tool failed and attempts remain. */
export function shouldRetry(state: BaseState, maxIterations: number): "retry" | "ok" | "fail" {
  if (state.toolResult?.ok) return "ok";
  if ((state.attempt ?? 0) < maxIterations) return "retry";
  return "fail";
}
