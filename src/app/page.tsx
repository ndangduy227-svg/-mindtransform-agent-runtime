"use client"

import { useState, useCallback } from "react"
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
import { agents as seedAgents, type Agent } from "@/lib/data"
import { AppContext } from "@/lib/store"

export default function Home() {
  const [activeView, setActiveView] = useState("agents")
  const [agents, setAgents] = useState<Agent[]>(seedAgents)

  const addAgent = useCallback((agent: Agent) => {
    setAgents(prev => [...prev, agent])
  }, [])

  const updateAgent = useCallback((id: string, updates: Partial<Agent>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }, [])

  const deleteAgent = useCallback((id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id))
  }, [])

  const prodCount = agents.filter(a => a.status === "production").length
  const draftCount = agents.filter(a => a.status !== "production").length

  const kpis = [
    { label: "Active agents", value: String(agents.length), delta: `${prodCount} production, ${draftCount} draft`, icon: Bot },
    { label: "Open sessions", value: "24", delta: "6 waiting founder review", icon: MessagesSquare },
    { label: "Protected facts", value: "138", delta: "No stale critical facts", icon: LockKeyhole },
    { label: "Cost today", value: "$7.42", delta: "72% below guardrail", icon: Wallet },
  ]

  return (
    <AppContext.Provider value={{ agents, addAgent, updateAgent, deleteAgent }}>
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
            {activeView === "agents" && <AgentsView />}
            {activeView === "config" && <ConfigView />}
            {activeView === "workflows" && <WorkflowsView />}
            {activeView === "sessions" && <SessionsView />}
            {activeView === "memory" && <MemoryView />}
            {activeView === "database" && <DatabaseView />}
            {activeView === "costs" && <CostsView />}
          </section>
        </main>
      </div>
    </AppContext.Provider>
  )
}
