import { NextResponse } from "next/server";

export function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    SUPABASE_ACCESS_TOKEN: Boolean(process.env.SUPABASE_ACCESS_TOKEN),
    SUPABASE_PROJECT_REF: Boolean(process.env.SUPABASE_PROJECT_REF),
  };

  return NextResponse.json({
    ok: true,
    persistence: Object.values(env).some(Boolean) ? "partially_configured" : "not_configured",
    canCreateSupabaseProject: env.SUPABASE_ACCESS_TOKEN,
    canRunMigrationAutomatically: env.DATABASE_URL,
    recommendedMvpSetup: "Create a separate Supabase project manually, then run the SQL migration and add keys to Vercel env.",
    env,
  });
}
