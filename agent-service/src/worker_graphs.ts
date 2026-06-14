import { buildTheMindFlow, CANONICAL_GRAPH_ID, LEGACY_GRAPH_ALIAS } from "./graphs/the_mind_flow.js";

/**
 * Graph registry shared by server (validation) and worker (execution).
 * Canonical: wf_01_the_mind_flow ("The Mind Flow"). Legacy alias resolves to
 * the SAME graph — one workflow, two names during migration.
 */
export const GRAPH_FACTORIES: Record<string, typeof buildTheMindFlow> = {
  [CANONICAL_GRAPH_ID]: buildTheMindFlow,
  [LEGACY_GRAPH_ALIAS]: buildTheMindFlow,
};

export const KNOWN_GRAPHS = Object.keys(GRAPH_FACTORIES);
