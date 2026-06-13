import { StateGraph, Annotation, interrupt, START, END } from "@langchain/langgraph";
import { getCheckpointer } from "../memory/checkpointer.js";
import { retrieveGraph } from "../nodes/index.js";
import { graphQuery, renderContext } from "../graphrag/query.js";
import { contextRelevance } from "../graphrag/relevance.js";
import { callModel, pickProvider } from "../models/router.js";
import { instrument } from "../events.js";
import {
  buildLarkSolution,
  createLarkDocument,
  verifyLarkResources,
  type LarkBuildPlan,
  type LarkResourceReceipt,
} from "../tools/lark.js";
import { captureEvidence, type EvidenceItem } from "../tools/evidence.js";
import { selectPublishStrategy, publish, type PublishStrategy } from "../tools/publisher.js";
import { supabase } from "../db/supabase.js";
import { isOtoHopNhat, otoHopNhatPlan } from "../workflows/golden_specs.js";

/**
 * The Mind Flow (`wf_01_the_mind_flow`) — build brief §6, Step 3 refactor.
 *
 *   project_intake → research → workflow_plan → scope_approval ⏸
 *     reject → workflow_plan (1 revision max, then rejected)
 *     approve → lark_build → lark_verify → evidence_capture → docs_and_blog
 *             → artifact_claim_gate → publish_approval ⏸
 *               reject → draft_complete (giữ Draft)
 *               approve → publish_strategy → public_verify → receipt_and_handoff
 *
 * Honesty rule (brief §7): a node whose tool/credential is missing returns
 * `blocked` — the run ends `blocked` with the blocker visible. No stub output
 * is ever treated as success. Lark/evidence/publisher adapters land in Step 4.
 */

const REVISION_CAP = 1; // scope reject loops back to plan at most once

const WF = Annotation.Root({
  // identity
  tenantId: Annotation<string>(),
  runId: Annotation<string>(),
  projectId: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  // intake (structured scope per QC §11)
  vertical: Annotation<string>(),
  clientName: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  objective: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  brief: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  scope: Annotation<{
    problemFrame: string;
    inScope: string[];
    outOfScope: string[];
    prohibitedClaims: string[];
  } | null>({ reducer: (_, b) => b, default: () => null }),
  // working artifacts
  researchMd: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  planMd: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  blogMd: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  docsMd: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  docsArtifactUri: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  blogArtifactUri: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  // external results
  larkReceipts: Annotation<LarkResourceReceipt[]>({ reducer: (a, b) => [...(a ?? []), ...b], default: () => [] }),
  appToken: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  baseUrl: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  evidence: Annotation<EvidenceItem[]>({ reducer: (a, b) => [...(a ?? []), ...b], default: () => [] }),
  publishStrategy: Annotation<PublishStrategy | "">({ reducer: (_, b) => b, default: () => "" }),
  publicUrl: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  // control flow
  scopeApproved: Annotation<boolean | null>({ reducer: (_, b) => b, default: () => null }),
  publishApproved: Annotation<boolean | null>({ reducer: (_, b) => b, default: () => null }),
  revisionCount: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  blocked: Annotation<{ node: string; reason: string } | null>({ reducer: (_, b) => b, default: () => null }),
  warnings: Annotation<string[]>({ reducer: (a, b) => [...(a ?? []), ...b], default: () => [] }),
  // human-readable log (delta-append, như cũ)
  notes: Annotation<string[]>({ reducer: (a, b) => [...(a ?? []), ...b], default: () => [] }),
});

type S = typeof WF.State;

// ── helpers ────────────────────────────────────────────────────
async function llm(s: S, stage: string, prompt: string, opts: { heavy?: boolean } = {}) {
  const provider = pickProvider(opts.heavy ? "anthropic" : "gemini");
  const { text } = await callModel(provider, prompt, {
    tenantId: s.tenantId,
    stage,
    runId: s.runId,
    projectId: s.projectId,
    source: "workflow",
    maxTokens: 1536,
  });
  return text;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "mindtransform-case";
}

async function saveArtifact(
  s: S,
  kind: string,
  name: string,
  content: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const uri = `artifact:${id}`;
  const { error } = await supabase.from("artifacts").insert({
    id,
    project_id: s.projectId || null,
    workflow_run_id: s.runId,
    kind,
    name,
    uri,
    meta: { content },
  });
  if (error) throw new Error(`artifact save failed (${kind}): ${error.message}`);
  return uri;
}

// ── nodes (brief §6) ───────────────────────────────────────────

async function project_intake(s: S) {
  // Normalize objective + structured scope contract (QC §6.1 reframe lesson).
  const text = await llm(
    s,
    "project_intake",
    `Bạn là intake analyst của Mindtransform. Khách hàng: "${s.clientName || s.vertical}". Ngành: "${s.vertical}". Objective: "${s.objective || "(chưa rõ)"}".
Brief và hội thoại nguồn:
${s.brief || "(không có)"}

Trả JSON: {"problemFrame": string, "inScope": string[3-5], "outOfScope": string[2-4], "prohibitedClaims": string[1-3]}.
outOfScope phải gồm những thứ KHÔNG hứa (vd: tích hợp writeback hệ thống cũ). Chỉ JSON.`,
  );
  const m = text.match(/\{[\s\S]*\}/);
  let scope = null;
  try { scope = m ? JSON.parse(m[0]) : null; } catch { /* keep null */ }
  return {
    scope,
    notes: [`[intake] frame=${scope?.problemFrame ?? "(parse fail — dùng objective thô)"}`],
    ...(scope ? {} : { warnings: ["intake JSON parse failed; scope contract trống"] }),
  };
}

async function research(s: S) {
  const question = `pain points vận hành ${s.vertical} ${s.objective} ${s.brief.slice(0, 3000)}`;
  const r = await retrieveGraph({ tenantId: s.tenantId, runId: s.runId, question });
  const relevance = contextRelevance(question, r.context ?? "");
  const graphContext = relevance >= 0.18 ? r.context ?? "" : "";
  const text = await llm(
    s,
    "research",
    `Nguồn dự án, được ưu tiên cao nhất:
${s.brief || s.objective}

${graphContext ? `Ngữ cảnh GraphRAG đã qua relevance gate (${relevance.toFixed(2)}):\n${graphContext}` : "GraphRAG bị loại do không đủ liên quan; không được suy diễn từ vertical khác."}

Nghiên cứu vận hành cho "${s.clientName || s.vertical}" (frame: ${s.scope?.problemFrame ?? s.objective}).
Trả Markdown: hiện trạng thủ công, chỗ mất thời gian/sai sót, ai own workflow, dữ liệu cần, "better" sau Lark là gì. 5-7 gạch đầu dòng, tiếng Việt.`,
  );
  return {
    researchMd: text,
    notes: [`[research] xong · GraphRAG relevance=${relevance.toFixed(2)}${graphContext ? " accepted" : " rejected"}`],
    ...(graphContext ? {} : { warnings: [`GraphRAG context rejected (relevance=${relevance.toFixed(2)})`] }),
  };
}

async function workflow_plan(s: S) {
  const revisionNote = s.revisionCount > 0 ? `\n(Bản sửa lần ${s.revisionCount} — scope trước bị từ chối, thu hẹp lại P0.)` : "";
  const text = await llm(
    s,
    "workflow_plan",
    `Brief nguồn:\n${s.brief}\n\nResearch:\n${s.researchMd}\n\nLập kế hoạch giải pháp Lark cho "${s.clientName || s.vertical}".${revisionNote}
Trả Markdown: P0/P1 boundary, danh sách bảng Lark Base (tên + vai trò), views, forms, dashboard blocks, screenshot plan. Ngắn gọn, tiếng Việt.`,
    { heavy: true },
  );
  return { planMd: text, notes: [`[plan] xong (revision=${s.revisionCount})`] };
}

async function scope_approval(s: S) {
  // ⏸ no side effects in interrupt nodes — they re-run on resume.
  const decision = interrupt({
    type: "approval",
    action: "scope_approval",
    runId: s.runId,
    summary: `Duyệt scope + plan cho ${s.vertical}? (frame: ${s.scope?.problemFrame ?? "n/a"})`,
    plannedWrites: ["lark_base", "lark_tables", "lark_views", "lark_forms", "lark_dashboard", "lark_doc"],
    outOfScope: s.scope?.outOfScope ?? [],
  });
  const ok = decision === "approve";
  return {
    scopeApproved: ok,
    revisionCount: ok ? s.revisionCount : s.revisionCount + 1,
    notes: [`[scope_approval] ${ok ? "approved" : `rejected (revision ${s.revisionCount + 1})`}`],
  };
}

async function lark_build(s: S) {
  const useGoldenSpec = isOtoHopNhat(`${s.clientName} ${s.vertical} ${s.objective} ${s.brief}`);
  let buildPlan: LarkBuildPlan;
  if (useGoldenSpec) {
    buildPlan = otoHopNhatPlan(`Mindtransform - ${s.clientName || "Ô Tô Hợp Nhất"} - Sales Garage Control Tower`);
  } else {
    const specText = await llm(
      s,
      "lark_spec",
      `Brief:\n${s.brief}\n\nPlan:\n${s.planMd}\n\nChuyển plan thành spec JSON xây Lark Base cho "${s.vertical}".
Trả CHÍNH XÁC JSON (không markdown):
{"tables":[{"logicalKey":"snake_key","name":"Tên tiếng Việt","fields":[{"name":"Tên cột","type":"text|number|date|select|checkbox","options":["nếu select"]}]}],
 "views":[{"logicalKey":"key.view","table":"table_logicalKey","name":"Tên view","type":"grid|kanban"}],
 "forms":[{"logicalKey":"key.form","table":"table_logicalKey","name":"Tên form"}],
 "sampleRecords":{"table_logicalKey":[{"Tên cột":"giá trị"}]}}
Giới hạn: ≤12 tables, ≤15 fields/table, ≤10 views, ≤8 forms, ≤10 records/table. Field đầu mỗi table type text.`,
      { heavy: true },
    );
    const m = specText.match(/\{[\s\S]*\}/);
    let spec: Omit<LarkBuildPlan, "baseName"> | null = null;
    try { spec = m ? JSON.parse(m[0]) : null; } catch { /* handled below */ }
    if (!spec?.tables?.length) {
      return { blocked: { node: "lark_build", reason: "lark spec generation failed (no parsable tables)" }, notes: ["[lark_build] BLOCKED: spec parse fail"] };
    }
    buildPlan = { baseName: `Mindtransform - ${s.clientName || s.vertical}`, ...spec };
  }

  const result = await buildLarkSolution(
    buildPlan,
    { tenantId: s.tenantId, projectId: s.projectId || s.runId, runId: s.runId },
  );
  if (result.status === "blocked") {
    return { blocked: { node: "lark_build", reason: result.reason }, notes: [`[lark_build] BLOCKED: ${result.reason}`] };
  }
  return {
    larkReceipts: result.receipts,
    appToken: result.appToken,
    baseUrl: result.baseUrl,
    warnings: result.warnings,
    notes: [`[lark_build] ${result.status} · ${result.receipts.length} resources · ${useGoldenSpec ? "golden spec Ô Tô Hợp Nhất" : "generated spec"} · ${result.baseUrl}`],
  };
}

async function lark_verify(s: S) {
  const v = await verifyLarkResources(s.appToken, s.larkReceipts);
  if (v.status === "blocked") {
    return { blocked: { node: "lark_verify", reason: v.missing.join("; ") }, notes: [`[lark_verify] BLOCKED`] };
  }
  return {
    notes: [`[lark_verify] ${v.status}: ${v.verified} resources verified${v.missing.length ? `, missing: ${v.missing.join(", ")}` : ""}`],
    ...(v.missing.length ? { warnings: v.missing.map(x => `verify missing: ${x}`) } : {}),
  };
}

async function evidence_capture(s: S) {
  const r = await captureEvidence({
    projectId: s.projectId || s.runId,
    runId: s.runId,
    appToken: s.appToken,
    receipts: s.larkReceipts,
  });
  if (r.status === "blocked") {
    return { blocked: { node: "evidence_capture", reason: r.reason }, notes: [`[evidence] BLOCKED: ${r.reason}`] };
  }
  return { evidence: r.items, notes: [`[evidence] ${r.items.length} items (${r.strategy}, có disclosure)`] };
}

async function docs_and_blog(s: S) {
  const docs = await llm(s, "docs_and_blog",
    `Plan:\n${s.planMd}\n\nViết tài liệu khách hàng ngắn (ai dùng, giải gì, gồm gì, dùng sao) cho template "${s.vertical}". Markdown tiếng Việt.`);
  const blog = await llm(s, "docs_and_blog",
    `Research:\n${s.researchMd}\nPlan:\n${s.planMd}\n\nViết blog tiếng Việt marketing template "${s.vertical}" — vấn đề thật, workflow, CTA nhận template/tư vấn. KHÔNG claim ngoài: ${(s.scope?.prohibitedClaims ?? []).join(", ") || "(none)"}. Markdown.`,
    { heavy: true });
  const docsArtifactUri = await saveArtifact(s, "customer_doc_md", "Tài liệu hướng dẫn vận hành", docs);
  const blogArtifactUri = await saveArtifact(s, "blog_md", `${s.clientName || s.vertical} - blog`, blog);
  let docReceipt: LarkResourceReceipt;
  try {
    docReceipt = await createLarkDocument(
      docs,
      `Hướng dẫn vận hành - ${s.clientName || s.vertical}`,
      { tenantId: s.tenantId, projectId: s.projectId || s.runId, runId: s.runId },
    );
  } catch (error) {
    return {
      blocked: { node: "docs_and_blog", reason: (error as Error).message },
      notes: [`[docs_and_blog] BLOCKED: ${(error as Error).message}`],
    };
  }
  return {
    docsMd: docs,
    blogMd: blog,
    docsArtifactUri,
    blogArtifactUri,
    larkReceipts: [docReceipt],
    notes: ["[docs_and_blog] docs + blog persisted; Lark Doc created"],
  };
}

async function artifact_claim_gate(s: S) {
  // Deterministic validation — no LLM. Blocks unsupported claims (brief §6).
  const problems: string[] = [];
  if (!s.blogMd || s.blogMd.length < 200) problems.push("blog quá ngắn/trống");
  if (/\[stub|placeholder|TODO/i.test(s.blogMd)) problems.push("blog còn placeholder");
  for (const claim of s.scope?.prohibitedClaims ?? []) {
    if (claim && s.blogMd.toLowerCase().includes(claim.toLowerCase())) {
      problems.push(`blog chứa prohibited claim: "${claim}"`);
    }
  }
  if (!s.evidence.length) problems.push("không có evidence item nào cho claim gate");
  if (s.evidence.some((item) => !item.uri)) problems.push("evidence chưa được persist");
  if (!s.baseUrl) problems.push("không có Lark Base URL");
  if (!s.docsArtifactUri || !s.blogArtifactUri) problems.push("docs/blog chưa được persist");
  if (problems.length) {
    return { blocked: { node: "artifact_claim_gate", reason: problems.join("; ") }, notes: [`[claim_gate] BLOCKED: ${problems.join("; ")}`] };
  }
  return { notes: ["[claim_gate] pass"] };
}

async function publish_approval(s: S) {
  const decision = interrupt({
    type: "approval",
    action: "publish_approval",
    runId: s.runId,
    summary: `Publish public blog + template cho ${s.vertical}?`,
    destination: "mind-transform.vercel.app",
    evidenceTypes: [...new Set(s.evidence.map(e => e.type))],
  });
  const ok = decision === "approve";
  return { publishApproved: ok, notes: [`[publish_approval] ${ok ? "approved" : "rejected — giữ Draft"}`] };
}

async function publish_strategy(s: S) {
  const sel = selectPublishStrategy();
  if (sel.strategy === "pause_for_operator") {
    return { blocked: { node: "publish_strategy", reason: sel.reason }, publishStrategy: sel.strategy, notes: [`[publish] BLOCKED: ${sel.reason}`] };
  }
  const title = `${s.clientName || s.vertical}: từ CRM đến Sales Garage Control Tower`;
  const slug = slugify(s.clientName || s.vertical || s.projectId);
  const r = await publish(
    {
      projectId: s.projectId || s.runId,
      runId: s.runId,
      title,
      slug,
      excerpt: s.researchMd.replace(/[#*_`]/g, "").slice(0, 220),
      contentMd: s.blogMd,
    },
    sel.strategy,
  );
  if (r.status === "blocked") {
    return { blocked: { node: "publish_strategy", reason: r.reason ?? "publish blocked" }, publishStrategy: sel.strategy, notes: [`[publish] BLOCKED: ${r.reason}`] };
  }
  return { publishStrategy: sel.strategy, publicUrl: r.publicUrl ?? "", notes: [`[publish] ${sel.strategy} → ${r.publicUrl}`] };
}

async function public_verify(s: S) {
  if (!s.publicUrl) {
    return { blocked: { node: "public_verify", reason: "no public URL to verify" }, notes: ["[verify] BLOCKED: no URL"] };
  }
  try {
    const res = await fetch(s.publicUrl, { redirect: "follow" });
    const html = await res.text();
    if (!res.ok || !html.includes(s.clientName || s.vertical)) {
      return {
        blocked: { node: "public_verify", reason: `public page verification failed: HTTP ${res.status}` },
        notes: [`[verify] BLOCKED: HTTP ${res.status}`],
      };
    }
    return { notes: [`[verify] public URL verified: HTTP ${res.status} · ${s.publicUrl}`] };
  } catch (error) {
    return {
      blocked: { node: "public_verify", reason: `public page unreachable: ${(error as Error).message}` },
      notes: [`[verify] BLOCKED: ${(error as Error).message}`],
    };
  }
}

async function receipt_and_handoff(s: S) {
  return {
    notes: [
      `[receipt] status=done · lark=${s.larkReceipts.length} resources · evidence=${s.evidence.length} · publish=${s.publishStrategy || "n/a"} · url=${s.publicUrl || "n/a"} · warnings=${s.warnings.length}`,
    ],
  };
}

async function draft_complete(s: S) {
  return { notes: [`[draft_complete] publish bị từ chối — blog/template cho ${s.vertical} giữ ở Draft.`] };
}

async function rejected(s: S) {
  return { notes: [`[rejected] scope cho ${s.vertical} bị từ chối sau ${s.revisionCount} lần sửa — dừng workflow.`] };
}

// ── routers ────────────────────────────────────────────────────
const afterScope = (s: S) =>
  s.scopeApproved ? "lark_build" : s.revisionCount > REVISION_CAP ? "rejected" : "workflow_plan";
const blockedOr = (next: string) => (s: S) => (s.blocked ? END : next);
const afterPublishApproval = (s: S) => (s.publishApproved ? "publish_strategy" : "draft_complete");

// ── graph ──────────────────────────────────────────────────────
export async function buildTheMindFlow() {
  const checkpointer = await getCheckpointer();
  return new StateGraph(WF)
    .addNode("project_intake", instrument("project_intake", project_intake))
    .addNode("research", instrument("research", research))
    .addNode("workflow_plan", instrument("workflow_plan", workflow_plan))
    .addNode("scope_approval", scope_approval) // interrupt node — uninstrumented
    .addNode("lark_build", instrument("lark_build", lark_build))
    .addNode("lark_verify", instrument("lark_verify", lark_verify))
    .addNode("evidence_capture", instrument("evidence_capture", evidence_capture))
    .addNode("docs_and_blog", instrument("docs_and_blog", docs_and_blog))
    .addNode("artifact_claim_gate", instrument("artifact_claim_gate", artifact_claim_gate))
    .addNode("publish_approval", publish_approval) // interrupt node
    .addNode("publish_strategy", instrument("publish_strategy", publish_strategy))
    .addNode("public_verify", instrument("public_verify", public_verify))
    .addNode("receipt_and_handoff", instrument("receipt_and_handoff", receipt_and_handoff))
    .addNode("draft_complete", instrument("draft_complete", draft_complete))
    .addNode("rejected", instrument("rejected", rejected))
    .addEdge(START, "project_intake")
    .addEdge("project_intake", "research")
    .addEdge("research", "workflow_plan")
    .addEdge("workflow_plan", "scope_approval")
    .addConditionalEdges("scope_approval", afterScope, {
      lark_build: "lark_build",
      workflow_plan: "workflow_plan",
      rejected: "rejected",
    })
    .addConditionalEdges("lark_build", blockedOr("lark_verify"), { [END]: END, lark_verify: "lark_verify" })
    .addConditionalEdges("lark_verify", blockedOr("evidence_capture"), { [END]: END, evidence_capture: "evidence_capture" })
    .addConditionalEdges("evidence_capture", blockedOr("docs_and_blog"), { [END]: END, docs_and_blog: "docs_and_blog" })
    .addEdge("docs_and_blog", "artifact_claim_gate")
    .addConditionalEdges("artifact_claim_gate", blockedOr("publish_approval"), { [END]: END, publish_approval: "publish_approval" })
    .addConditionalEdges("publish_approval", afterPublishApproval, {
      publish_strategy: "publish_strategy",
      draft_complete: "draft_complete",
    })
    .addConditionalEdges("publish_strategy", blockedOr("public_verify"), { [END]: END, public_verify: "public_verify" })
    .addConditionalEdges("public_verify", blockedOr("receipt_and_handoff"), { [END]: END, receipt_and_handoff: "receipt_and_handoff" })
    .addEdge("receipt_and_handoff", END)
    .addEdge("draft_complete", END)
    .addEdge("rejected", END)
    .compile({ checkpointer });
}

/** Display-order node list (UI Graph tab + docs). */
export const MIND_FLOW_NODES = [
  "project_intake", "research", "workflow_plan", "scope_approval",
  "lark_build", "lark_verify", "evidence_capture", "docs_and_blog",
  "artifact_claim_gate", "publish_approval", "publish_strategy",
  "public_verify", "receipt_and_handoff",
] as const;

export const CANONICAL_GRAPH_ID = "wf_01_the_mind_flow";
export const LEGACY_GRAPH_ALIAS = "wf01_research_template_blog";
