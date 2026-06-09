import { withSession } from "./neo4j.js";
import { embed, callModel } from "../models/router.js";

/**
 * GraphRAG ingest pipeline (v3 doc §2.3):
 *   1. chunk doc → 2. embed each chunk → 3. LLM extract entities+relations
 *   → 4. MERGE into Neo4j (dedupe by name) → 5. (optional) community summary
 *
 * Skeleton: wire real chunking + extraction prompt before running.
 * Run: `npm run ingest -- <path-to-doc>` (after creating constraints/index).
 */

interface Triple {
  source: { name: string; label: string };
  rel: string;
  target: { name: string; label: string };
}

/** 3. LLM entity+relation extraction from one chunk. */
async function extractTriples(chunkText: string, tenantId: string): Promise<Triple[]> {
  const prompt = `Trích các thực thể và quan hệ từ đoạn sau cho domain tư vấn chuyển đổi số (ngành, pain, giải pháp, case study, MIND phase).
Trả JSON array: [{"source":{"name","label"},"rel","target":{"name","label"}}].
Label hợp lệ: Industry, Pain, Solution, CaseStudy, MindPhase.
Đoạn:\n${chunkText}`;
  const { text } = await callModel("gemini", prompt, { tenantId, stage: "ingest_extract" });
  try {
    return JSON.parse(text) as Triple[];
  } catch {
    console.warn("[ingest] extract returned non-JSON, skipping chunk");
    return [];
  }
}

/** 4. MERGE nodes + edges (dedupe by name+tenant). */
async function mergeTriples(triples: Triple[], tenantId: string): Promise<void> {
  if (!triples.length) return;
  await withSession(async (s) => {
    for (const t of triples) {
      await s.run(
        `
        MERGE (a {name: $sname, tenant_id: $tenant})
          ON CREATE SET a:\`${sanitize(t.source.label)}\`
        MERGE (b {name: $tname, tenant_id: $tenant})
          ON CREATE SET b:\`${sanitize(t.target.label)}\`
        MERGE (a)-[:\`${sanitize(t.rel)}\`]->(b)
        `,
        { sname: t.source.name, tname: t.target.name, tenant: tenantId },
      );
    }
  });
}

/** Store a chunk node with embedding + MENTIONS edges. */
async function storeChunk(
  docId: string,
  text: string,
  tenantId: string,
  entityNames: string[],
): Promise<void> {
  const vector = await embed(text);
  await withSession(async (s) => {
    await s.run(
      `
      MERGE (c:Chunk {id: $id, tenant_id: $tenant})
        SET c.text = $text, c.embedding = $vector
      MERGE (d:Doc {id: $docId, tenant_id: $tenant})
      MERGE (c)-[:FROM_DOC]->(d)
      WITH c
      UNWIND $names AS nm
        MATCH (e {name: nm, tenant_id: $tenant})
        MERGE (c)-[:MENTIONS]->(e)
      `,
      { id: `${docId}:${hash(text)}`, text, vector, docId, tenant: tenantId, names: entityNames },
    );
  });
}

export async function ingestDoc(docId: string, fullText: string, tenantId: string): Promise<void> {
  const chunks = chunkText(fullText);
  console.log(`[ingest] ${docId}: ${chunks.length} chunks`);
  for (const chunk of chunks) {
    const triples = await extractTriples(chunk, tenantId);
    await mergeTriples(triples, tenantId);
    const names = [...new Set(triples.flatMap((t) => [t.source.name, t.target.name]))];
    await storeChunk(docId, chunk, tenantId, names);
  }
}

// ── helpers (skeleton — replace with real impls) ──────────────
function chunkText(text: string, size = 1200): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}
function sanitize(label: string): string {
  return label.replace(/[^A-Za-z0-9_]/g, "_");
}
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
