import { checkCapability } from "./capability.js";

/**
 * Evidence adapter — priority ladder per build brief §6 / QC §6.4:
 *   live_ui → api_render → source_document → synthetic_mock
 * Anything below live_ui MUST carry a disclosure. Step 4 implements capture;
 * Step 3 picks the strategy honestly or blocks.
 */

export type EvidenceType = "live_ui" | "api_render" | "source_document" | "synthetic_mock";

export interface EvidenceItem {
  type: EvidenceType;
  name: string;
  uri?: string;
  disclosure?: string; // required when type !== live_ui
}

export type EvidenceResult =
  | { status: "blocked"; reason: string }
  | { status: "success"; strategy: EvidenceType; items: EvidenceItem[] };

export async function captureEvidence(
  targets: { name: string; url?: string }[],
): Promise<EvidenceResult> {
  const live = checkCapability("screenshot_live");
  const api = checkCapability("evidence_api_render");

  const strategy: EvidenceType | null = live.available ? "live_ui" : api.available ? "api_render" : null;
  if (!strategy) {
    return {
      status: "blocked",
      reason: `no evidence capability: live_ui (${live.reason}); api_render (${api.reason})`,
    };
  }
  // TODO(Step 4): playwright capture (live_ui) or API-data HTML render → PNG → WebP.
  void targets;
  return { status: "blocked", reason: `evidence adapter not implemented yet (Step 4, would use ${strategy})` };
}
