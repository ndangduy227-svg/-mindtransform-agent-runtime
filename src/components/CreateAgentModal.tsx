"use client"

import { useState } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import type { Agent } from "@/lib/data"

const emptyAgent: Omit<Agent, "id"> = {
  name: "",
  role: "",
  scope: "",
  status: "draft",
  policy: "",
  owner: "Founder",
  model: "Balanced",
  mission: "",
  sowIn: [""],
  sowOut: [""],
  inputs: [""],
  outputs: [""],
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs text-muted uppercase tracking-wider">{label}</label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5">
          <input value={item} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n) }} className="flex-1 h-[34px] border border-line rounded-[var(--radius)] px-2.5 bg-white text-sm outline-none focus:border-green" placeholder={`Item ${i + 1}`} />
          {items.length > 1 && <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="w-[34px] h-[34px] border border-line rounded-[var(--radius)] grid place-items-center text-red hover:bg-red-soft cursor-pointer"><Trash2 size={14} /></button>}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="h-[30px] border border-dashed border-line rounded-[var(--radius)] text-xs text-muted hover:bg-surface-2 cursor-pointer flex items-center justify-center gap-1"><Plus size={12} /> Add</button>
    </div>
  )
}

export function CreateAgentModal({ onClose, onSave, editAgent }: { onClose: () => void; onSave: (agent: Agent) => void; editAgent?: Agent }) {
  const [form, setForm] = useState<Omit<Agent, "id">>(editAgent ? { ...editAgent } : { ...emptyAgent, sowIn: [""], sowOut: [""], inputs: [""], outputs: [""] })

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const id = editAgent?.id || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    const clean = (arr: string[]) => arr.filter(s => s.trim())
    onSave({
      ...form,
      id,
      sowIn: clean(form.sowIn),
      sowOut: clean(form.sowOut),
      inputs: clean(form.inputs),
      outputs: clean(form.outputs),
    })
  }

  const inputClass = "w-full h-[38px] border border-line rounded-[var(--radius)] px-2.5 bg-white text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/15"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()} className="w-full max-w-[720px] max-h-[85vh] overflow-y-auto bg-surface border border-line rounded-[var(--radius)] shadow-[var(--shadow)]">
        <div className="sticky top-0 z-10 min-h-[56px] border-b border-line px-4 py-3 flex items-center justify-between gap-3 bg-surface">
          <h2 className="m-0 text-[15px] font-bold">{editAgent ? `Edit ${editAgent.name}` : "Create New Agent"}</h2>
          <button type="button" onClick={onClose} className="w-[34px] h-[34px] border border-line rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-surface-2"><X size={17} /></button>
        </div>

        <div className="p-4 grid gap-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs text-muted uppercase tracking-wider">Agent Name *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} className={inputClass} placeholder="Mind AI Consultant" required />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs text-muted uppercase tracking-wider">Role</label>
              <input value={form.role} onChange={e => set("role", e.target.value)} className={inputClass} placeholder="Customer-facing diagnosis" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Mission</label>
            <textarea value={form.mission} onChange={e => set("mission", e.target.value)} className="w-full min-h-[80px] border border-line rounded-[var(--radius)] px-2.5 py-2 bg-white text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/15 resize-y" placeholder="What this agent does and why..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs text-muted uppercase tracking-wider">Scope</label>
              <input value={form.scope} onChange={e => set("scope", e.target.value)} className={inputClass} placeholder="Intake, diagnosis, recommendation" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs text-muted uppercase tracking-wider">Policy</label>
              <input value={form.policy} onChange={e => set("policy", e.target.value)} className={inputClass} placeholder="Approval before proposal" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs text-muted uppercase tracking-wider">Owner</label>
              <input value={form.owner} onChange={e => set("owner", e.target.value)} className={inputClass} placeholder="Founder" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs text-muted uppercase tracking-wider">Model</label>
              <select value={form.model} onChange={e => set("model", e.target.value)} className={inputClass}>
                <option>Fast reasoning</option>
                <option>Reasoning</option>
                <option>Balanced</option>
                <option>Tool capable</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs text-muted uppercase tracking-wider">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value as Agent["status"])} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="production">Production</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          {/* SOW */}
          <div className="grid grid-cols-2 gap-3">
            <ListEditor label="SOW In Scope" items={form.sowIn} onChange={v => set("sowIn", v)} />
            <ListEditor label="SOW Out Of Scope" items={form.sowOut} onChange={v => set("sowOut", v)} />
          </div>

          {/* Contracts */}
          <div className="grid grid-cols-2 gap-3">
            <ListEditor label="Input Contract" items={form.inputs} onChange={v => set("inputs", v)} />
            <ListEditor label="Output Contract" items={form.outputs} onChange={v => set("outputs", v)} />
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-line px-4 py-3 flex justify-end gap-2 bg-surface">
          <button type="button" onClick={onClose} className="h-[38px] border border-line bg-surface rounded-[var(--radius)] px-4 text-sm cursor-pointer hover:bg-surface-2">Cancel</button>
          <button type="submit" className="h-[38px] border border-[#17211b] bg-[#17211b] text-white rounded-[var(--radius)] px-4 text-sm cursor-pointer">{editAgent ? "Save Changes" : "Create Agent"}</button>
        </div>
      </form>
    </div>
  )
}
