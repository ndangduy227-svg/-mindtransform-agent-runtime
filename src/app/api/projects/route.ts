import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

// GET — project list with workflow pin, latest run status, and cost totals
export async function GET() {
  try {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, name, objective, industry, status, created_at, updated_at")
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(100)
    if (error) throw error

    const ids = (projects ?? []).map(p => p.id)
    if (!ids.length) return NextResponse.json([])

    const [{ data: pins }, { data: runs }, { data: calls }] = await Promise.all([
      supabase.from("project_workflows").select("project_id, workflow_key, workflow_version").in("project_id", ids),
      supabase.from("workflow_runs").select("project_id, status, current_node, started_at").in("project_id", ids).order("started_at", { ascending: false }),
      supabase.from("model_calls").select("project_id, prompt_tokens, completion_tokens, cost_usd").in("project_id", ids),
    ])

    const result = (projects ?? []).map(p => {
      const run = (runs ?? []).find(r => r.project_id === p.id) // newest first
      const pcalls = (calls ?? []).filter(c => c.project_id === p.id)
      return {
        ...p,
        workflow: (pins ?? []).find(w => w.project_id === p.id)?.workflow_key ?? null,
        latest_run_status: run?.status ?? null,
        current_node: run?.current_node ?? null,
        total_tokens: pcalls.reduce((a, c) => a + (c.prompt_tokens || 0) + (c.completion_tokens || 0), 0),
        total_cost: pcalls.reduce((a, c) => a + Number(c.cost_usd || 0), 0),
      }
    })
    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}

// POST — New Chat semantics (build brief §4): create project + workflow pin +
// primary chat session in one shot. Only called on modal submit (cancel = no rows).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }
    const workflowKey = body.workflow || "wf_01_the_mind_flow"

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .insert({
        name: body.name.trim(),
        objective: body.objective || null,
        industry: body.industry || null,
        client_name: body.client_name || null,
      })
      .select()
      .single()
    if (pErr) throw pErr

    const { error: wErr } = await supabase.from("project_workflows").insert({
      project_id: project.id,
      workflow_key: workflowKey,
      workflow_version: "v1",
    })
    if (wErr) throw wErr

    const { data: session, error: sErr } = await supabase
      .from("sessions")
      .insert({ project_id: project.id, source: "project_chat", status: "open" })
      .select()
      .single()
    if (sErr) throw sErr

    return NextResponse.json({ project, session, workflow: workflowKey }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
