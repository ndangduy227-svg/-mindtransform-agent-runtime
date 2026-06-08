import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET - list all campaigns (sessions with joined data)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        *,
        lead:leads (
          id, status, score, recommended_offer, pain_summary,
          organization:organizations ( id, name, industry, website ),
          contact:contacts ( id, name, email, phone )
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 })
  }
}

// POST - create a new campaign (org + contact + lead + session)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company, industry, website, contactName, contactEmail, contactPhone, problem, source } = body

    // 1. Create organization
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({ name: company || "Unknown", industry, website })
      .select().single()
    if (orgErr) throw orgErr

    // 2. Create contact
    const { data: contact, error: contactErr } = await supabase
      .from("contacts")
      .insert({
        organization_id: org.id,
        name: contactName || null,
        email: contactEmail || null,
        phone: contactPhone || null,
        source: source || "mind_ai",
      })
      .select().single()
    if (contactErr) throw contactErr

    // 3. Create lead
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        organization_id: org.id,
        contact_id: contact.id,
        status: "new",
        pain_summary: problem || null,
      })
      .select().single()
    if (leadErr) throw leadErr

    // 4. Create session
    const { data: session, error: sessErr } = await supabase
      .from("sessions")
      .insert({
        lead_id: lead.id,
        source: source || "website_mindai",
        status: "open",
        context: { company, industry, problem },
      })
      .select().single()
    if (sessErr) throw sessErr

    return NextResponse.json({
      session,
      lead,
      organization: org,
      contact,
    }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 })
  }
}
