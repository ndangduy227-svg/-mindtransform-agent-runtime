import { checkCapability } from "./capability.js";

/**
 * Lark adapter — every write follows PLAN → PREFLIGHT → APPLY → VERIFY → RECEIPT
 * (QC §13). Step 3 defines the contract; Step 4 implements the real CLI/MCP
 * calls. Until then apply() returns `blocked` honestly (build brief §7) —
 * a blocked result is NOT a workflow output and the run must not be `done`.
 */

export interface LarkBuildPlan {
  baseName: string;
  tables: { logicalKey: string; name: string; fieldCount?: number }[];
  views: { logicalKey: string; table: string; name: string; type: string }[];
  forms: { logicalKey: string; table: string; name: string }[];
  dashboardBlocks: number;
}

export interface LarkResourceReceipt {
  logicalKey: string;
  idempotencyKey: string; // tenant:lark_<kind>:<packet>:<logicalKey>
  kind: "lark_base" | "lark_table" | "lark_view" | "lark_form" | "lark_dashboard";
  externalId?: string;
  externalUrl?: string;
  status: "verified" | "partial" | "failed";
}

export type LarkBuildResult =
  | { status: "blocked"; reason: string }
  | { status: "success" | "partial"; baseUrl: string; receipts: LarkResourceReceipt[] };

export async function buildLarkSolution(
  plan: LarkBuildPlan,
  ctx: { tenantId: string; packetSlug: string },
): Promise<LarkBuildResult> {
  const cap = checkCapability("lark_build");
  if (!cap.available) {
    return { status: "blocked", reason: `lark_build unavailable: ${cap.reason}` };
  }
  // TODO(Step 4): spawn Lark CLI / MCP per resource with idempotency lookup
  // (find -> create/update -> verify), 650ms pacing, single-record fallback on
  // batch 429 (QC §6.2), tolerant stdout parser. Until implemented we refuse
  // to pretend: capability may exist but the adapter does not.
  void ctx;
  return { status: "blocked", reason: "lark adapter not implemented yet (Step 4)" };
}

export async function verifyLarkResources(
  receipts: LarkResourceReceipt[],
): Promise<{ status: "success" | "partial" | "blocked"; verified: number; missing: string[] }> {
  if (!receipts.length) return { status: "blocked", verified: 0, missing: ["no receipts to verify"] };
  // TODO(Step 4): read back each resource from Lark API (exists, name/type, counts).
  return { status: "blocked", verified: 0, missing: ["lark verify not implemented yet (Step 4)"] };
}
