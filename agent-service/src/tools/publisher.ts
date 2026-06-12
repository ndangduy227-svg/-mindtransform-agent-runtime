import { checkCapability } from "./capability.js";

/**
 * Publisher strategy router — priority per build brief §6 / QC §15:
 *   1. cms_service_account  2. cms_authenticated_user (not automatable here)
 *   3. static_git_deploy    4. pause_for_operator
 * Strategy selection is recorded in state + receipt; switching strategy is a
 * decision, not a silent fallback. Step 4 implements the real publishers.
 */

export type PublishStrategy =
  | "cms_service_account"
  | "static_git_deploy"
  | "pause_for_operator";

export interface PublishResult {
  status: "success" | "blocked";
  strategy: PublishStrategy;
  reason?: string;
  publicUrl?: string;
  receipt?: Record<string, unknown>;
}

export function selectPublishStrategy(): { strategy: PublishStrategy; reason: string } {
  const cms = checkCapability("publisher_cms");
  if (cms.available) return { strategy: "cms_service_account", reason: cms.reason };
  const git = checkCapability("publisher_static_git");
  if (git.available) return { strategy: "static_git_deploy", reason: git.reason };
  return {
    strategy: "pause_for_operator",
    reason: `no automated publisher: cms (${cms.reason}); static_git (${git.reason})`,
  };
}

export async function publish(
  artifacts: { kind: string; name: string; uri?: string }[],
  strategy: PublishStrategy,
): Promise<PublishResult> {
  if (strategy === "pause_for_operator") {
    return { status: "blocked", strategy, reason: "paused for operator — no automated publisher available" };
  }
  // TODO(Step 4): real CMS upsert (service key, server-side) or static git deploy
  // + post-publish verification gate (HTTP/DOM/media/responsive/regression, QC §16).
  void artifacts;
  return { status: "blocked", strategy, reason: `publisher ${strategy} not implemented yet (Step 4)` };
}
