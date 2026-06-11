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

    const { data: pin } = await supabase
      .from("project_workflows").select("workflow_key").eq("project_id", projectId).limit(1).single()
    const graph = pin?.workflow_key ?? "wf_01_the_mind_flow"
    const input = body.input ?? { vertical: body.vertical ?? "Spa" }

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
    } catch {
      engine = { warning: `engine unreachable at ${ENGINE_URL}` }
    }

    return NextResponse.json({ run, engine }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
