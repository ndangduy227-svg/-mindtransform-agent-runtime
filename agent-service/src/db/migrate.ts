// @ts-expect-error pg ships no ESM types in this setup
import pg from "pg";
import { readFileSync } from "node:fs";

/**
 * Apply a SQL migration file to DATABASE_URL (multi-statement, single query).
 *   npx tsx --env-file=.env src/db/migrate.ts ../supabase/migrations/0003_*.sql
 */
const file = process.argv[2];
if (!file) {
  console.error("usage: migrate.ts <path-to-sql>");
  process.exit(1);
}
const sql = readFileSync(file, "utf8");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query(sql);
  console.log(`[migrate] applied: ${file}`);
} finally {
  await client.end();
}
