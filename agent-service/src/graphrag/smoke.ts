import { ingestDoc } from "./ingest.js";
import { withSession, closeDriver } from "./neo4j.js";

/**
 * GraphRAG smoke test — ingest a tiny Spa doc, then inspect the graph.
 *   npx tsx --env-file=.env src/graphrag/smoke.ts
 */
const SAMPLE = `
Ngành Spa tại Việt Nam (quy mô 3-5 chi nhánh) có các điểm đau vận hành điển hình:
1. Báo cáo doanh thu thủ công: cuối ngày quản lý từng chi nhánh nhắn doanh thu qua Zalo,
   chủ phải tự cộng tay vào Excel. Giải pháp: template Lark Base báo cáo doanh thu tự động,
   đã chứng minh ở case study Spa Hương Sen (giảm 80% thời gian tổng hợp).
2. Quản lý lịch hẹn chồng chéo: khách đặt qua Facebook, Zalo, hotline không đồng bộ,
   dẫn đến trùng giờ kỹ thuật viên. Giải pháp: hệ thống lịch hẹn tập trung trên Lark.
3. Theo dõi liệu trình khách hàng bằng sổ giấy: mất lịch sử khi khách đổi chi nhánh.
   Giải pháp: hồ sơ khách hàng số hoá, thuộc phase Nurture trong MIND framework.
`;

async function main() {
  console.log("[smoke] wiping previous smoke data…");
  await withSession((s) =>
    s.run(`MATCH (n {tenant_id:'tenant_0'}) WHERE NOT n:MindPhase DETACH DELETE n`),
  );

  console.log("[smoke] ingesting sample Spa doc…");
  await ingestDoc("smoke_spa_v1", SAMPLE, "tenant_0");

  console.log("[smoke] graph contents:");
  const summary = await withSession(async (s) => {
    const labels = await s.run(`
      MATCH (n {tenant_id:'tenant_0'})
      RETURN head(labels(n)) AS label, count(n) AS cnt ORDER BY cnt DESC`);
    const rels = await s.run(`
      MATCH (a {tenant_id:'tenant_0'})-[r]->(b {tenant_id:'tenant_0'})
      RETURN a.name AS from, type(r) AS rel, b.name AS to LIMIT 25`);
    return {
      labels: labels.records.map(r => `${r.get("label")}: ${r.get("cnt")}`),
      rels: rels.records.map(r => `(${r.get("from")}) -[${r.get("rel")}]-> (${r.get("to")})`),
    };
  });

  console.log("  nodes:", summary.labels.join(" · "));
  for (const line of summary.rels) console.log("  ", line);

  // Multi-hop demo — the GraphRAG money shot:
  // "Pain nào của Spa đã có giải pháp được chứng minh, ở case study nào?"
  console.log("[smoke] multi-hop: Industry → Pain → Solution → CaseStudy");
  const hops = await withSession((s) =>
    s.run(`
      MATCH (i:Industry {tenant_id:'tenant_0'})-[:HAS_PAIN]->(p:Pain)
            -[:SOLVED_BY]->(sol:Solution)-[:PROVEN_IN]->(c:CaseStudy)
      RETURN i.name AS industry, p.name AS pain, sol.name AS solution, c.name AS proof`),
  );
  for (const r of hops.records) {
    console.log(`   ${r.get("industry")} | ${r.get("pain")} → ${r.get("solution")} ✓ ${r.get("proof")}`);
  }
  if (hops.records.length === 0) console.log("   (no full 3-hop chain — check extraction)");

  await closeDriver();
  console.log("[smoke] DONE");
}

main().catch((e) => {
  console.error("[smoke] FAILED:", e.message ?? e);
  process.exit(1);
});
