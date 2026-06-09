// Neo4j Aura — constraints + vector index for GraphRAG (v3 doc §2.2).
// Run once in Neo4j Browser / cypher-shell after creating the Aura instance.

// ── Uniqueness constraints (dedupe entities by name + tenant) ──────────
CREATE CONSTRAINT industry_name IF NOT EXISTS
  FOR (n:Industry)  REQUIRE (n.name, n.tenant_id) IS UNIQUE;
CREATE CONSTRAINT pain_name IF NOT EXISTS
  FOR (n:Pain)      REQUIRE (n.name, n.tenant_id) IS UNIQUE;
CREATE CONSTRAINT solution_name IF NOT EXISTS
  FOR (n:Solution)  REQUIRE (n.name, n.tenant_id) IS UNIQUE;
CREATE CONSTRAINT case_name IF NOT EXISTS
  FOR (n:CaseStudy) REQUIRE (n.name, n.tenant_id) IS UNIQUE;
CREATE CONSTRAINT phase_name IF NOT EXISTS
  FOR (n:MindPhase) REQUIRE (n.name, n.tenant_id) IS UNIQUE;
CREATE CONSTRAINT doc_id IF NOT EXISTS
  FOR (n:Doc)       REQUIRE (n.id, n.tenant_id) IS UNIQUE;
CREATE CONSTRAINT chunk_id IF NOT EXISTS
  FOR (n:Chunk)     REQUIRE (n.id, n.tenant_id) IS UNIQUE;

// ── Vector index on chunk embeddings (native Neo4j 5.x) ────────────────
// Dimension must match EMBEDDING_MODEL (768 = text-embedding-004). Adjust if changed.
CREATE VECTOR INDEX chunk_embedding IF NOT EXISTS
  FOR (c:Chunk) ON (c.embedding)
  OPTIONS { indexConfig: {
    `vector.dimensions`: 768,
    `vector.similarity_function`: 'cosine'
  } };

// ── Seed the 4 MIND phases (tenant_0) ──────────────────────────────────
UNWIND ['Map','Isolate','Nurture','Drive'] AS p
  MERGE (:MindPhase {name: p, tenant_id: 'tenant_0'});
