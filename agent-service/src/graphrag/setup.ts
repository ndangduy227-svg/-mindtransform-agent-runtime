import { withSession, ping, closeDriver } from "./neo4j.js";

/**
 * One-shot Neo4j setup: constraints + vector index + MIND phase seed.
 * Mirror of schema/neo4j_constraints.cypher, runnable headlessly:
 *   npx tsx --env-file=.env src/graphrag/setup.ts
 */
const STATEMENTS: string[] = [
  // uniqueness constraints (dedupe entities per tenant)
  `CREATE CONSTRAINT industry_name IF NOT EXISTS FOR (n:Industry)  REQUIRE (n.name, n.tenant_id) IS UNIQUE`,
  `CREATE CONSTRAINT pain_name     IF NOT EXISTS FOR (n:Pain)      REQUIRE (n.name, n.tenant_id) IS UNIQUE`,
  `CREATE CONSTRAINT solution_name IF NOT EXISTS FOR (n:Solution)  REQUIRE (n.name, n.tenant_id) IS UNIQUE`,
  `CREATE CONSTRAINT case_name     IF NOT EXISTS FOR (n:CaseStudy) REQUIRE (n.name, n.tenant_id) IS UNIQUE`,
  `CREATE CONSTRAINT phase_name    IF NOT EXISTS FOR (n:MindPhase) REQUIRE (n.name, n.tenant_id) IS UNIQUE`,
  `CREATE CONSTRAINT doc_id        IF NOT EXISTS FOR (n:Doc)       REQUIRE (n.id, n.tenant_id) IS UNIQUE`,
  `CREATE CONSTRAINT chunk_id      IF NOT EXISTS FOR (n:Chunk)     REQUIRE (n.id, n.tenant_id) IS UNIQUE`,
  // vector index (768 dims = text-embedding-004)
  `CREATE VECTOR INDEX chunk_embedding IF NOT EXISTS
     FOR (c:Chunk) ON (c.embedding)
     OPTIONS { indexConfig: { \`vector.dimensions\`: 768, \`vector.similarity_function\`: 'cosine' } }`,
  // seed MIND phases
  `UNWIND ['Map','Isolate','Nurture','Drive'] AS p
     MERGE (:MindPhase {name: p, tenant_id: 'tenant_0'})`,
];

async function main() {
  console.log("[setup] pinging Neo4j…");
  const ok = await ping();
  if (!ok) throw new Error("Neo4j unreachable — check NEO4J_* env (instance may still be starting).");
  console.log("[setup] connected. applying", STATEMENTS.length, "statements…");

  for (const [i, stmt] of STATEMENTS.entries()) {
    await withSession((s) => s.run(stmt));
    console.log(`[setup] ${i + 1}/${STATEMENTS.length} ok`);
  }

  // verify
  const counts = await withSession(async (s) => {
    const r = await s.run(
      `MATCH (p:MindPhase {tenant_id:'tenant_0'}) RETURN count(p) AS phases`,
    );
    return r.records[0]?.get("phases")?.toNumber?.() ?? r.records[0]?.get("phases");
  });
  console.log(`[setup] done. MindPhase nodes: ${counts}`);
  await closeDriver();
}

main().catch((e) => {
  console.error("[setup] FAILED:", e.message ?? e);
  process.exit(1);
});
