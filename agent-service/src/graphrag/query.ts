import { withSession } from "./neo4j.js";
import { embed } from "../models/router.js";

const MAX_HOPS = Number(process.env.GRAPHRAG_MAX_HOPS ?? 2);

export interface GraphContext {
  chunks: string[];
  entities: { name: string; label: string }[];
  relations: string[];
}

/**
 * GraphRAG hybrid query (v3 doc §2.4):
 *   1. vector search for entry chunks (Neo4j native vector index)
 *   2. seed entities from matched chunks
 *   3. traverse 1–MAX_HOPS along relationships
 *   4. assemble subgraph + chunks → context for the LLM
 *
 * NOTE: skeleton. Requires a vector index created on :Chunk(embedding)
 * and entities linked via [:MENTIONS]. See schema/neo4j_constraints.cypher.
 */
export async function graphQuery(
  question: string,
  tenantId: string,
  topK = 5,
): Promise<GraphContext> {
  const vector = await embed(question);

  // No embedding key yet → zero-vector (invalid for the index). Fall back to
  // keyword entry: match entity names against question words, then traverse.
  if (vector.every((v) => v === 0)) {
    return keywordQuery(question, tenantId);
  }

  return withSession(async (s) => {
    // 1 + 2: vector search → entry chunks → seed entities
    const res = await s.run(
      `
      CALL db.index.vector.queryNodes('chunk_embedding', $topK, $vector)
      YIELD node AS chunk, score
      WHERE chunk.tenant_id = $tenantId
      OPTIONAL MATCH (chunk)-[:MENTIONS]->(e)
      // 3: traverse up to MAX_HOPS from seed entities
      OPTIONAL MATCH path = (e)-[*1..${MAX_HOPS}]-(related)
      WHERE related.tenant_id = $tenantId
      RETURN
        collect(DISTINCT chunk.text)        AS chunks,
        collect(DISTINCT { name: e.name, label: head(labels(e)) }) AS entities,
        collect(DISTINCT [type(last(relationships(path)))]) AS relTypes
      `,
      { vector, topK, tenantId },
    );

    const row = res.records[0];
    if (!row) return { chunks: [], entities: [], relations: [] };

    return {
      chunks: (row.get("chunks") ?? []).filter(Boolean),
      entities: (row.get("entities") ?? []).filter((e: { name?: string }) => e?.name),
      relations: (row.get("relTypes") ?? []).flat().filter(Boolean),
    };
  });
}

/** Keyword fallback (no embeddings): entity-name match → traverse → chunks. */
async function keywordQuery(question: string, tenantId: string): Promise<GraphContext> {
  const words = question
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3);
  if (!words.length) return { chunks: [], entities: [], relations: [] };

  return withSession(async (s) => {
    const res = await s.run(
      `
      MATCH (e {tenant_id: $tenantId})
      WHERE NOT e:Chunk AND NOT e:Doc
        AND any(w IN $words WHERE toLower(e.name) CONTAINS w)
      OPTIONAL MATCH path = (e)-[*1..${MAX_HOPS}]-(related {tenant_id: $tenantId})
      WHERE NOT related:Chunk AND NOT related:Doc
      OPTIONAL MATCH (c:Chunk {tenant_id: $tenantId})-[:MENTIONS]->(e)
      RETURN
        collect(DISTINCT c.text)[..5] AS chunks,
        collect(DISTINCT { name: e.name, label: head(labels(e)) }) +
          collect(DISTINCT { name: related.name, label: head(labels(related)) }) AS entities,
        collect(DISTINCT [r IN relationships(path) | type(r)]) AS relTypes
      `,
      { words, tenantId },
    );
    const row = res.records[0];
    if (!row) return { chunks: [], entities: [], relations: [] };
    return {
      chunks: (row.get("chunks") ?? []).filter(Boolean),
      entities: (row.get("entities") ?? []).filter((e: { name?: string }) => e?.name),
      relations: [...new Set((row.get("relTypes") ?? []).flat(2).filter(Boolean))] as string[],
    };
  });
}

/** Render GraphContext into a compact text block for prompt injection. */
export function renderContext(ctx: GraphContext): string {
  const ents = ctx.entities.map((e) => `${e.label}:${e.name}`).join(", ");
  const rels = [...new Set(ctx.relations)].join(", ");
  return [
    ctx.chunks.length ? `# Tài liệu liên quan\n${ctx.chunks.join("\n---\n")}` : "",
    ents ? `# Thực thể liên quan\n${ents}` : "",
    rels ? `# Quan hệ\n${rels}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
