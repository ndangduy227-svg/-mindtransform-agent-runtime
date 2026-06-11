// @ts-expect-error pg ships no ESM types in this setup
import pg from "pg";

/**
 * DB connectivity probe — tries password variants x host variants (direct + pooler),
 * reports the first working DATABASE_URL and how many tier0 tables exist.
 *   npx tsx --env-file=.env src/db/check.ts
 */
const REF = "jcuqnhgfbqhsjuhnwkjp";
const PASSWORDS = ["Duybt2272002@", "Duybt2272002", "duybt2272002", "Duybt22072002@"];
// Direct host is IPv6-only (AAAA → AWS Singapore). Project region = ap-southeast-1.
// Newer projects sit on aws-1-* pooler hosts; try both gens + both ports.
const HOSTS = [
  "aws-1-ap-southeast-2.pooler.supabase.com", // from Dashboard Connect (Sydney)
];
const PORTS = [5432, 6543];

function urls(pw: string): string[] {
  const enc = encodeURIComponent(pw);
  const out: string[] = [];
  for (const h of HOSTS) for (const p of PORTS) {
    out.push(`postgresql://postgres.${REF}:${enc}@${h}:${p}/postgres`);
  }
  return out;
}

async function tryUrl(url: string): Promise<{ ok: boolean; err?: string; tables?: number }> {
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    const r = await client.query(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'`,
    );
    await client.end();
    return { ok: true, tables: r.rows[0].n };
  } catch (e: unknown) {
    try { await client.end(); } catch { /* noop */ }
    return { ok: false, err: (e as Error).message };
  }
}

async function main() {
  // 1) try env DATABASE_URL first
  if (process.env.DATABASE_URL) {
    const r = await tryUrl(process.env.DATABASE_URL);
    console.log(`[check] env DATABASE_URL → ${r.ok ? `OK, ${r.tables} public tables` : `FAIL: ${r.err}`}`);
    if (r.ok) return;
  }
  // 2) sweep candidates
  for (const pw of PASSWORDS) {
    for (const url of urls(pw)) {
      const masked = url.replace(/:([^:@/]+)@/, ":***@");
      const r = await tryUrl(url);
      console.log(`[check] ${masked} → ${r.ok ? `OK, ${r.tables} tables` : r.err?.slice(0, 70)}`);
      if (r.ok) {
        console.log(`\n[check] WORKING URL (put in .env):\nDATABASE_URL=${url}`);
        return;
      }
    }
  }
  console.log("[check] no combination worked — password may be different; reset DB password in Supabase → Settings → Database.");
}

main();
