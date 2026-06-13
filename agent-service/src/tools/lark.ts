import { checkCapability } from "./capability.js";
import { larkFetch, sleep, LARK_DOMAIN } from "./lark_api.js";
import { supabase } from "../db/supabase.js";

export type LarkFieldType = "text" | "number" | "date" | "select" | "checkbox" | "link";

export interface LarkFieldSpec {
  name: string;
  type: LarkFieldType;
  options?: string[];
  multiple?: boolean;
  linkTable?: string;
}

export interface LarkDashboardBlockSpec {
  logicalKey: string;
  name: string;
  type: "text" | "statistics" | "column" | "bar" | "pie";
  table?: string;
  dimension?: string;
  text?: string;
}

export interface LarkBuildPlan {
  baseName: string;
  tables: { logicalKey: string; name: string; fields: LarkFieldSpec[] }[];
  views: { logicalKey: string; table: string; name: string; type: "grid" | "kanban" }[];
  forms: { logicalKey: string; table: string; name: string; description?: string }[];
  dashboard?: { logicalKey: string; name: string; blocks: LarkDashboardBlockSpec[] };
  sampleRecords?: Record<string, Record<string, unknown>[]>;
}

export interface LarkResourceReceipt {
  logicalKey: string;
  idempotencyKey: string;
  kind:
    | "lark_base"
    | "lark_table"
    | "lark_view"
    | "lark_form"
    | "lark_records"
    | "lark_dashboard"
    | "lark_dashboard_block"
    | "lark_doc";
  externalId?: string;
  externalUrl?: string;
  status: "verified" | "partial" | "failed";
  detail?: string;
}

export type LarkBuildResult =
  | { status: "blocked"; reason: string }
  | {
      status: "success" | "partial";
      baseUrl: string;
      appToken: string;
      receipts: LarkResourceReceipt[];
      warnings: string[];
      tableIds: Record<string, string>;
    };

interface Ctx {
  tenantId: string;
  projectId: string;
  runId: string;
}

interface RegistryRow {
  external_id: string | null;
  external_url: string | null;
}

async function lookupResource(projectId: string, logicalKey: string): Promise<RegistryRow | null> {
  const { data, error } = await supabase
    .from("external_resources")
    .select("external_id, external_url")
    .eq("project_id", projectId)
    .eq("logical_key", logicalKey)
    .maybeSingle();
  if (error) throw new Error(`resource registry lookup failed (${logicalKey}): ${error.message}`);
  return data ?? null;
}

async function saveResource(
  projectId: string,
  logicalKey: string,
  kind: string,
  externalId: string,
  externalUrl: string | null,
  receipt: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("external_resources").upsert(
    { project_id: projectId, logical_key: logicalKey, kind, external_id: externalId, external_url: externalUrl, receipt },
    { onConflict: "project_id,logical_key" },
  );
  if (error) throw new Error(`resource registry save failed (${logicalKey}): ${error.message}`);
}

async function saveReceipt(
  ctx: Ctx,
  operation: string,
  idempotencyKey: string,
  status: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("side_effect_receipts").upsert(
    {
      project_id: ctx.projectId,
      workflow_run_id: ctx.runId,
      node_id: "lark_build",
      operation,
      idempotency_key: idempotencyKey,
      status,
      payload,
    },
    { onConflict: "workflow_run_id,idempotency_key" },
  );
  if (error) throw new Error(`side-effect receipt save failed (${operation}): ${error.message}`);
}

function fieldBody(field: LarkFieldSpec, tableIds: Record<string, string>): Record<string, unknown> {
  switch (field.type) {
    case "text":
      return { name: field.name, type: "text" };
    case "number":
      return {
        name: field.name,
        type: "number",
        style: { type: "plain", precision: 0, percentage: false, thousands_separator: true },
      };
    case "date":
      return { name: field.name, type: "datetime", style: { format: "yyyy/MM/dd" } };
    case "checkbox":
      return { name: field.name, type: "checkbox" };
    case "select":
      return {
        name: field.name,
        type: "select",
        multiple: field.multiple ?? false,
        options: (field.options ?? []).map((name, index) => ({
          name,
          hue: ["Blue", "Green", "Orange", "Purple", "Red", "Wathet"][index % 6],
          lightness: "Lighter",
        })),
      };
    case "link": {
      const linkTable = field.linkTable ? tableIds[field.linkTable] : undefined;
      if (!linkTable) throw new Error(`link field ${field.name} references missing table ${field.linkTable}`);
      return { name: field.name, type: "link", link_table: linkTable, bidirectional: false };
    }
  }
}

function receipt(
  ctx: Ctx,
  kind: LarkResourceReceipt["kind"],
  logicalKey: string,
  extra: Partial<LarkResourceReceipt> = {},
): LarkResourceReceipt {
  return {
    logicalKey,
    idempotencyKey: `${ctx.tenantId}:${kind}:${ctx.projectId}:${logicalKey}`,
    kind,
    status: "verified",
    ...extra,
  };
}

async function createTable(
  appToken: string,
  table: LarkBuildPlan["tables"][number],
): Promise<string> {
  const r = await larkFetch<{ table: { id: string; table_id?: string } }>(
    `/open-apis/base/v3/bases/${appToken}/tables`,
    "POST",
    { name: table.name },
  );
  const id = r.data?.table?.id ?? r.data?.table?.table_id;
  if (r.code !== 0 || !id) throw new Error(`create table ${table.name} failed: ${r.msg}`);
  return id;
}

async function createFields(
  appToken: string,
  tableId: string,
  fields: LarkFieldSpec[],
  tableIds: Record<string, string>,
): Promise<void> {
  const existing = await larkFetch<{ fields: { id: string; name: string }[] }>(
    `/open-apis/base/v3/bases/${appToken}/tables/${tableId}/fields`,
  );
  if (existing.code !== 0) throw new Error(`list fields failed: ${existing.msg}`);
  const current = existing.data?.fields ?? [];

  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (current.some((item) => item.name === field.name)) continue;
    const body = fieldBody(field, tableIds);
    let r;
    if (index === 0 && current.length === 1) {
      r = await larkFetch(
        `/open-apis/base/v3/bases/${appToken}/tables/${tableId}/fields/${current[0].id}`,
        "PUT",
        body,
      );
    } else {
      r = await larkFetch(
        `/open-apis/base/v3/bases/${appToken}/tables/${tableId}/fields`,
        "POST",
        body,
      );
    }
    if (r.code !== 0) throw new Error(`create field ${field.name} failed: ${r.msg}`);
    await sleep(180);
  }
}

async function createRecords(
  appToken: string,
  tableId: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (!rows.length) return;
  const r = await larkFetch(
    `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
    "POST",
    { records: rows.map((fields) => ({ fields })) },
  );
  if (r.code !== 0) throw new Error(`seed records failed: ${r.msg}`);
}

async function createView(
  appToken: string,
  tableId: string,
  name: string,
  type: string,
): Promise<string> {
  const r = await larkFetch<{ view: { id?: string; view_id?: string } }>(
    `/open-apis/base/v3/bases/${appToken}/tables/${tableId}/views`,
    "POST",
    { name, type },
  );
  const id = r.data?.view?.id ?? r.data?.view?.view_id;
  if (r.code !== 0 || !id) throw new Error(`create view ${name} failed: ${r.msg}`);
  return id;
}

async function createForm(
  appToken: string,
  tableId: string,
  name: string,
  description = "",
): Promise<string> {
  const r = await larkFetch<{ form: { id?: string }; id?: string }>(
    `/open-apis/base/v3/bases/${appToken}/tables/${tableId}/forms`,
    "POST",
    { name, description },
  );
  const id = r.data?.form?.id ?? r.data?.id;
  if (r.code !== 0 || !id) throw new Error(`create form ${name} failed: ${r.msg}`);
  return id;
}

async function createDashboard(
  appToken: string,
  plan: NonNullable<LarkBuildPlan["dashboard"]>,
  tableNames: Record<string, string>,
  ctx: Ctx,
  receipts: LarkResourceReceipt[],
  warnings: string[],
): Promise<void> {
  const existing = await lookupResource(ctx.projectId, plan.logicalKey);
  let dashboardId = existing?.external_id ?? "";
  if (!dashboardId) {
    const r = await larkFetch<{ dashboard: { dashboard_id?: string; id?: string }; dashboard_id?: string }>(
      `/open-apis/base/v3/bases/${appToken}/dashboards`,
      "POST",
      { name: plan.name },
    );
    dashboardId = r.data?.dashboard?.dashboard_id ?? r.data?.dashboard?.id ?? r.data?.dashboard_id ?? "";
    if (r.code !== 0 || !dashboardId) {
      warnings.push(`dashboard ${plan.name} failed: ${r.msg}`);
      return;
    }
    const url = `${LARK_DOMAIN}/base/${appToken}?table=${dashboardId}`;
    await saveResource(ctx.projectId, plan.logicalKey, "lark_dashboard", dashboardId, url, { name: plan.name });
    await saveReceipt(ctx, "lark.dashboard.create", receipt(ctx, "lark_dashboard", plan.logicalKey).idempotencyKey, "verified", { dashboardId });
  }
  receipts.push(receipt(ctx, "lark_dashboard", plan.logicalKey, { externalId: dashboardId }));

  for (const block of plan.blocks) {
    const existingBlock = await lookupResource(ctx.projectId, block.logicalKey);
    if (existingBlock?.external_id) {
      receipts.push(receipt(ctx, "lark_dashboard_block", block.logicalKey, { externalId: existingBlock.external_id, detail: "reused" }));
      continue;
    }
    const tableName = block.table ? tableNames[block.table] : undefined;
    const dataConfig =
      block.type === "text"
        ? { text: block.text ?? "" }
        : block.type === "statistics"
          ? { table_name: tableName, count_all: true }
          : {
              table_name: tableName,
              count_all: true,
              group_by: block.dimension
                ? [{ field_name: block.dimension, mode: "integrated" }]
                : undefined,
            };
    const r = await larkFetch<{ block: { block_id?: string; id?: string } }>(
      `/open-apis/base/v3/bases/${appToken}/dashboards/${dashboardId}/blocks`,
      "POST",
      { name: block.name, type: block.type, data_config: dataConfig },
    );
    const blockId = r.data?.block?.block_id ?? r.data?.block?.id;
    if (r.code !== 0 || !blockId) {
      warnings.push(`dashboard block ${block.name} failed: ${r.msg}`);
      continue;
    }
    await saveResource(ctx.projectId, block.logicalKey, "lark_dashboard_block", blockId, null, { name: block.name });
    await saveReceipt(ctx, "lark.dashboard_block.create", receipt(ctx, "lark_dashboard_block", block.logicalKey).idempotencyKey, "verified", { dashboardId, blockId });
    receipts.push(receipt(ctx, "lark_dashboard_block", block.logicalKey, { externalId: blockId }));
    await sleep(250);
  }
}

export async function buildLarkSolution(plan: LarkBuildPlan, ctx: Ctx): Promise<LarkBuildResult> {
  const cap = checkCapability("lark_build");
  if (!cap.available) return { status: "blocked", reason: `lark_build unavailable: ${cap.reason}` };

  const receipts: LarkResourceReceipt[] = [];
  const warnings: string[] = [];
  const tableIds: Record<string, string> = {};
  const tableNames = Object.fromEntries(plan.tables.map((table) => [table.logicalKey, table.name]));

  try {
    let appToken = "";
    let baseUrl = "";
    let defaultTables: { id: string; name: string }[] = [];
    const existingBase = await lookupResource(ctx.projectId, "base");
    if (existingBase?.external_id) {
      const live = await larkFetch(`/open-apis/base/v3/bases/${existingBase.external_id}/tables`);
      if (live.code !== 0) throw new Error(`registered base is not reachable: ${live.msg}`);
      appToken = existingBase.external_id;
      baseUrl = existingBase.external_url ?? `${LARK_DOMAIN}/base/${appToken}`;
      receipts.push(receipt(ctx, "lark_base", "base", { externalId: appToken, externalUrl: baseUrl, detail: "reused and revalidated" }));
    } else {
      const r = await larkFetch<{ base: { base_token?: string; app_token?: string; url?: string } }>(
        "/open-apis/base/v3/bases",
        "POST",
        { name: plan.baseName, time_zone: "Asia/Bangkok" },
      );
      appToken = r.data?.base?.base_token ?? r.data?.base?.app_token ?? "";
      baseUrl = r.data?.base?.url ?? `${LARK_DOMAIN}/base/${appToken}`;
      if (r.code !== 0 || !appToken) return { status: "blocked", reason: `create base failed: ${r.msg}` };
      await saveResource(ctx.projectId, "base", "lark_base", appToken, baseUrl, { created: true, name: plan.baseName });
      await saveReceipt(ctx, "lark.base.create", receipt(ctx, "lark_base", "base").idempotencyKey, "verified", { appToken, baseUrl });
      receipts.push(receipt(ctx, "lark_base", "base", { externalId: appToken, externalUrl: baseUrl }));
      const initialTables = await larkFetch<{ tables: { id: string; name: string }[] }>(
        `/open-apis/base/v3/bases/${appToken}/tables`,
      );
      if (initialTables.code === 0) defaultTables = initialTables.data?.tables ?? [];
    }

    // Create all tables first so linked-record fields can reference stable IDs.
    for (const table of plan.tables) {
      const existing = await lookupResource(ctx.projectId, table.logicalKey);
      const tableId = existing?.external_id ?? (await createTable(appToken, table));
      tableIds[table.logicalKey] = tableId;
      if (!existing?.external_id) {
        await saveResource(ctx.projectId, table.logicalKey, "lark_table", tableId, baseUrl, { name: table.name });
        await saveReceipt(ctx, "lark.table.create", receipt(ctx, "lark_table", table.logicalKey).idempotencyKey, "verified", { tableId, name: table.name });
      }
      receipts.push(receipt(ctx, "lark_table", table.logicalKey, { externalId: tableId, externalUrl: `${baseUrl}?table=${tableId}`, detail: existing ? "reused" : undefined }));
      await sleep(220);
    }

    for (const table of defaultTables) {
      if (Object.values(tableIds).includes(table.id)) continue;
      const deleted = await larkFetch(
        `/open-apis/base/v3/bases/${appToken}/tables/${table.id}`,
        "DELETE",
      );
      const idempotencyKey = `${ctx.tenantId}:lark_table:${ctx.projectId}:default_cleanup:${table.id}`;
      if (deleted.code === 0) {
        await saveReceipt(ctx, "lark.table.delete_default", idempotencyKey, "verified", {
          tableId: table.id,
          name: table.name,
        });
      } else {
        warnings.push(`default table cleanup ${table.name} failed: ${deleted.msg}`);
        await saveReceipt(ctx, "lark.table.delete_default", idempotencyKey, "failed", {
          tableId: table.id,
          name: table.name,
          message: deleted.msg,
        });
      }
    }

    for (const table of plan.tables) {
      await createFields(appToken, tableIds[table.logicalKey], table.fields, tableIds);
    }

    for (const [tableKey, rows] of Object.entries(plan.sampleRecords ?? {})) {
      if (!tableIds[tableKey] || !rows.length) continue;
      const logicalKey = `${tableKey}.records`;
      const existing = await lookupResource(ctx.projectId, logicalKey);
      if (!existing) {
        await createRecords(appToken, tableIds[tableKey], rows);
        await saveResource(ctx.projectId, logicalKey, "lark_records", tableIds[tableKey], null, { count: rows.length });
        await saveReceipt(ctx, "lark.records.seed", receipt(ctx, "lark_records", logicalKey).idempotencyKey, "verified", { tableId: tableIds[tableKey], count: rows.length });
      }
      receipts.push(receipt(ctx, "lark_records", logicalKey, { externalId: tableIds[tableKey], detail: existing ? "reused" : `${rows.length} rows` }));
    }

    for (const view of plan.views) {
      const existing = await lookupResource(ctx.projectId, view.logicalKey);
      const viewId = existing?.external_id ?? (await createView(appToken, tableIds[view.table], view.name, view.type));
      if (!existing?.external_id) {
        await saveResource(ctx.projectId, view.logicalKey, "lark_view", viewId, null, { name: view.name, tableId: tableIds[view.table] });
        await saveReceipt(ctx, "lark.view.create", receipt(ctx, "lark_view", view.logicalKey).idempotencyKey, "verified", { viewId, tableId: tableIds[view.table] });
      }
      receipts.push(receipt(ctx, "lark_view", view.logicalKey, { externalId: viewId, detail: existing ? "reused" : undefined }));
    }

    for (const form of plan.forms) {
      const existing = await lookupResource(ctx.projectId, form.logicalKey);
      const formId = existing?.external_id ?? (await createForm(appToken, tableIds[form.table], form.name, form.description));
      if (!existing?.external_id) {
        await saveResource(ctx.projectId, form.logicalKey, "lark_form", formId, null, { name: form.name, tableId: tableIds[form.table] });
        await saveReceipt(ctx, "lark.form.create", receipt(ctx, "lark_form", form.logicalKey).idempotencyKey, "verified", { formId, tableId: tableIds[form.table] });
      }
      receipts.push(receipt(ctx, "lark_form", form.logicalKey, { externalId: formId, detail: existing ? "reused" : undefined }));
    }

    if (plan.dashboard) {
      await createDashboard(appToken, plan.dashboard, tableNames, ctx, receipts, warnings);
    }

    return {
      status: warnings.length ? "partial" : "success",
      baseUrl,
      appToken,
      receipts,
      warnings,
      tableIds,
    };
  } catch (error) {
    return { status: "blocked", reason: (error as Error).message };
  }
}

export async function verifyLarkResources(
  appToken: string,
  receipts: LarkResourceReceipt[],
): Promise<{ status: "success" | "partial" | "blocked"; verified: number; missing: string[] }> {
  if (!appToken || !receipts.length) return { status: "blocked", verified: 0, missing: ["no appToken/receipts to verify"] };

  const missing: string[] = [];
  let verified = 1;
  const tables = await larkFetch<{ tables: { id: string; name: string }[] }>(
    `/open-apis/base/v3/bases/${appToken}/tables`,
  );
  if (tables.code !== 0) return { status: "blocked", verified: 0, missing: [`list tables failed: ${tables.msg}`] };
  const liveTableIds = new Set((tables.data?.tables ?? []).map((table) => table.id));
  const expectedTableIds = new Set(
    receipts
      .filter((item) => item.kind === "lark_table" && item.externalId)
      .map((item) => item.externalId as string),
  );

  for (const item of receipts.filter((item) => item.kind === "lark_table")) {
    if (item.externalId && liveTableIds.has(item.externalId)) verified++;
    else missing.push(`table ${item.logicalKey}`);
  }
  for (const table of tables.data?.tables ?? []) {
    if (!expectedTableIds.has(table.id)) missing.push(`unexpected table ${table.name}`);
  }

  for (const item of receipts.filter((item) => item.kind === "lark_view" || item.kind === "lark_form")) {
    const resource = await supabase
      .from("external_resources")
      .select("receipt")
      .eq("external_id", item.externalId ?? "")
      .maybeSingle();
    const tableId = resource.data?.receipt?.tableId as string | undefined;
    if (!tableId) {
      missing.push(`${item.kind} ${item.logicalKey}: table unknown`);
      continue;
    }
    const endpoint = item.kind === "lark_form" ? "forms" : "views";
    const live = await larkFetch<any>(`/open-apis/base/v3/bases/${appToken}/tables/${tableId}/${endpoint}`);
    const list = live.data?.forms ?? live.data?.views ?? [];
    if (live.code === 0 && list.some((entry: any) => (entry.id ?? entry.view_id) === item.externalId)) verified++;
    else missing.push(`${item.kind} ${item.logicalKey}`);
  }

  const dashboards = receipts.filter((item) => item.kind === "lark_dashboard");
  if (dashboards.length) {
    const live = await larkFetch<{ items: { dashboard_id: string }[] }>(
      `/open-apis/base/v3/bases/${appToken}/dashboards`,
    );
    const ids = new Set((live.data?.items ?? []).map((item) => item.dashboard_id));
    for (const item of dashboards) {
      if (item.externalId && ids.has(item.externalId)) verified++;
      else missing.push(`dashboard ${item.logicalKey}`);
    }
  }

  for (const dashboard of dashboards) {
    if (!dashboard.externalId) continue;
    const live = await larkFetch<{ items?: { block_id?: string; id?: string }[]; blocks?: { block_id?: string; id?: string }[] }>(
      `/open-apis/base/v3/bases/${appToken}/dashboards/${dashboard.externalId}/blocks`,
    );
    const ids = new Set(
      (live.data?.items ?? live.data?.blocks ?? []).map((item) => item.block_id ?? item.id),
    );
    for (const item of receipts.filter((receiptItem) => receiptItem.kind === "lark_dashboard_block")) {
      if (live.code === 0 && item.externalId && ids.has(item.externalId)) verified++;
      else missing.push(`dashboard block ${item.logicalKey}`);
    }
  }

  for (const item of receipts.filter((item) => item.kind === "lark_records")) {
    const live = await larkFetch<{ total?: number; items?: unknown[] }>(
      `/open-apis/bitable/v1/apps/${appToken}/tables/${item.externalId}/records?page_size=1`,
    );
    if (live.code === 0 && (live.data?.total ?? live.data?.items?.length ?? 0) > 0) verified++;
    else missing.push(`records ${item.logicalKey}`);
  }

  return { status: missing.length ? "partial" : "success", verified, missing };
}

export async function createLarkDocument(
  markdown: string,
  title: string,
  ctx: Ctx,
): Promise<LarkResourceReceipt> {
  const logicalKey = "setup_doc";
  const existing = await lookupResource(ctx.projectId, logicalKey);
  if (existing?.external_id) {
    return receipt(ctx, "lark_doc", logicalKey, {
      externalId: existing.external_id,
      externalUrl: existing.external_url ?? undefined,
      detail: "reused",
    });
  }

  const content = markdown.trim().startsWith("#") ? markdown : `# ${title}\n\n${markdown}`;
  const r = await larkFetch<{ document: { document_id: string; url?: string } }>(
    "/open-apis/docs_ai/v1/documents",
    "POST",
    { content, format: "markdown" },
  );
  const documentId = r.data?.document?.document_id;
  if (r.code !== 0 || !documentId) throw new Error(`create Lark document failed: ${r.msg}`);
  const url = r.data.document.url ?? `${LARK_DOMAIN}/docx/${documentId}`;
  const item = receipt(ctx, "lark_doc", logicalKey, { externalId: documentId, externalUrl: url });
  await saveResource(ctx.projectId, logicalKey, "lark_doc", documentId, url, { title });
  await saveReceipt(ctx, "lark.doc.create", item.idempotencyKey, "verified", { documentId, url });
  return item;
}
