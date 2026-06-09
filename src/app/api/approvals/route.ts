import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

// GET — list pending approval requests (founder approval queue)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("id, session_id, request_type, payload, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
