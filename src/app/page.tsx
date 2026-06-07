"use client"

import { useState } from "react"
import { Bot, MessagesSquare, LockKeyhole, Wallet } from "lucide-react"
import { Sidebar } from "@/components/Sidebar"
import { Topbar } from "@/components/Topbar"
import { AgentsView } from "@/components/views/AgentsView"
import { ConfigView } from "@/components/views/ConfigView"
import { WorkflowsView } from "@/components/views/WorkflowsView"
import { SessionsView } from "@/components/views/SessionsView"
import { MemoryView } from "@/components/views/MemoryView"
import { DatabaseView } from "@/components/views/DatabaseView"
import { CostsView } from "@/components/views/CostsView"

const kpis = [
  { label: "Active agents", value: "8", delta: "5 production, 3 draft", icon: Bot },
  { label: "Open sessions", value: "24", delta: "6 waiting founder review", icon: MessagesSquare },
  { label: "Protected facts", value: "138", delta: "No stale critical facts", icon: LockKeyhole },
  { label: "Cost today", value: "$7.42", delta: "72% below guardrail", icon: Wallet },
]

const views: Record<string, React.ComponentType> = {
  agents: AgentsView,
  config: ConfigView,
  workflows: WorkflowsView,
  sessions: SessionsView,
  memory: MemoryView,
  database: DatabaseView,
  costs: CostsView,
}

export default function Home() {
  const [activeView, setActiveView] = useState("agents")
  const ViewComponent = views[activeView] || AgentsView

  return (
    <div className="grid grid-cols-[248px_1fr] min-h-screen">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="min-w-0 flex flex-col">
        <Topbar activeView={activeView} />
        <section className="w-full max-w-[1500px] mx-auto p-5 grid gap-4">
          <div className="grid grid-cols-4 gap-3">
            {kpis.map(k => (
              <div key={k.label} className="min-h-[108px] border border-line rounded-[var(--radius)] bg-surface p-3.5 flex flex-col justify-between shadow-[0_6px_20px_rgba(30,45,36,0.04)]">
                <div className="flex items-center justify-between gap-2 text-muted text-sm">
                  <span>{k.label}</span>
                  <k.icon size={17} />
                </div>
                <strong className="text-[28px] leading-none">{k.value}</strong>
                <span className="text-xs text-green">{k.delta}</span>
              </div>
            ))}
          </div>
          <ViewComponent />
        </section>
      </main>
    </div>
  )
}
