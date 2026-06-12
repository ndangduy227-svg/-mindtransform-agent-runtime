import { checkCapability } from "./capability.js";
import { larkFetch } from "./lark_api.js";
import { supabase } from "../db/supabase.js";
import type { LarkResourceReceipt } from "./lark.js";

/**
 * Evidence adapter — ladder per brief §6 / QC §6.4:
 *   live_ui (playwright) → api_render (read real data via API) → …
 * v1 implements api_render: pull real records from the built Lark tables,
 * store them as evidence artifacts with an explicit disclosure. Anything
 * below live_ui MUST disclose — we never claim screenshots we didn't take.
 */

export type EvidenceType = "live_ui" | "api_render" | "source_document" | "synthetic_mock";

export interface EvidenceItem {
  type: EvidenceType;
  name: string;
  uri?: string;
  disclosure?: string;
}

export type EvidenceResult =
  | { status: "blocked"; reason: string }
  | { status: "success"; strategy: EvidenceType; items: EvidenceItem[] };

interface Ctx {
  projectId: string;
  runId: string;
  appToken: string;
  receipts: LarkResourceReceipt[];
}

export async function captureEvidence(ctx: Ctx): Promise<EvidenceResult> {
  const live = checkCapability("screenshot_live");
  if (live.available) {
    // TODO(later): playwright live capture — preferred strategy when enabled.
    return { status: "blocked", reason: "live_ui capture not implemented (playwright path)" };
  }
  const api = checkCapability("evidence_api_render");
  if (!api.available) {
    return { status: "blocked", reason: `no evidence capability: live_ui (${live.reason}); api_render (${api.reason})` };
  }
  if (!ctx.appToken) return { status: "blocked", reason: "api_render needs appToken from lark_build" };

  const DISCLOSURE =
    "Evidence rendered from real Lark API data (api_render) — not a live UI screenshot.";
  const items: EvidenceItem[] = [];

  const tables = ctx.receipts.filter(r => r.kind === "lark_table" && r.externalId).slice(0, 3);
  if (!tables.length) return { status: "blocked", reason: "no built tables to render evidence from" };

  for (const t of tables) {
    const r = await larkFetch<{ items?: { fields: Record<string, unknown> }[]; total?: number }>(
      `/open-apis/bitable/v1/apps/${ctx.appToken}/tables/${t.externalId}/records?page_size=5`,
    );
    if (r.code !== 0) continue;
    const sample = (r.data.items ?? []).map(x => x.fields);
    const { data: art, error } = await supabase
      .from("artifacts")
      .insert({
        project_id: ctx.projectId,
        workflow_run_id: ctx.runId,
        kind: "evidence_api_render",
        name: `evidence_${t.logicalKey}`,
        meta: { tableId: t.externalId, total: r.data.total ?? sample.length, sample, disclosure: DISCLOSURE },
      })
      .select("id")
      .single();
    if (error) console.error(`[evidence] artifact save failed: ${error.message}`);
    items.push({
      type: "api_render",
      name: `evidence_${t.logicalKey}`,
      uri: art?.id ? `artifact:${art.id}` : undefined,
      disclosure: DISCLOSURE,
    });
  }

  if (!items.length) return { status: "blocked", reason: "api_render produced no evidence items" };
  return { status: "success", strategy: "api_render", items };
}
