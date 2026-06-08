import { NextRequest, NextResponse } from "next/server"
import { parseMd } from "@/lib/md-parser"

// POST - parse uploaded MD file content
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { content, filename } = body

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 })
    }

    const parsed = parseMd(content, filename)
    return NextResponse.json(parsed)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 })
  }
}
