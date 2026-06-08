import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"
import { chat, type ChatMessage } from "@/lib/llm"
import { consultantSystemPrompt } from "@/lib/agent-prompts"

// POST - send a message and get AI response
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // 1. Save user message
    const { data: userMsg, error: msgErr } = await supabase
      .from("session_messages")
      .insert({
        session_id: id,
        role: body.role || "user",
        content: body.content,
        token_estimate: body.token_estimate || null,
      })
      .select()
      .single()

    if (msgErr) throw msgErr

    // 2. If user message, generate AI response
    if (body.role === "user" || !body.role) {
      // Fetch session context
      const { data: session } = await supabase
        .from("sessions")
        .select(`
          *,
          lead:leads (
            score, pain_summary,
            organization:organizations ( name, industry )
          )
        `)
        .eq("id", id)
        .single()

      // Fetch conversation history
      const { data: history } = await supabase
        .from("session_messages")
        .select("role, content")
        .eq("session_id", id)
        .order("created_at", { ascending: true })
        .limit(20)

      // Build LLM messages
      const systemPrompt = consultantSystemPrompt({
        company: session?.lead?.organization?.name || session?.context?.company,
        industry: session?.lead?.organization?.industry || session?.context?.industry,
        problem: session?.lead?.pain_summary || session?.context?.problem,
        leadScore: session?.lead?.score,
        previousMessages: history?.length || 0,
      })

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...(history || []).map((m: { role: string; content: string }) => ({
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
        })),
      ]

      // Call LLM
      const llmResponse = await chat(messages)

      // Save AI response
      const { data: aiMsg, error: aiErr } = await supabase
        .from("session_messages")
        .insert({
          session_id: id,
          role: "assistant",
          content: llmResponse.content,
          token_estimate: (llmResponse.prompt_tokens || 0) + (llmResponse.completion_tokens || 0),
        })
        .select()
        .single()

      if (aiErr) throw aiErr

      // Log model call for cost tracking
      await supabase.from("model_calls").insert({
        session_id: id,
        provider: llmResponse.provider,
        model: llmResponse.model,
        prompt_tokens: llmResponse.prompt_tokens || 0,
        completion_tokens: llmResponse.completion_tokens || 0,
        cost_usd: 0, // Groq is free / Gemini free tier
        status: "completed",
      })

      return NextResponse.json({
        userMessage: userMsg,
        aiMessage: aiMsg,
        provider: llmResponse.provider,
        model: llmResponse.model,
      }, { status: 201 })
    }

    // Non-user messages (system notes, etc.) — just save, no AI response
    return NextResponse.json(userMsg, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}
