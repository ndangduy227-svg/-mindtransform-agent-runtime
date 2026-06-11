import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

const ENGINE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8080"
const ENGINE_KEY = process.env.AGENT_SERVICE_KEY || ""

// POST — project chat: persist user message, get engine /consult reply
// (tokens land in model_calls with source=chat + project_id), persist reply.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const body = await req.json()
    const content: string = (body.message ?? "").trim()
    if (!content) return NextResponse.json({ error: "message required" }, { status: 400 })

    const { data: session } = await supabase
      .from("sessions").select("id").eq("project_id", projectId).order("created_at").limit(1).single()
    if (!session) return NextResponse.json({ error: "project has no chat session" }, { status: 404 })

    await supabase.from("session_messages").insert({ session_id: session.id, role: "user", content })

    const { data: history } = await supabase
      .from("session_messages").select("role, content").eq("session_id", session.id)
      .order("created_at", { ascending: false }).limit(10)

    let reply = ""
    try {
      const res = await fetch(`${ENGINE_URL}/consult`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ENGINE_KEY },
        body: JSON.stringify({
          message: content,
          history: (history ?? []).reverse().map(m => `${m.role}: ${m.content}`),
          projectId,
          sessionId: session.id,
        }),
      })
      const data = await res.json()
      reply = data.reply ?? data.error ?? "(engine error)"
    } catch {
      reply = `(engine unreachable at ${ENGINE_URL})`
    }

    await supabase.from("session_messages").insert({ session_id: session.id, role: "assistant", content: reply })
    return NextResponse.json({ reply })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
