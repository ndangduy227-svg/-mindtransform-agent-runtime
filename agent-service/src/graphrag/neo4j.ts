import neo4j, { Driver, Session } from "neo4j-driver";

/**
 * Neo4j Aura driver — the knowledge graph + native vector index.
 * One shared driver per process; open a session per query and close it.
 */
let driver: Driver | null = null;

export function getDriver(): Driver {
  if (driver) return driver;
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !password) {
    throw new Error("[neo4j] NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD missing");
  }
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  return driver;
}

export async function withSession<T>(fn: (s: Session) => Promise<T>): Promise<T> {
  const s = getDriver().session({ database: process.env.NEO4J_DATABASE || "neo4j" });
  try {
    return await fn(s);
  } finally {
    await s.close();
  }
}

/** Health check used by /status and P0 "ping". */
export async function ping(): Promise<boolean> {
  try {
    await withSession((s) => s.run("RETURN 1 AS ok"));
    return true;
  } catch (e) {
    console.error("[neo4j] ping failed", e);
    return false;
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) await driver.close();
  driver = null;
}
