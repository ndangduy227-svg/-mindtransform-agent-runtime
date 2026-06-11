import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

const ENGINE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8080"
const ENGINE_KEY = process.env.AGENT_SERVICE_KEY || ""

// GET — list workflow runs (newest first)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("workflow_runs")
      .select("id, status, input, output, started_at, finished_at")
      .order("started_at", { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}

// POST — start a workflow run. Records the run, then asks the engine to /run.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const graph = body.graph || "wf01_research_template_blog"
    const input = body.input || { vertical: body.vertical || "Spa" }

    // 1. record the run (status running) — survives even if engine is offline
    const { data: run, error } = await supabase
      .from("workflow_runs")
      .insert({ status: "running", input })
      .select()
      .single()
    if (error) throw error

    // 2. ask the engine to execute (best-effort; engine may not be up in dev)
    let engine: unknown = null
    try {
      const res = await fetch(`${ENGINE_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ENGINE_KEY },
        body: JSON.stringify({ graph, input, runId: run.id }),
      })
      engine = await res.json()
    } catch {
      engine = { warning: `engine unreachable at ${ENGINE_URL} — run recorded, not executed` }
    }

    return NextResponse.json({ run, engine }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
