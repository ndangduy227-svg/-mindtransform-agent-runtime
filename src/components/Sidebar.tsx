"use client"

import { Bot, FileText, MessageCircle, Settings2, Workflow, MessagesSquare, Database, Table2, Gauge } from "lucide-react"

const mainNav = [
  { key: "projects", label: "Projects", icon: MessagesSquare },
  { key: "agents", label: "Agents", icon: Bot },
  { key: "workflows", label: "Workflows", icon: FileText },
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "runs", label: "Runs", icon: Workflow },
  { key: "costs", label: "Costs", icon: Gauge },
]

// Hidden but not deleted — toggle showLegacy to restore
const legacyNav = [
  { key: "config", label: "Config", icon: Settings2 },
  { key: "config-upload", label: "Config Upload", icon: Workflow },
  { key: "campaigns", label: "Campaigns", icon: MessagesSquare },
  { key: "sessions", label: "Sessions", icon: MessagesSquare },
  { key: "memory", label: "Memory", icon: Database },
  { key: "database", label: "Database", icon: Table2 },
  { key: "costs-legacy", label: "Costs (Legacy)", icon: Gauge },
]

const showLegacy = false

export function Sidebar({ activeView, onNavigate }: { activeView: string; onNavigate: (view: string) => void }) {
  return (
    <aside className="sticky top-0 h-screen border-r border-line bg-[#fbfcfa] p-4 flex flex-col gap-4 lg:w-[248px] w-[200px]">
      <div className="flex items-center gap-2.5 px-2 pb-2.5">
        <div className="w-[38px] h-[38px] rounded-[var(--radius)] grid place-items-center bg-[#142018] text-white font-extrabold text-sm">M</div>
        <div className="min-w-0">
          <strong className="block text-[15px] truncate">Mind Agent Center</strong>
          <span className="block text-xs text-muted truncate mt-0.5">v1 · Agent Runtime</span>
        </div>
      </div>

      <nav className="grid gap-1">
        {mainNav.map(({ key, label, icon: Icon }) => (
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

        {showLegacy && (
          <>
            <div className="h-px bg-line my-2" />
            <div className="px-2.5 text-[10px] text-muted uppercase tracking-wider mb-1">Legacy</div>
            {legacyNav.map(({ key, label, icon: Icon }) => (
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
          </>
        )}
      </nav>

      <div className="mt-auto border border-line rounded-[var(--radius)] p-3 bg-surface">
        <div className="text-[11px] text-muted uppercase tracking-wider">System</div>
        <strong className="block text-sm mt-1.5 mb-1">8 Agents · 8 Skills</strong>
        <p className="text-xs text-muted leading-relaxed m-0">Upload MD → Config → Chat with @workflow</p>
      </div>
    </aside>
  )
}
