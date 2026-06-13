import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

const ENGINE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8080"
const ENGINE_KEY = process.env.AGENT_SERVICE_KEY || ""

// POST — decide an approval request (approve | reject), then resume the engine.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params // approval_request id
    const body = await req.json().catch(() => ({}))
    const decision = body.decision === "reject" ? "reject" : "approve"

    // Decide and close atomically. The database derives run_id from the
    // approval request, so a client cannot resume a different workflow.
    const { data: decided, error: decErr } = await supabase.rpc("decide_workflow_approval", {
      p_approval_request_id: id,
      p_decision: decision,
      p_actor: body.actor || "Founder",
      p_reason: body.reason || null,
    })
    if (decErr) {
      const status = /already decided|not found/i.test(decErr.message) ? 409 : 500
      return NextResponse.json({ error: decErr.message }, { status })
    }
    const approval = decided?.[0]
    if (!approval?.run_id) {
      return NextResponse.json({ error: "approval did not return a workflow run" }, { status: 500 })
    }

    // Resume only after the durable decision exists.
    let engine: unknown = null
    try {
      const res = await fetch(`${ENGINE_URL}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ENGINE_KEY },
        body: JSON.stringify({ runId: approval.run_id, decision }),
      })
      engine = await res.json()
      if (!res.ok) {
        await supabase
          .from("approval_requests")
          .update({ status: "resume_failed" })
          .eq("id", id)
        return NextResponse.json(
          { error: "decision saved but engine resume failed", decision, engine },
          { status: 502 },
        )
      }
    } catch {
      await supabase
        .from("approval_requests")
        .update({ status: "resume_failed" })
        .eq("id", id)
      return NextResponse.json(
        { error: `decision saved but engine unreachable at ${ENGINE_URL}`, decision },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, decision, runId: approval.run_id, engine })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
