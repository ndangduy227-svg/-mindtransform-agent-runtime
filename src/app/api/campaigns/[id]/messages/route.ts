import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// POST - send a message in a campaign session
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const { data, error } = await supabase
      .from("session_messages")
      .insert({
        session_id: id,
        role: body.role || "user",
        content: body.content,
        token_estimate: body.token_estimate || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 })
  }
}
