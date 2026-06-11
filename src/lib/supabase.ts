import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // This module is only imported from API routes (server-side). After the
  // 0003 RLS lockdown anon has no row access, so the service role is required.
  // SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix → never bundled to browser.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[supabase] using anon key — runtime tables are RLS-locked; set SUPABASE_SERVICE_ROLE_KEY")
  }
  _supabase = createClient(url, key, { auth: { persistSession: false } })
  return _supabase
}

// Lazy getter — safe during next build (no module-level createClient call)
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase()
    const value = Reflect.get(client, prop, receiver)
    if (typeof value === "function") {
      return value.bind(client)
    }
    return value
  },
})
