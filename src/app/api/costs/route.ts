import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/api-error"

// GET — aggregate cost/token metrics from model_calls (real schema)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("model_calls")
      .select("provider, model, prompt_tokens, completion_tokens, cost_usd, status, created_at")
      .order("created_at", { ascending: false })
      .limit(1000)

    if (error) throw error
    const rows = data ?? []

    const totalCost = sum(rows.map(r => Number(r.cost_usd) || 0))
    const totalIn = sum(rows.map(r => r.prompt_tokens || 0))
    const totalOut = sum(rows.map(r => r.completion_tokens || 0))

    // group by provider
    const byProvider: Record<string, { calls: number; tokens: number; cost: number }> = {}
    for (const r of rows) {
      const p = r.provider || "unknown"
      byProvider[p] ??= { calls: 0, tokens: 0, cost: 0 }
      byProvider[p].calls += 1
      byProvider[p].tokens += (r.prompt_tokens || 0) + (r.completion_tokens || 0)
      byProvider[p].cost += Number(r.cost_usd) || 0
    }

    // group by day (last 14)
    const byDay: Record<string, number> = {}
    for (const r of rows) {
      const day = (r.created_at || "").slice(0, 10)
      if (!day) continue
      byDay[day] = (byDay[day] || 0) + (Number(r.cost_usd) || 0)
    }

    return NextResponse.json({
      totals: { calls: rows.length, costUsd: round(totalCost), tokensIn: totalIn, tokensOut: totalOut },
      byProvider: Object.entries(byProvider).map(([provider, v]) => ({
        provider, calls: v.calls, tokens: v.tokens, cost: round(v.cost),
      })),
      byDay: Object.entries(byDay).sort().slice(-14).map(([day, cost]) => ({ day, cost: round(cost) })),
      recent: rows.slice(0, 20),
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 })
  }
}

function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0) }
function round(n: number) { return Math.round(n * 1e6) / 1e6 }
