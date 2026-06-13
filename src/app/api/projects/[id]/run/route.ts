import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

const ENGINE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8080"
const ENGINE_KEY = process.env.AGENT_SERVICE_KEY || ""

// POST — start the project's pinned workflow on the engine
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const body = await req.json().catch(() => ({}))

    const [{ data: pin }, { data: project }, { data: session }] = await Promise.all([
      supabase.from("project_workflows").select("workflow_key").eq("project_id", projectId).limit(1).single(),
      supabase.from("projects").select("name, objective, industry, client_name").eq("id", projectId).single(),
      supabase.from("sessions").select("id").eq("project_id", projectId).order("created_at").limit(1).maybeSingle(),
    ])
    if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 })

    const { data: messages } = session?.id
      ? await supabase
          .from("session_messages")
          .select("role, content")
          .eq("session_id", session.id)
          .order("created_at", { ascending: true })
          .limit(50)
      : { data: [] }

    const graph = pin?.workflow_key ?? "wf_01_the_mind_flow"
    const input = body.input ?? {
      vertical: body.vertical ?? project.industry ?? project.name,
      objective: project.objective ?? "",
      clientName: project.client_name ?? project.name,
      brief: [project.objective, ...(messages ?? []).filter(m => m.role === "user").map(m => `user: ${m.content}`)]
        .filter(Boolean)
        .join("\n")
        .slice(0, 30000),
    }

    const { data: run, error } = await supabase
      .from("workflow_runs")
      .insert({ status: "running", input, project_id: projectId, graph_key: graph })
      .select()
      .single()
    if (error) throw error

    let engine: unknown = null
    try {
      const res = await fetch(`${ENGINE_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ENGINE_KEY },
        body: JSON.stringify({ graph, input, runId: run.id, projectId }),
      })
      engine = await res.json()
      if (!res.ok) {
        await supabase
          .from("workflow_runs")
          .update({ status: "failed", output: { error: "engine rejected run", detail: engine } })
          .eq("id", run.id)
        return NextResponse.json({ error: "engine rejected run", run, engine }, { status: 502 })
      }
    } catch {
      engine = { warning: `engine unreachable at ${ENGINE_URL}` }
    }

    return NextResponse.json({ run, engine }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
