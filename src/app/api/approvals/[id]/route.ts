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

    // 1. record decision
    const { error: decErr } = await supabase.from("approval_decisions").insert({
      approval_request_id: id,
      decision,
      actor: body.actor || "Founder",
      reason: body.reason || null,
    })
    if (decErr) throw decErr

    // 2. close the request
    await supabase.from("approval_requests").update({ status: decision }).eq("id", id)

    // 3. resume the engine workflow from its checkpoint
    let engine: unknown = null
    if (body.runId) {
      try {
        const res = await fetch(`${ENGINE_URL}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": ENGINE_KEY },
          body: JSON.stringify({ runId: body.runId, decision }),
        })
        engine = await res.json()
      } catch {
        engine = { warning: `engine unreachable at ${ENGINE_URL} — decision saved, not resumed` }
      }
    }

    return NextResponse.json({ ok: true, decision, engine })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
