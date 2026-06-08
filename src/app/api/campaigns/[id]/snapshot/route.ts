import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

// POST - create context snapshot (memory compaction)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const { data, error } = await supabase
      .from("context_snapshots")
      .insert({
        session_id: id,
        summary: body.summary,
        decisions: body.decisions || [],
        risks: body.risks || [],
        handoff_delta: body.handoff_delta || {},
      })
      .select()
      .single()

    if (error) throw error

    // Also save protected facts if provided
    if (body.protected_facts && Array.isArray(body.protected_facts)) {
      await supabase.from("protected_facts").insert(
        body.protected_facts.map((f: { key: string; value: unknown; source?: string }) => ({
          session_id: id,
          fact_key: f.key,
          fact_value: f.value,
          source_ref: f.source || "snapshot",
          freshness_status: "current",
        }))
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
