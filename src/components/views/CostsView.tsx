"use client"

import { FileDown } from "lucide-react"
import { Badge } from "@/components/Badge"

const costData = [
  { agent: "Mind AI Consultant", sub: "Website intake", calls: 42, tokens: "188k", cost: "$3.18", quality: "Pass" },
  { agent: "Planner Manager", sub: "Proposal seed", calls: 11, tokens: "91k", cost: "$1.74", quality: "Review" },
  { agent: "Workflow Architect", sub: "Automation fit", calls: 9, tokens: "76k", cost: "$1.21", quality: "Pass" },
  { agent: "Orchestrator", sub: "Evidence gate", calls: 7, tokens: "38k", cost: "$0.83", quality: "Pass" },
]

export function CostsView() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.9fr] gap-4 items-start">
      <section className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-[15px] font-bold">Cost And Eval Console</h2>
            <p className="mt-0.5 text-xs text-muted">Track model calls by session, agent, workflow, token usage, and output quality.</p>
          </div>
          <button className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer"><FileDown size={17} /></button>
        </div>
        <div className="p-3.5">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Agent", "Calls", "Tokens", "Cost", "Quality"].map(h => (
                  <th key={h} className="border-b border-line p-2.5 text-left text-[11px] text-muted uppercase tracking-wider bg-[#fbfcfb]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costData.map((r, i) => (
                <tr key={i}>
                  <td className="border-b border-line p-2.5"><strong className="block">{r.agent}</strong><span className="text-muted text-xs">{r.sub}</span></td>
                  <td className="border-b border-line p-2.5">{r.calls}</td>
                  <td className="border-b border-line p-2.5">{r.tokens}</td>
                  <td className="border-b border-line p-2.5">{r.cost}</td>
                  <td className="border-b border-line p-2.5"><Badge color={r.quality === "Pass" ? "green" : "amber"}>{r.quality}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3">
          <h2 className="m-0 text-[15px] font-bold">Budget Guardrail</h2>
          <p className="mt-0.5 text-xs text-muted">Block runaway sessions before they become expensive.</p>
        </div>
        <div className="p-3.5 grid gap-3">
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2.5">
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Daily budget</span><strong>$25.00</strong></div>
            <div className="w-full h-2 rounded-full bg-[#e5ebe6] overflow-hidden"><span className="block h-full bg-gradient-to-r from-green to-blue rounded-full" style={{ width: "30%" }} /></div>
          </div>
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2.5">
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Per lead max</span><strong>$1.20</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Approval threshold</span><strong>$0.60</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Auto-stop on low confidence</span><strong>On</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Eval sample rate</span><strong>20%</strong></div>
          </div>
        </div>
      </aside>
    </div>
  )
}
