import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const migrationPath = path.join(process.cwd(), "supabase", "migrations", "0001_agent_runtime_schema.sql");
  const sql = await readFile(migrationPath, "utf8");

  return new NextResponse(sql, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
