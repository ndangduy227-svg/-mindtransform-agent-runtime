import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET - full campaign detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const { data: session, error } = await supabase
      .from("sessions")
      .select(`
        *,
        lead:leads (
          id, status, score, recommended_offer, pain_summary,
          organization:organizations ( id, name, industry, website ),
          contact:contacts ( id, name, email, phone )
        ),
        messages:session_messages ( id, role, content, token_estimate, created_at ),
        snapshots:context_snapshots ( id, summary, decisions, risks, created_at ),
        facts:protected_facts ( id, fact_key, fact_value, freshness_status, created_at )
      `)
      .eq("id", id)
      .order("created_at", { referencedTable: "session_messages", ascending: true })
      .single()

    if (error) throw error

    // Also fetch lead qualification if exists
    const { data: qualifications } = await supabase
      .from("lead_qualification")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: false })

    // Fetch pending approvals
    const { data: approvals } = await supabase
      .from("approval_requests")
      .select("*, decisions:approval_decisions(*)")
      .eq("session_id", id)
      .order("created_at", { ascending: false })

    return NextResponse.json({
      ...session,
      qualifications: qualifications ?? [],
      approvals: approvals ?? [],
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 })
  }
}
