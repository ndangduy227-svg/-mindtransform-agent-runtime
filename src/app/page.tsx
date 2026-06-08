"use client"

import { useState, useCallback } from "react"
import { Sidebar } from "@/components/Sidebar"
import { Topbar } from "@/components/Topbar"

// New clean views
import { AgentsConfigView } from "@/components/views/AgentsConfigView"
import { WorkflowsUploadView } from "@/components/views/WorkflowsUploadView"
import { ChatView } from "@/components/views/ChatView"

// Legacy views (hidden, not deleted)
import { AgentsView } from "@/components/views/AgentsView"
import { ConfigView } from "@/components/views/ConfigView"
import { WorkflowsView } from "@/components/views/WorkflowsView"
import { SessionsView } from "@/components/views/SessionsView"
import { MemoryView } from "@/components/views/MemoryView"
import { DatabaseView } from "@/components/views/DatabaseView"
import { CostsView } from "@/components/views/CostsView"
import { CampaignChatView } from "@/components/views/CampaignChatView"
import { ConfigUploadView } from "@/components/views/ConfigUploadView"
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

  return (
    <AppContext.Provider value={{ agents, addAgent, updateAgent, deleteAgent }}>
      <div className="grid grid-cols-[248px_1fr] min-h-screen">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <main className="min-w-0 flex flex-col">
          <Topbar activeView={activeView} />
          <section className="w-full max-w-[1500px] mx-auto p-5">
            {/* ── New clean views ── */}
            {activeView === "agents" && <AgentsConfigView />}
            {activeView === "workflows" && <WorkflowsUploadView />}
            {activeView === "chat" && <ChatView />}

            {/* ── Legacy views (accessible if showLegacy toggled in Sidebar) ── */}
            {activeView === "agents-legacy" && <AgentsView />}
            {activeView === "config" && <ConfigView />}
            {activeView === "config-upload" && <ConfigUploadView />}
            {activeView === "campaigns" && <CampaignChatView />}
            {activeView === "workflows-legacy" && <WorkflowsView />}
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
