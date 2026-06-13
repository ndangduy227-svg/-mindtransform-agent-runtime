import { describe, expect, it } from "vitest";
import { contextRelevance } from "../src/graphrag/relevance.js";
import { isOtoHopNhat, otoHopNhatPlan } from "../src/workflows/golden_specs.js";

describe("Ô Tô Hợp Nhất golden workflow", () => {
  it("recognizes the approved client brief", () => {
    expect(isOtoHopNhat("Ô Tô Hợp Nhất có hơn 40 sale, bán xe tải và garage làm dàn lạnh")).toBe(true);
    expect(isOtoHopNhat("Spa ba chi nhánh quản lý liệu trình")).toBe(false);
  });

  it("contains the required operational surface", () => {
    const plan = otoHopNhatPlan("Test");
    expect(plan.tables).toHaveLength(9);
    expect(plan.views).toHaveLength(7);
    expect(plan.forms).toHaveLength(5);
    expect(plan.dashboard?.blocks).toHaveLength(5);
    expect(plan.tables.flatMap((table) => table.fields).filter((field) => field.type === "link").length).toBeGreaterThanOrEqual(5);
  });

  it("rejects cross-domain GraphRAG context", () => {
    const query = "xe tải garage dàn lạnh vật tư QC bàn giao";
    const spa = "liệu trình spa lịch hẹn chăm sóc da doanh thu chi nhánh";
    const garage = "garage xe tải thiếu vật tư dàn lạnh làm chậm QC và bàn giao";
    expect(contextRelevance(query, spa)).toBeLessThan(0.18);
    expect(contextRelevance(query, garage)).toBeGreaterThanOrEqual(0.18);
  });

  it("does not let generic business vocabulary override a domain conflict", () => {
    const query = "xe tải garage dàn lạnh vận hành khách hàng quy trình";
    const spa = "spa quản lý khách hàng, quy trình vận hành, lịch hẹn và liệu trình chăm sóc da";
    expect(contextRelevance(query, spa)).toBe(0);
  });
});
