"use client"

import { Badge } from "@/components/Badge"

const dbGroups = [
  { title: "Identity", tables: ["organizations", "contacts", "leads"] },
  { title: "Agents", tables: ["agents", "agent_versions", "agent_skills", "agent_tool_permissions"] },
  { title: "Workflows", tables: ["workflows", "workflow_versions", "workflow_steps", "workflow_runs", "workflow_run_events"] },
  { title: "Sessions", tables: ["sessions", "session_messages", "handoffs", "lead_qualification"] },
  { title: "Memory", tables: ["context_snapshots", "memory_items", "protected_facts"] },
  { title: "Tools and Cost", tables: ["tools", "tool_calls", "approval_requests", "model_calls", "cost_events", "eval_runs"] },
]

export function DatabaseView() {
  return (
    <div className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
      <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-[15px] font-bold">Runtime Database</h2>
          <p className="mt-0.5 text-xs text-muted">Separate database for agents, workflows, sessions, memory, tools, costs, and evals.</p>
        </div>
        <Badge color="blue">Supabase Postgres</Badge>
      </div>
      <div className="p-3.5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {dbGroups.map(g => (
            <div key={g.title} className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] min-h-[142px]">
              <h3 className="m-0 mb-2 text-sm font-bold">{g.title}</h3>
              <div>{g.tables.map(t => <code key={t} className="inline-block mr-1.5 mb-1.5 px-1.5 py-1 rounded-md bg-[#eef2ef] text-[#344039] text-xs break-all">{t}</code>)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
