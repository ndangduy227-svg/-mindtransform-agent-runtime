"use client"

import { Play } from "lucide-react"
import { workflowSteps, runEvents } from "@/lib/data"
import { Badge, statusBadgeColor } from "@/components/Badge"

export function WorkflowsView() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.9fr] gap-4 items-start">
      <section className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-[15px] font-bold">Workflow Registry</h2>
            <p className="mt-0.5 text-xs text-muted">First proof workflow for Mindtransform Agent Runtime.</p>
          </div>
          <button className="h-[38px] border border-line bg-surface rounded-[var(--radius)] inline-flex items-center gap-2 px-3 cursor-pointer text-sm"><Play size={17} /><span>Run</span></button>
        </div>
        <div className="p-3.5 grid gap-2.5">
          {workflowSteps.map((step, i) => (
            <article key={i} className="grid grid-cols-[42px_1fr_auto] gap-3 items-start border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
              <div className="w-[34px] h-[34px] rounded-[var(--radius)] grid place-items-center bg-[#17211b] text-white font-bold text-sm">{i + 1}</div>
              <div>
                <h3 className="m-0 text-sm font-bold">{step.title}</h3>
                <p className="m-0 text-sm text-muted leading-relaxed">{step.body}</p>
                <div className="mt-2 text-xs text-muted">Owner: {step.owner}</div>
              </div>
              <Badge color={i < 2 ? "green" : i < 4 ? "blue" : "amber"}>{step.badge}</Badge>
            </article>
          ))}
        </div>
      </section>

      <aside className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-[15px] font-bold">Run Trace</h2>
            <p className="mt-0.5 text-xs text-muted">Each step writes evidence, cost, and approval status.</p>
          </div>
          <Badge color="amber">Founder review</Badge>
        </div>
        <div className="p-3.5">
          <div className="border border-line rounded-[var(--radius)] overflow-hidden bg-[#fbfcfb]">
            {runEvents.map((ev, i) => (
              <div key={i} className="grid grid-cols-[126px_1fr_auto] gap-3 p-3 border-b border-line last:border-b-0 items-start text-sm">
                <time className="text-xs text-muted whitespace-nowrap">{ev[0]}</time>
                <div><strong className="block mb-0.5">{ev[1]}</strong><span className="text-muted">{ev[2]}</span></div>
                <Badge color={statusBadgeColor(ev[3])}>{ev[3]}</Badge>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
