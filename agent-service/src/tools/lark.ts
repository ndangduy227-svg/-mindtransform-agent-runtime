import { checkCapability } from "./capability.js";
import { larkFetch, sleep, LARK_DOMAIN } from "./lark_api.js";
import { supabase } from "../db/supabase.js";

/**
 * Lark adapter — PLAN → PREFLIGHT → APPLY → VERIFY → RECEIPT (QC §13).
 * Idempotent: every resource has a logical_key; we look it up in
 * external_resources before creating (find → create → verify), so replay
 * after a crash never duplicates resources (QC P1). Every write leaves a
 * side_effect_receipt. Rate-limit fallback: batch → single + 650ms (QC §6.2).
 */

export interface LarkFieldSpec {
  name: string;
  type: "text" | "number" | "date" | "select";
}
export interface LarkBuildPlan {
  baseName: string;
  tables: { logicalKey: string; name: string; fields: LarkFieldSpec[] }[];
  views: { logicalKey: string; table: string; name: string; type: "grid" | "kanban" }[];
  forms: { logicalKey: string; table: string; name: string }[];
  sampleRecords?: Record<string, Record<string, string | number>[]>; // by table logicalKey
}

export interface LarkResourceReceipt {
  logicalKey: string;
  idempotencyKey: string;
  kind: "lark_base" | "lark_table" | "lark_view" | "lark_form" | "lark_records";
  externalId?: string;
  externalUrl?: string;
  status: "verified" | "partial" | "failed";
  detail?: string;
}

export type LarkBuildResult =
  | { status: "blocked"; reason: string }
  | { status: "success" | "partial"; baseUrl: string; appToken: string; receipts: LarkResourceReceipt[]; warnings: string[] };

interface Ctx {
  tenantId: string;
  projectId: string;
  runId: string;
}

// field type → Lark bitable code (select falls back to text in v1 — options
// schema varies; recorded as a warning, not silently upgraded later)
const FIELD_TYPE: Record<LarkFieldSpec["type"], number> = { text: 1, number: 2, date: 5, select: 1 };

// ── resource registry (external_resources) ────────────────────
async function lookupResource(projectId: string, logicalKey: string) {
  const { data } = await supabase
    .from("external_resources")
    .select("external_id, external_url")
    .eq("project_id", projectId)
    .eq("logical_key", logicalKey)
    .maybeSingle();
  return data ?? null;
}

async function saveResource(
  projectId: string,
  logicalKey: string,
  kind: string,
  externalId: string,
  externalUrl: string | null,
  receipt: Record<string, unknown>,
) {
  const { error } = await supabase.from("external_resources").upsert(
    { project_id: projectId, logical_key: logicalKey, kind, external_id: externalId, external_url: externalUrl, receipt },
    { onConflict: "project_id,logical_key" },
  );
  if (error) console.error(`[lark] registry save failed (${logicalKey}): ${error.message}`);
}

async function saveReceipt(ctx: Ctx, operation: string, idempotencyKey: string, status: string, payload: Record<string, unknown>) {
  const { error } = await supabase.from("side_effect_receipts").upsert(
    { project_id: ctx.projectId, workflow_run_id: ctx.runId, node_id: "lark_build", operation, idempotency_key: idempotencyKey, status, payload },
    { onConflict: "idempotency_key" },
  );
  if (error) console.error(`[lark] receipt save failed: ${error.message}`);
}

// ── build ──────────────────────────────────────────────────────
export async function buildLarkSolution(plan: LarkBuildPlan, ctx: Ctx): Promise<LarkBuildResult> {
  const cap = checkCapability("lark_build");
  if (!cap.available) return { status: "blocked", reason: `lark_build unavailable: ${cap.reason}` };

  const receipts: LarkResourceReceipt[] = [];
  const warnings: string[] = [];
  const ik = (kind: string, key: string) => `${ctx.tenantId}:${kind}:${ctx.projectId}:${key}`;

  // 1. base (find → create → receipt)
  let appToken: string;
  let baseUrl: string;
  const existingBase = await lookupResource(ctx.projectId, "base");
  if (existingBase?.external_id) {
    appToken = existingBase.external_id;
    baseUrl = existingBase.external_url ?? `${LARK_DOMAIN}/base/${appToken}`;
    receipts.push({ logicalKey: "base", idempotencyKey: ik("lark_base", "base"), kind: "lark_base", externalId: appToken, externalUrl: baseUrl, status: "verified", detail: "reused from registry" });
  } else {
    const r = await larkFetch<{ app: { app_token: string; url: string } }>(
      "/open-apis/bitable/v1/apps", "POST", { name: plan.baseName },
    );
    if (r.code !== 0) return { status: "blocked", reason: `create base failed: code=${r.code} ${r.msg}` };
    appToken = r.data.app.app_token;
    baseUrl = r.data.app.url;
    await saveResource(ctx.projectId, "base", "lark_base", appToken, baseUrl, { created: true });
    await saveReceipt(ctx, "lark.base.create", ik("lark_base", "base"), "verified", { appToken, baseUrl });
    receipts.push({ logicalKey: "base", idempotencyKey: ik("lark_base", "base"), kind: "lark_base", externalId: appToken, externalUrl: baseUrl, status: "verified" });
  }

  // 2. tables (find → create with fields → receipt)
  const tableIds: Record<string, string> = {}; // logicalKey → table_id
  for (const t of plan.tables) {
    const existing = await lookupResource(ctx.projectId, t.logicalKey);
    if (existing?.external_id) {
      tableIds[t.logicalKey] = existing.external_id;
      receipts.push({ logicalKey: t.logicalKey, idempotencyKey: ik("lark_table", t.logicalKey), kind: "lark_table", externalId: existing.external_id, status: "verified", detail: "reused" });
      continue;
    }
    if (t.fields.some(f => f.type === "select")) warnings.push(`table ${t.name}: select fields created as text (v1)`);
    const r = await larkFetch<{ table_id: string }>(
      `/open-apis/bitable/v1/apps/${appToken}/tables`, "POST",
      { table: { name: t.name, fields: t.fields.map(f => ({ field_name: f.name, type: FIELD_TYPE[f.type] })) } },
    );
    if (r.code !== 0) {
      receipts.push({ logicalKey: t.logicalKey, idempotencyKey: ik("lark_table", t.logicalKey), kind: "lark_table", status: "failed", detail: `code=${r.code} ${r.msg}` });
      warnings.push(`table ${t.name} failed: ${r.msg}`);
      continue;
    }
    tableIds[t.logicalKey] = r.data.table_id;
    await saveResource(ctx.projectId, t.logicalKey, "lark_table", r.data.table_id, baseUrl, { name: t.name });
    await saveReceipt(ctx, "lark.table.create", ik("lark_table", t.logicalKey), "verified", { tableId: r.data.table_id, name: t.name });
    receipts.push({ logicalKey: t.logicalKey, idempotencyKey: ik("lark_table", t.logicalKey), kind: "lark_table", externalId: r.data.table_id, status: "verified" });
    await sleep(350);
  }

  // 3. sample records — batch, fallback to single+650ms on limit (QC §6.2)
  for (const [tKey, rows] of Object.entries(plan.sampleRecords ?? {})) {
    const tableId = tableIds[tKey];
    if (!tableId || !rows.length) continue;
    const recKey = `${tKey}.records`;
    if (await lookupResource(ctx.projectId, recKey)) {
      receipts.push({ logicalKey: recKey, idempotencyKey: ik("lark_records", recKey), kind: "lark_records", status: "verified", detail: "reused" });
      continue;
    }
    const batch = await larkFetch(
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`, "POST",
      { records: rows.map(fields => ({ fields })) },
    );
    let ok = batch.code === 0;
    if (!ok && /limit/i.test(batch.msg ?? "")) {
      ok = true;
      for (const fields of rows) {
        const single = await larkFetch(`/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`, "POST", { fields });
        if (single.code !== 0) { ok = false; warnings.push(`record in ${tKey} failed: ${single.msg}`); }
        await sleep(650);
      }
    }
    if (ok) {
      await saveResource(ctx.projectId, recKey, "lark_records", tableId, null, { count: rows.length });
      await saveReceipt(ctx, "lark.records.seed", ik("lark_records", recKey), "verified", { tableId, count: rows.length });
    } else {
      warnings.push(`records for ${tKey}: ${batch.msg}`);
    }
    receipts.push({ logicalKey: recKey, idempotencyKey: ik("lark_records", recKey), kind: "lark_records", externalId: tableId, status: ok ? "verified" : "partial" });
  }

  // 4. views + forms — AllowFail (partial success, QC §6.2)
  const viewSpecs = [
    ...plan.views.map(v => ({ ...v, viewType: v.type as string, kind: "lark_view" as const })),
    ...plan.forms.map(f => ({ ...f, viewType: "form", kind: "lark_form" as const })),
  ];
  for (const v of viewSpecs) {
    const tableId = tableIds[v.table];
    if (!tableId) { warnings.push(`view ${v.name}: table ${v.table} missing`); continue; }
    if (await lookupResource(ctx.projectId, v.logicalKey)) {
      receipts.push({ logicalKey: v.logicalKey, idempotencyKey: ik(v.kind, v.logicalKey), kind: v.kind, status: "verified", detail: "reused" });
      continue;
    }
    const r = await larkFetch<{ view: { view_id: string } }>(
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/views`, "POST",
      { view_name: v.name, view_type: v.viewType },
    );
    const ok = r.code === 0;
    if (ok) {
      await saveResource(ctx.projectId, v.logicalKey, v.kind, r.data.view.view_id, null, { name: v.name, type: v.viewType });
      await saveReceipt(ctx, `lark.${v.kind === "lark_form" ? "form" : "view"}.create`, ik(v.kind, v.logicalKey), "verified", { viewId: r.data.view.view_id });
    } else {
      warnings.push(`${v.kind} ${v.name} failed: ${r.msg}`);
    }
    receipts.push({ logicalKey: v.logicalKey, idempotencyKey: ik(v.kind, v.logicalKey), kind: v.kind, externalId: ok ? r.data.view.view_id : undefined, status: ok ? "verified" : "failed" });
    await sleep(350);
  }

  const failedCore = receipts.some(r => r.kind === "lark_table" && r.status === "failed");
  return { status: failedCore || warnings.length ? "partial" : "success", baseUrl, appToken, receipts, warnings };
}

// ── verify (read back from API — never trust apply alone) ─────
export async function verifyLarkResources(
  appToken: string,
  receipts: LarkResourceReceipt[],
): Promise<{ status: "success" | "partial" | "blocked"; verified: number; missing: string[] }> {
  if (!appToken || !receipts.length) return { status: "blocked", verified: 0, missing: ["no appToken/receipts to verify"] };
  const r = await larkFetch<{ items: { table_id: string; name: string }[] }>(
    `/open-apis/bitable/v1/apps/${appToken}/tables?page_size=100`,
  );
  if (r.code !== 0) return { status: "blocked", verified: 0, missing: [`list tables failed: ${r.msg}`] };
  const liveIds = new Set((r.data.items ?? []).map(t => t.table_id));
  const missing: string[] = [];
  let verified = 1; // base reachable counts
  for (const rc of receipts.filter(x => x.kind === "lark_table")) {
    if (rc.externalId && liveIds.has(rc.externalId)) verified++;
    else missing.push(`table ${rc.logicalKey} (${rc.externalId ?? "no id"})`);
  }
  return { status: missing.length ? "partial" : "success", verified, missing };
}
