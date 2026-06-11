import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

// GET — full workspace payload: project, session, runs, node runs, events,
// approvals, usage aggregates. One call powers all four workspace tabs.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const [{ data: project }, { data: pins }, { data: sessions }, { data: runs }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("project_workflows").select("workflow_key, workflow_version").eq("project_id", id),
      supabase.from("sessions").select("id, status, created_at").eq("project_id", id).order("created_at"),
      supabase.from("workflow_runs").select("id, status, current_node, graph_key, input, output, started_at, finished_at").eq("project_id", id).order("started_at", { ascending: false }).limit(20),
    ])
    if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 })

    const sessionId = sessions?.[0]?.id ?? null
    const latestRunId = runs?.[0]?.id ?? null

    const [msgs, nodeRuns, events, approvals, calls] = await Promise.all([
      sessionId
        ? supabase.from("session_messages").select("id, role, content, created_at").eq("session_id", sessionId).order("created_at").limit(200)
        : Promise.resolve({ data: [] }),
      latestRunId
        ? supabase.from("workflow_node_runs").select("node_id, status, retry_count, output_summary, error, started_at, finished_at").eq("workflow_run_id", latestRunId)
        : Promise.resolve({ data: [] }),
      latestRunId
        ? supabase.from("workflow_run_events").select("type, payload, created_at").eq("workflow_run_id", latestRunId).order("created_at").limit(200)
        : Promise.resolve({ data: [] }),
      supabase.from("approval_requests").select("id, run_id, interrupt_id, payload, status, created_at").eq("status", "pending").in("run_id", (runs ?? []).map(r => r.id)),
      supabase.from("model_calls").select("provider, model, prompt_tokens, completion_tokens, cost_usd, source, node_id, created_at").eq("project_id", id).order("created_at", { ascending: false }).limit(500),
    ])

    const callRows = calls.data ?? []
    const agg = (rows: typeof callRows) => ({
      calls: rows.length,
      tokens: rows.reduce((a, c) => a + (c.prompt_tokens || 0) + (c.completion_tokens || 0), 0),
      cost: rows.reduce((a, c) => a + Number(c.cost_usd || 0), 0),
    })
    const byNode: Record<string, ReturnType<typeof agg>> = {}
    for (const c of callRows) {
      const k = c.node_id || "unknown"
      byNode[k] ??= { calls: 0, tokens: 0, cost: 0 }
      byNode[k].calls += 1
      byNode[k].tokens += (c.prompt_tokens || 0) + (c.completion_tokens || 0)
      byNode[k].cost += Number(c.cost_usd || 0)
    }

    return NextResponse.json({
      project,
      workflow: pins?.[0] ?? null,
      sessionId,
      messages: msgs.data ?? [],
      runs: runs ?? [],
      latestRunId,
      nodeRuns: nodeRuns.data ?? [],
      events: events.data ?? [],
      pendingApprovals: approvals.data ?? [],
      usage: {
        total: agg(callRows),
        chat: agg(callRows.filter(c => c.source === "chat")),
        workflow: agg(callRows.filter(c => c.source !== "chat")),
        byNode: Object.entries(byNode).map(([node, v]) => ({ node, ...v })),
        recent: callRows.slice(0, 20),
      },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}

// PATCH — archive project
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { error } = await supabase
      .from("projects")
      .update({ status: body.status === "archived" ? "archived" : "active", updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
