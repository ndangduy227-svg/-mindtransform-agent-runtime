/**
 * LEGACY ALIAS — the old 6-node prototype graph was replaced in Step 3 by
 * The Mind Flow (graphs/the_mind_flow.ts, 14 nodes, 2 approval gates).
 * The legacy ID `wf01_research_template_blog` resolves to the SAME graph —
 * one workflow, two names during migration (build brief §3).
 */
export {
  buildTheMindFlow as buildWf01,
  CANONICAL_GRAPH_ID,
  LEGACY_GRAPH_ALIAS,
  MIND_FLOW_NODES,
} from "./the_mind_flow.js";
