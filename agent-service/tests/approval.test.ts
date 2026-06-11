import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command, MemorySaver } from "@langchain/langgraph";

/**
 * QC P0 acceptance tests (HANDOFF 2026-06-11 §9):
 *  - approve runs the post-approval branch exactly once
 *  - reject NEVER runs marketing; run ends approved=false
 *  - duplicate decision does not resume the graph a second time
 *  - notes are not duplicated by the reducer (P2 finding)
 * Real graph, mocked externals (models / GraphRAG / Supabase / checkpointer).
 */

vi.mock("../src/models/router.js", () => ({
  callModel: vi.fn(async (_p: string, _prompt: string, opts: { stage: string }) => ({
    text: `[${opts.stage}] mocked output`,
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
}));

vi.mock("../src/db/supabase.js", () => ({
  supabase: { from: () => ({ upsert: async () => ({ error: null }), insert: async () => ({ error: null }) }) },
  DATABASE_URL: "",
}));

vi.mock("../src/memory/checkpointer.js", () => {
  const saver = new MemorySaver();
  return { getCheckpointer: async () => saver };
});

const { buildWf01 } = await import("../src/graphs/wf01_research_template_blog.js");

function cfg(threadId: string) {
  return { configurable: { thread_id: threadId } };
}

const INPUT = { tenantId: "tenant_0", runId: "r1", vertical: "Spa" };

describe("The Mind Flow approval semantics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pauses at approval before any post-approval node", async () => {
    const g = await buildWf01();
    await g.invoke({ ...INPUT, runId: "t-pause" }, cfg("t-pause"));
    const st = await g.getState(cfg("t-pause"));
    expect(st.next).toContain("approval");
    const notes: string[] = st.values.notes;
    expect(notes.join("\n")).not.toContain("[marketing]");
  });

  it("approve continues to marketing exactly once", async () => {
    const g = await buildWf01();
    await g.invoke({ ...INPUT, runId: "t-approve" }, cfg("t-approve"));
    const result = await g.invoke(new Command({ resume: "approve" }), cfg("t-approve"));
    expect(result.approved).toBe(true);
    const marketingNotes = result.notes.filter((n: string) => n.includes("[marketing]"));
    expect(marketingNotes).toHaveLength(1);
    const st = await g.getState(cfg("t-approve"));
    expect(st.next).toHaveLength(0); // finished
  });

  it("reject never runs marketing and ends approved=false", async () => {
    const g = await buildWf01();
    await g.invoke({ ...INPUT, runId: "t-reject" }, cfg("t-reject"));
    const result = await g.invoke(new Command({ resume: "reject" }), cfg("t-reject"));
    expect(result.approved).toBe(false);
    expect(result.notes.join("\n")).not.toContain("[marketing]");
    expect(result.notes.join("\n")).toContain("[rejected]");
    const st = await g.getState(cfg("t-reject"));
    expect(st.next).toHaveLength(0); // terminal — no pending marketing
  });

  it("duplicate decision does not resume a finished run", async () => {
    const g = await buildWf01();
    await g.invoke({ ...INPUT, runId: "t-dup" }, cfg("t-dup"));
    const first = await g.invoke(new Command({ resume: "approve" }), cfg("t-dup"));
    const notesAfterFirst = first.notes.length;
    // second (duplicate) decision on an already-finished thread
    const second = await g.invoke(new Command({ resume: "approve" }), cfg("t-dup"));
    const st = await g.getState(cfg("t-dup"));
    expect(st.next).toHaveLength(0);
    expect((second?.notes ?? st.values.notes).length).toBe(notesAfterFirst);
  });

  it("notes are not duplicated by the reducer", async () => {
    const g = await buildWf01();
    await g.invoke({ ...INPUT, runId: "t-notes" }, cfg("t-notes"));
    const result = await g.invoke(new Command({ resume: "approve" }), cfg("t-notes"));
    const notes: string[] = result.notes;
    // every note unique — the old bug doubled earlier notes on every node
    expect(new Set(notes).size).toBe(notes.length);
    // research, plan, build, marketing — one each
    for (const stage of ["[research]", "[plan]", "[marketing]"]) {
      expect(notes.filter((n) => n.includes(stage))).toHaveLength(1);
    }
  });
});
