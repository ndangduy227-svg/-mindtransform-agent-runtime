import { z } from "zod";

/**
 * Tool connectors — the "hands" (harness runs them; the LLM only emits intent).
 * RANH GIỚI: tools = cơ tay; agents/graphs = quyết định. GraphRAG read lives in graphrag/.
 *
 * Each tool: schema (validate LLM args) + permission + run(). Skeleton stubs.
 */
export type Permission = "read" | "write" | "high_risk";

export interface Tool<A = unknown> {
  name: string;
  permission: Permission;
  schema: z.ZodType<A>;
  run: (args: A, ctx: { tenantId: string }) => Promise<{ ok: boolean; output: string }>;
}

// --- web search (MCP) — read ---
const webSearch: Tool<{ query: string }> = {
  name: "web_search",
  permission: "read",
  schema: z.object({ query: z.string() }),
  async run({ query }) {
    return { ok: true, output: `[stub web_search] ${query}` };
  },
};

// --- Lark template builder (CLI spawn) — write ---
const larkTemplate: Tool<{ spec: string }> = {
  name: "lark_template_build",
  permission: "write",
  schema: z.object({ spec: z.string() }),
  async run({ spec }) {
    // TODO: spawn Lark CLI; capture stdout/stderr/exit_code; log tool_call.
    return { ok: true, output: `[stub lark_template] built from spec len=${spec.length}` };
  },
};

// --- screenshot (Playwright) — read; prefer separate media service ---
const screenshot: Tool<{ url: string }> = {
  name: "screenshot_page",
  permission: "read",
  schema: z.object({ url: z.string().url() }),
  async run({ url }) {
    return { ok: true, output: `[stub screenshot] ${url}` };
  },
};

export const TOOLS: Record<string, Tool<any>> = {
  [webSearch.name]: webSearch,
  [larkTemplate.name]: larkTemplate,
  [screenshot.name]: screenshot,
};

/** Validate → permission/allowlist check → run. Returns harness result. */
export async function runTool(
  name: string,
  rawArgs: unknown,
  ctx: { tenantId: string; allowlist?: string[] },
): Promise<{ ok: boolean; output: string }> {
  const tool = TOOLS[name];
  if (!tool) return { ok: false, output: `unknown tool: ${name}` };
  if (ctx.allowlist && !ctx.allowlist.includes(name)) {
    return { ok: false, output: `tool not allowed for tenant: ${name}` };
  }
  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) return { ok: false, output: `bad args: ${parsed.error.message}` };
  return tool.run(parsed.data, { tenantId: ctx.tenantId });
}
