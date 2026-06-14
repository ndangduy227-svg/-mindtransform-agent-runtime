import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { Command, MemorySaver } from "@langchain/langgraph";

/**
 * The Mind Flow (Step 3) acceptance tests — build brief §12:
 *  - run pauses at scope_approval; nothing after the gate runs early
 *  - scope reject → plan revision loop (cap 1) → second reject ends `rejected`
 *  - approve path reaches publish_approval; approve → done with receipt
 *  - publish reject → draft_complete (output stays Draft)
 *  - missing Lark adapter → run ends `blocked` at lark_build (no fake success)
 *  - notes never duplicated
 * Real graph; mocked externals (models / GraphRAG / Supabase / checkpointer / tools).
 */

vi.mock("../src/models/router.js", () => ({
  callModel: vi.fn(async (_p: string, _prompt: string, opts: { stage: string }) => ({
    // intake parses JSON; other stages need ≥200 chars to pass the claim gate
    text:
      opts.stage === "project_intake"
        ? `{"problemFrame":"test_frame","inScope":["a","b","c"],"outOfScope":["kiotviet_writeback"],"prohibitedClaims":["integrated_with_kiotviet"]}`
        : opts.stage === "lark_spec"
        ? `{"tables":[{"logicalKey":"t1","name":"Bảng 1","fields":[{"name":"Tên","type":"text"}]}],"views":[],"forms":[],"sampleRecords":{"t1":[{"Tên":"mẫu"}]}}`
        : `[${opts.stage}] mocked output — ${"nội dung đủ dài cho claim gate. ".repeat(8)}`,
    tokensIn: 10,
    tokensOut: 5,
    costUsd: 0.0001,
  })),
  embed: vi.fn(async () => new Array(768).fill(0)),
  pickProvider: vi.fn(() => "groq"),
}));

vi.mock("../src/graphrag/query.js", () => ({
  graphQuery: vi.fn(async () => ({ chunks: [], entities: [], relations: [] })),
  renderContext: vi.fn(() => ""),
  contextRelevance: vi.fn(() => 0),
}));

vi.mock("../src/db/supabase.js", () => {
  const result = Promise.resolve({ error: null, data: null });
  type Chain = {
    (...args: unknown[]): Chain;
    then: typeof result.then;
  };
  function createChain(): Chain {
    const proxy: Chain = new Proxy((() => proxy) as Chain, {
      get: (_t, prop) => (prop === "then" ? result.then.bind(result) : () => proxy),
      apply: () => proxy,
    });
    return proxy;
  }
  const chain = createChain();
  return { supabase: { from: () => chain }, DATABASE_URL: "" };
});

vi.mock("../src/memory/checkpointer.js", () => {
  const saver = new MemorySaver();
  return { getCheckpointer: async () => saver };
});

// Tool adapters — default SUCCESS so the full path is testable; individual
// tests override to blocked to assert §7 honesty.
vi.mock("../src/tools/lark.js", () => ({
  buildLarkSolution: vi.fn(async () => ({
    status: "success",
    baseUrl: "https://lark.example/base/x",
    appToken: "bascTEST",
    warnings: [],
    receipts: [{ logicalKey: "t1", idempotencyKey: "k1", kind: "lark_table", externalId: "tblX", status: "verified" }],
  })),
  verifyLarkResources: vi.fn(async () => ({ status: "success", verified: 2, missing: [] })),
  createLarkDocument: vi.fn(async () => ({
    logicalKey: "setup_doc",
    idempotencyKey: "doc-k1",
    kind: "lark_doc",
    externalId: "docX",
    externalUrl: "https://lark.example/docx/x",
    status: "verified",
  })),
}));
vi.mock("../src/tools/evidence.js", () => ({
  captureEvidence: vi.fn(async () => ({
    status: "success",
    strategy: "api_render",
    items: [{ type: "api_render", name: "evidence_t1", uri: "artifact:e1", disclosure: "rendered from API data" }],
  })),
}));
vi.mock("../src/tools/publisher.js", () => ({
  selectPublishStrategy: vi.fn(() => ({ strategy: "static_git_deploy", reason: "test" })),
  publish: vi.fn(async () => ({
    status: "success",
    strategy: "static_git_deploy",
    publicUrl: "https://mind-transform.vercel.app/blog/test",
  })),
}));

const { buildTheMindFlow } = await import("../src/graphs/the_mind_flow.js");
const lark = await import("../src/tools/lark.js");

const cfg = (id: string) => ({ configurable: { thread_id: id } });
const INPUT = { tenantId: "tenant_0", runId: "r", projectId: "p", vertical: "Spa", objective: "test" };

describe("The Mind Flow (Step 3) — gates, revision, blocked, draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "<html>Spa</html>",
    })));
  });

  it("pauses at scope_approval; nothing past the gate runs early", async () => {
    const g = await buildTheMindFlow();
    await g.invoke({ ...INPUT, runId: "t1" }, cfg("t1"));
    const st = await g.getState(cfg("t1"));
    expect(st.next).toContain("scope_approval");
    const joined = st.values.notes.join("\n");
    expect(joined).toContain("[plan]");
    expect(joined).not.toContain("[lark_build]");
    expect(lark.buildLarkSolution as Mock).not.toHaveBeenCalled();
  });

  it("scope reject → revision loop → second reject ends rejected", async () => {
    const g = await buildTheMindFlow();
    await g.invoke({ ...INPUT, runId: "t2" }, cfg("t2"));
    // reject #1 → re-plan → pause again
    await g.invoke(new Command({ resume: "reject" }), cfg("t2"));
    const mid = await g.getState(cfg("t2"));
    expect(mid.next).toContain("scope_approval");
    expect(mid.values.revisionCount).toBe(1);
    // reject #2 → rejected terminal
    const result = await g.invoke(new Command({ resume: "reject" }), cfg("t2"));
    expect(result.scopeApproved).toBe(false);
    expect(result.notes.join("\n")).toContain("[rejected]");
    expect(lark.buildLarkSolution as Mock).not.toHaveBeenCalled();
  });

  it("approve → runs to publish_approval; approve → done with receipt + URL", async () => {
    const g = await buildTheMindFlow();
    await g.invoke({ ...INPUT, runId: "t3" }, cfg("t3"));
    await g.invoke(new Command({ resume: "approve" }), cfg("t3"));
    const mid = await g.getState(cfg("t3"));
    expect(mid.next).toContain("publish_approval"); // second gate
    const result = await g.invoke(new Command({ resume: "approve" }), cfg("t3"));
    const joined = result.notes.join("\n");
    expect(joined).toContain("[receipt]");
    expect(result.publicUrl).toContain("vercel.app");
    expect(result.blocked).toBeNull();
  });

  it("publish reject → draft_complete, no publish call", async () => {
    const pub = await import("../src/tools/publisher.js");
    const g = await buildTheMindFlow();
    await g.invoke({ ...INPUT, runId: "t4" }, cfg("t4"));
    await g.invoke(new Command({ resume: "approve" }), cfg("t4")); // scope
    const result = await g.invoke(new Command({ resume: "reject" }), cfg("t4")); // publish
    expect(result.publishApproved).toBe(false);
    expect(result.notes.join("\n")).toContain("[draft_complete]");
    expect(pub.publish as Mock).not.toHaveBeenCalled();
  });

  it("missing Lark adapter → blocked at lark_build, no docs/blog (§7 honesty)", async () => {
    (lark.buildLarkSolution as Mock).mockResolvedValueOnce({
      status: "blocked",
      reason: "lark adapter not implemented yet (Step 4)",
    });
    const g = await buildTheMindFlow();
    await g.invoke({ ...INPUT, runId: "t5" }, cfg("t5"));
    const result = await g.invoke(new Command({ resume: "approve" }), cfg("t5"));
    expect(result.blocked?.node).toBe("lark_build");
    const joined = result.notes.join("\n");
    expect(joined).toContain("BLOCKED");
    expect(joined).not.toContain("[docs_and_blog]");
    expect(joined).not.toContain("[receipt]");
  });

  it("notes are never duplicated across the full approve path", async () => {
    const g = await buildTheMindFlow();
    await g.invoke({ ...INPUT, runId: "t6" }, cfg("t6"));
    await g.invoke(new Command({ resume: "approve" }), cfg("t6"));
    const result = await g.invoke(new Command({ resume: "approve" }), cfg("t6"));
    const notes: string[] = result.notes;
    expect(new Set(notes).size).toBe(notes.length);
  });
});
