import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

// POST - request or decide approval
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    if (body.action === "request") {
      // Create approval request
      const { data, error } = await supabase
        .from("approval_requests")
        .insert({
          session_id: id,
          request_type: body.request_type || "proposal_seed",
          payload: body.payload || {},
          status: "pending",
        })
        .select()
        .single()

      if (error) throw error

      // Update session status
      await supabase.from("sessions").update({ status: "review" }).eq("id", id)

      return NextResponse.json(data, { status: 201 })
    }

    if (body.action === "decide") {
      // Record approval decision
      const { data, error } = await supabase
        .from("approval_decisions")
        .insert({
          approval_request_id: body.approval_request_id,
          decision: body.decision,
          actor: body.actor || "Founder",
          reason: body.reason,
        })
        .select()
        .single()

      if (error) throw error

      // Update approval request status
      await supabase
        .from("approval_requests")
        .update({ status: body.decision })
        .eq("id", body.approval_request_id)

      // Update session status based on decision
      const statusMap: Record<string, string> = {
        approved: "approved",
        rejected: "rejected",
        needs_info: "open",
      }
      await supabase.from("sessions").update({ status: statusMap[body.decision] || "open" }).eq("id", id)

      return NextResponse.json(data, { status: 201 })
    }

    return NextResponse.json({ error: "action must be 'request' or 'decide'" }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
