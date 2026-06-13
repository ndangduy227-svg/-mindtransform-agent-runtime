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

    const [{ data: session }, { data: project }] = await Promise.all([
      supabase
        .from("sessions").select("id").eq("project_id", projectId).order("created_at").limit(1).single(),
      supabase
        .from("projects").select("name, client_name, industry, objective").eq("id", projectId).single(),
    ])
    if (!session) return NextResponse.json({ error: "project has no chat session" }, { status: 404 })

    // Load history before inserting the current message. Otherwise the engine
    // receives the same user turn once in history and once as `message`.
    const { data: history } = await supabase
      .from("session_messages").select("role, content").eq("session_id", session.id)
      .order("created_at", { ascending: false }).limit(10)

    await supabase.from("session_messages").insert({ session_id: session.id, role: "user", content })

    let reply = ""
    try {
      const res = await fetch(`${ENGINE_URL}/consult`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ENGINE_KEY },
        body: JSON.stringify({
          message: content,
          history: (history ?? [])
            .reverse()
            .filter(m => m.role === "user")
            .map(m => `user: ${m.content}`),
          projectId,
          sessionId: session.id,
          projectContext: [
            `Khách hàng: ${project?.client_name ?? project?.name ?? ""}`,
            `Ngành: ${project?.industry ?? ""}`,
            `Mục tiêu: ${project?.objective ?? ""}`,
          ].join("\n"),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        return NextResponse.json({ error: data.error ?? "engine error" }, { status: 502 })
      }
      reply = data.reply ?? "(engine returned no reply)"
    } catch {
      reply = `(engine unreachable at ${ENGINE_URL})`
    }

    await supabase.from("session_messages").insert({ session_id: session.id, role: "assistant", content: reply })
    return NextResponse.json({ reply })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
