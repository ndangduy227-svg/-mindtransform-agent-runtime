"use client"

import { useState } from "react"
import { Search, SlidersHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { Badge, statusBadgeColor } from "@/components/Badge"
import { CreateAgentModal } from "@/components/CreateAgentModal"
import { useApp } from "@/lib/store"
import type { Agent } from "@/lib/data"

export function AgentsView() {
  const { agents, addAgent, updateAgent, deleteAgent } = useApp()
  const [selectedId, setSelectedId] = useState(agents[0]?.id || "")
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [editAgent, setEditAgent] = useState<Agent | undefined>()

  const filtered = agents
    .filter(a => filter === "all" || a.status === filter)
    .filter(a => !query || [a.name, a.role, a.scope, a.policy, a.owner].join(" ").toLowerCase().includes(query.toLowerCase()))

  const agent = agents.find(a => a.id === selectedId) || agents[0]

  const handleSave = (saved: Agent) => {
    if (editAgent) {
      updateAgent(saved.id, saved)
    } else {
      addAgent(saved)
      setSelectedId(saved.id)
    }
    setShowCreate(false)
    setEditAgent(undefined)
  }

  const handleDelete = (id: string) => {
    if (!confirm("Delete this agent?")) return
    deleteAgent(id)
    if (selectedId === id) setSelectedId(agents.find(a => a.id !== id)?.id || "")
  }

  return (
    <>
      {(showCreate || editAgent) && (
        <CreateAgentModal
          editAgent={editAgent}
          onClose={() => { setShowCreate(false); setEditAgent(undefined) }}
          onSave={handleSave}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.9fr] gap-4 items-start">
        <section className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
          <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-[15px] font-bold">Agent Registry</h2>
              <p className="mt-0.5 text-xs text-muted">Versioned role, SOW, input contract, output contract, tool policy.</p>
            </div>
            <div className="flex gap-1.5">
              <button className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer"><SlidersHorizontal size={17} /></button>
              <button onClick={() => setShowCreate(true)} className="h-[38px] border border-[#17211b] bg-[#17211b] text-white rounded-[var(--radius)] inline-flex items-center gap-2 px-3 cursor-pointer text-sm"><Plus size={17} /><span>New agent</span></button>
            </div>
          </div>
          <div className="p-3.5">
            <div className="flex items-center justify-between gap-2.5 mb-3 flex-wrap">
              <label className="relative flex-1 min-w-[280px]">
                <Search size={17} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input value={query} onChange={e => setQuery(e.target.value)} type="search" placeholder="Search agent, skill, owner..." className="w-full h-[38px] border border-line rounded-[var(--radius)] pl-9 pr-3 bg-[#fbfcfb] outline-none focus:border-green focus:ring-2 focus:ring-green/15 text-sm" />
              </label>
              <div className="inline-grid grid-flow-col border border-line rounded-[var(--radius)] overflow-hidden bg-[#fbfcfb] h-[38px]">
                {["all", "production", "draft"].map(s => (
                  <button key={s} onClick={() => setFilter(s)} className={`border-0 border-r border-line last:border-r-0 min-w-[74px] px-3 text-sm cursor-pointer ${filter === s ? "bg-[#17211b] text-white" : "bg-transparent text-muted"}`}>
                    {s === "all" ? "All" : s === "production" ? "Live" : "Draft"}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-line p-2.5 text-left text-[11px] text-muted uppercase tracking-wider bg-[#fbfcfb] w-[28%]">Agent</th>
                    <th className="border-b border-line p-2.5 text-left text-[11px] text-muted uppercase tracking-wider bg-[#fbfcfb] w-[24%]">Role</th>
                    <th className="border-b border-line p-2.5 text-left text-[11px] text-muted uppercase tracking-wider bg-[#fbfcfb] w-[20%]">Scope</th>
                    <th className="border-b border-line p-2.5 text-left text-[11px] text-muted uppercase tracking-wider bg-[#fbfcfb] w-[14%]">Policy</th>
                    <th className="border-b border-line p-2.5 text-left text-[11px] text-muted uppercase tracking-wider bg-[#fbfcfb] w-[14%]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} onClick={() => setSelectedId(a.id)} className={`cursor-pointer hover:bg-[#f8faf8] ${a.id === selectedId ? "bg-green-soft" : ""}`}>
                      <td className="border-b border-line p-2.5"><strong className="block text-sm mb-0.5">{a.name}</strong><span className="text-muted text-xs">{a.id}</span></td>
                      <td className="border-b border-line p-2.5">{a.role}</td>
                      <td className="border-b border-line p-2.5">{a.scope}</td>
                      <td className="border-b border-line p-2.5"><Badge color="blue">{a.policy}</Badge></td>
                      <td className="border-b border-line p-2.5"><Badge color={statusBadgeColor(a.status)}>{a.status === "production" ? "Production" : a.status === "draft" ? "Draft" : "Paused"}</Badge></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={5} className="p-4 text-muted text-center">No agents match this filter.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {agent && (
          <aside className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
            <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="m-0 text-[15px] font-bold">{agent.name}</h2>
                <p className="mt-0.5 text-xs text-muted">{agent.role} | Owner: {agent.owner} | Model: {agent.model}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setEditAgent(agent)} className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-surface-2"><Pencil size={17} /></button>
                <button onClick={() => handleDelete(agent.id)} className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-red-soft text-red"><Trash2 size={17} /></button>
              </div>
            </div>
            <div className="p-3.5 grid gap-3">
              <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
                <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Mission</h3>
                <p className="m-0 text-sm leading-relaxed">{agent.mission}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
                  <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">SOW In Scope</h3>
                  <ul className="m-0 pl-4 text-sm leading-relaxed">{agent.sowIn.map((s, i) => <li key={i} className="mt-1 first:mt-0">{s}</li>)}</ul>
                </div>
                <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
                  <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">SOW Out Of Scope</h3>
                  <ul className="m-0 pl-4 text-sm leading-relaxed">{agent.sowOut.map((s, i) => <li key={i} className="mt-1 first:mt-0">{s}</li>)}</ul>
                </div>
              </div>
              <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
                <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Input Contract</h3>
                <div className="flex flex-wrap gap-1.5">{agent.inputs.map(c => <span key={c} className="border border-line bg-[#fbfcfb] rounded-full px-2 py-1 text-xs text-[#425047]">{c}</span>)}</div>
              </div>
              <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
                <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Output Contract</h3>
                <div className="flex flex-wrap gap-1.5">{agent.outputs.map(c => <span key={c} className="border border-line bg-[#fbfcfb] rounded-full px-2 py-1 text-xs text-[#425047]">{c}</span>)}</div>
              </div>
              <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2.5">
                <div className="flex justify-between items-center text-sm"><span className="text-muted">Approval policy</span><strong>{agent.policy}</strong></div>
                <div className="flex justify-between items-center text-sm"><span className="text-muted">Memory policy</span><strong>Protected facts + handoff delta</strong></div>
                <div className="flex justify-between items-center text-sm"><span className="text-muted">Tool access</span><strong>Scoped by role</strong></div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </>
  )
}
