import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

// POST - qualify/score a lead from campaign session
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // Get session to find lead_id
    const { data: session } = await supabase
      .from("sessions")
      .select("lead_id")
      .eq("id", id)
      .single()

    if (!session?.lead_id) {
      return NextResponse.json({ error: "No lead linked to this session" }, { status: 400 })
    }

    // Update lead score
    await supabase
      .from("leads")
      .update({
        score: body.score,
        recommended_offer: body.recommended_offer,
        status: "qualified",
      })
      .eq("id", session.lead_id)

    // Create qualification record
    const { data, error } = await supabase
      .from("lead_qualification")
      .insert({
        lead_id: session.lead_id,
        session_id: id,
        score: body.score,
        fit_reason: body.fit_reason,
        recommended_offer: body.recommended_offer,
        urgency: body.urgency || "medium",
        next_action: body.next_action,
      })
      .select()
      .single()

    if (error) throw error

    // Update session status
    await supabase.from("sessions").update({ status: "qualified" }).eq("id", id)

    return NextResponse.json(data, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
