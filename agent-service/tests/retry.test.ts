import { describe, it, expect, vi } from "vitest";

vi.mock("../src/db/supabase.js", () => ({
  supabase: { from: () => ({ upsert: async () => ({ error: null }) }) },
  DATABASE_URL: "",
}));
vi.mock("../src/queue/index.js", () => ({
  getBoss: vi.fn(),
  WF_QUEUE: "workflow_run",
  enqueueWorkflow: vi.fn(),
}));
vi.mock("../src/worker_graphs.js", () => ({ GRAPH_FACTORIES: {}, KNOWN_GRAPHS: [] }));

const { isRetryableError } = await import("../src/worker.js");

describe("error classifier (QC failure taxonomy §8)", () => {
  it.each([
    ["Lark OpenAPIBatchAddRecords limited", true], // TRANSIENT_RATE_LIMIT
    ["429 Too Many Requests", true],
    ["fetch failed: ECONNRESET", true], // TRANSIENT_NETWORK
    ["connect ETIMEDOUT — request timed out", true],
    ["upstream 503 Service Unavailable", true],
  ])("retryable: %s", (msg, expected) => {
    expect(isRetryableError(msg)).toBe(expected);
  });

  it.each([
    ["new row violates row-level security policy", false], // POLICY_DENIED
    ["permission denied for table approval_requests", false],
    ["401 unauthorized", false], // AUTH
    ["invalid input syntax for type uuid", false], // SCHEMA
    ["some unknown weird error", false], // UNKNOWN → fail closed
  ])("non-retryable: %s", (msg, expected) => {
    expect(isRetryableError(msg)).toBe(expected);
  });
});
