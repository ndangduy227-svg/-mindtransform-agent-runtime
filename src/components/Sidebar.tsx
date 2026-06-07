"use client"

import { Bot, Settings2, Workflow, MessagesSquare, Database, Table2, Gauge } from "lucide-react"

const navItems = [
  { key: "agents", label: "Agents", icon: Bot },
  { key: "config", label: "Config", icon: Settings2 },
  { key: "workflows", label: "Workflows", icon: Workflow },
  { key: "sessions", label: "Sessions", icon: MessagesSquare },
  { key: "memory", label: "Memory", icon: Database },
  { key: "database", label: "Database", icon: Table2 },
  { key: "costs", label: "Costs", icon: Gauge },
]

export function Sidebar({ activeView, onNavigate }: { activeView: string; onNavigate: (view: string) => void }) {
  return (
    <aside className="sticky top-0 h-screen border-r border-line bg-[#fbfcfa] p-4 flex flex-col gap-4 lg:w-[248px] w-[200px]">
      <div className="flex items-center gap-2.5 px-2 pb-2.5">
        <div className="w-[38px] h-[38px] rounded-[var(--radius)] grid place-items-center bg-[#142018] text-white font-extrabold text-sm">M</div>
        <div className="min-w-0">
          <strong className="block text-[15px] truncate">Mind Agent Center</strong>
          <span className="block text-xs text-muted truncate mt-0.5">Agent runtime v0</span>
        </div>
      </div>

      <nav className="grid gap-1">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`w-full min-h-[42px] border-0 rounded-[var(--radius)] flex items-center gap-2.5 px-2.5 text-left text-sm cursor-pointer transition-colors ${
              activeView === key ? "bg-[#17211b] text-white" : "bg-transparent text-[#344039] hover:bg-surface-2"
            }`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto border border-line rounded-[var(--radius)] p-3 bg-surface">
        <div className="text-[11px] text-muted uppercase tracking-wider">Current proof</div>
        <strong className="block text-[22px] mt-1.5 mb-1">MindAI → Proposal</strong>
        <p className="text-xs text-muted leading-relaxed m-0">Runtime session, consultant diagnosis, context snapshot, lead score, approval gate.</p>
      </div>
    </aside>
  )
}
