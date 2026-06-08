import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

// GET — list all agents
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("agents")
      .select("id, name, role, mission, status, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}

// POST — create or upsert an agent with skills/tools config
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { data, error } = await supabase
      .from("agents")
      .upsert({
        name: body.name,
        role: body.role,
        mission: body.mission || null,
        sow_json: {
          skills: body.skills || [],
          scripts: body.scripts || [],
          tools: body.tools || [],
          raw_role_md: body.raw_role_md || "",
        },
        status: "draft",
      }, { onConflict: "name" })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
