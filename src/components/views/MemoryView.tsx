"use client"

import { Badge } from "@/components/Badge"

const memoryCards = [
  { title: "Protected facts", body: "ICP, brand positioning, approved pricing guardrails, client contact data, committed scope." },
  { title: "Session summary", body: "Condensed chat context, problem statement, workflow pain, current tools, business size." },
  { title: "Decision log", body: "Founder approvals, rejected actions, selected workflow, handoff destination, next owner." },
  { title: "Handoff delta", body: "Only the difference needed by the next agent, so Planner does not re-read the full chat." },
  { title: "Stale facts", body: "Facts older than the policy window are flagged before they can enter prompt context." },
  { title: "Compression audit", body: "Every compaction stores source message range, output snapshot, model, token count, and risk note." },
]

export function MemoryView() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.9fr] gap-4 items-start">
      <section className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-[15px] font-bold">Context Compaction</h2>
            <p className="mt-0.5 text-xs text-muted">Memory is split into protected facts, session summary, decisions, and handoff delta.</p>
          </div>
          <Badge color="green">Protocol v0</Badge>
        </div>
        <div className="p-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {memoryCards.map(c => (
              <div key={c.title} className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] min-h-[150px]">
                <h3 className="m-0 mb-2 text-sm font-bold">{c.title}</h3>
                <p className="m-0 text-sm text-muted leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3">
          <h2 className="m-0 text-[15px] font-bold">Memory Policy</h2>
          <p className="mt-0.5 text-xs text-muted">Runtime guardrails for long consultation sessions.</p>
        </div>
        <div className="p-3.5 grid gap-3">
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2.5">
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Max raw messages before compaction</span><strong>18</strong></div>
            <div className="w-full h-2 rounded-full bg-[#e5ebe6] overflow-hidden"><span className="block h-full bg-gradient-to-r from-green to-blue rounded-full" style={{ width: "62%" }} /></div>
          </div>
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2.5">
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Protected fact overwrite</span><strong>Approval</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Session snapshot cadence</span><strong>Per handoff</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Long-term memory</span><strong>Lead scoped</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">RAG status</span><strong>Delayed</strong></div>
          </div>
        </div>
      </aside>
    </div>
  )
}
