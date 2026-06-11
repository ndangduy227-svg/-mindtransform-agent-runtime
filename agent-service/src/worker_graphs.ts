import { buildWf01, CANONICAL_GRAPH_ID, LEGACY_GRAPH_ALIAS } from "./graphs/wf01_research_template_blog.js";

/**
 * Graph registry shared by server (validation) and worker (execution).
 * Canonical: wf_01_the_mind_flow ("The Mind Flow"). Legacy alias resolves to
 * the SAME graph — one workflow, two names during migration.
 */
export const GRAPH_FACTORIES: Record<string, () => Promise<any>> = {
  [CANONICAL_GRAPH_ID]: buildWf01,
  [LEGACY_GRAPH_ALIAS]: buildWf01,
};

export const KNOWN_GRAPHS = Object.keys(GRAPH_FACTORIES);
