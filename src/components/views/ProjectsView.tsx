"use client"

import { useState } from "react"
import { useFetch } from "@/lib/hooks"
import { Badge } from "@/components/Badge"
import { Plus, FolderOpen, Archive, RefreshCw, X } from "lucide-react"

interface ProjectRow {
  id: string
  name: string
  objective: string | null
  industry: string | null
  workflow: string | null
  latest_run_status: string | null
  current_node: string | null
  total_tokens: number
  total_cost: number
  updated_at: string
}

const fmtTok = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

export function ProjectsView({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, loading, refetch } = useFetch<ProjectRow[]>("/api/projects")
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "", objective: "", industry: "", workflow: "wf_01_the_mind_flow" })
  const [creating, setCreating] = useState(false)

  // Build brief §4: project is ONLY created on submit. Cancel/close = no rows.
  async function createProject() {
    if (!form.name.trim()) return
    setCreating(true)
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setCreating(false)
    if (res.ok) {
      const { project } = await res.json()
      setShowModal(false)
      setForm({ name: "", objective: "", industry: "", workflow: "wf_01_the_mind_flow" })
      onOpen(project.id)
    }
  }

  async function archive(id: string) {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    })
    refetch()
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowModal(true)}
          className="h-[42px] px-5 rounded-[var(--radius)] bg-[#17211b] text-white inline-flex items-center gap-2 text-sm cursor-pointer"
        >
          <Plus size={17} /> New Chat / New Project
        </button>
        <button onClick={refetch} className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-surface-2">
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <section className="border border-line rounded-[var(--radius)] bg-surface overflow-hidden">
        <div className="p-3.5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Project", "Workflow", "Trạng thái", "Node hiện tại", "Tokens", "Cost", "Cập nhật", ""].map(h => (
                  <th key={h} className="border-b border-line p-2.5 text-left text-[11px] text-muted uppercase tracking-wider bg-[#fbfcfb]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map(p => (
                <tr key={p.id} className="hover:bg-surface-2 cursor-pointer" onClick={() => onOpen(p.id)}>
                  <td className="border-b border-line p-2.5">
                    <strong className="block">{p.name}</strong>
                    <span className="text-muted text-xs">{p.objective?.slice(0, 60) ?? p.industry ?? ""}</span>
                  </td>
                  <td className="border-b border-line p-2.5 text-xs text-muted">{p.workflow === "wf_01_the_mind_flow" ? "The Mind Flow" : p.workflow ?? "—"}</td>
                  <td className="border-b border-line p-2.5">{p.latest_run_status ? <Badge color={statusColor(p.latest_run_status)}>{p.latest_run_status}</Badge> : <span className="text-muted text-xs">chưa chạy</span>}</td>
                  <td className="border-b border-line p-2.5 text-xs">{p.current_node ?? "—"}</td>
                  <td className="border-b border-line p-2.5">{fmtTok(p.total_tokens)}</td>
                  <td className="border-b border-line p-2.5">${p.total_cost.toFixed(4)}</td>
                  <td className="border-b border-line p-2.5 text-xs text-muted">{new Date(p.updated_at).toLocaleDateString()}</td>
                  <td className="border-b border-line p-2.5">
                    <button onClick={e => { e.stopPropagation(); archive(p.id) }} title="Archive" className="w-8 h-8 border border-line rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-surface-2">
                      <Archive size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && (data ?? []).length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted text-sm">
                  <FolderOpen size={28} className="mx-auto mb-2 opacity-40" />
                  Chưa có project. Bấm &quot;New Chat / New Project&quot; để bắt đầu.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* New Project modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 grid place-items-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-line rounded-[var(--radius)] p-6 w-full max-w-md grid gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-lg font-bold">Tạo project</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 grid place-items-center cursor-pointer text-muted hover:text-ink"><X size={18} /></button>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-muted uppercase tracking-wider">Tên project *</span>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-[40px] border border-line rounded-[var(--radius)] px-3 bg-white" placeholder="Spa Booking CRM" autoFocus />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-muted uppercase tracking-wider">Objective</span>
              <textarea value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} className="border border-line rounded-[var(--radius)] px-3 py-2 bg-white min-h-[70px]" placeholder="Giải quyết bài toán gì..." />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-muted uppercase tracking-wider">Ngành / Khách hàng</span>
              <input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} className="h-[40px] border border-line rounded-[var(--radius)] px-3 bg-white" placeholder="Spa, Gara ô tô…" />
            </label>
            <div className="grid gap-1 text-sm">
              <span className="text-xs text-muted uppercase tracking-wider">Workflow</span>
              <label className="flex items-center gap-2.5 border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] cursor-pointer">
                <input type="checkbox" checked readOnly className="accent-[#17211b]" />
                <div>
                  <strong className="block text-sm">The Mind Flow</strong>
                  <span className="text-xs text-muted">Research → Plan → Approval → Build → Evidence → Blog → Publish (v1)</span>
                </div>
              </label>
            </div>
            <button
              onClick={createProject}
              disabled={creating || !form.name.trim()}
              className="h-[42px] rounded-[var(--radius)] bg-[#17211b] text-white text-sm font-medium cursor-pointer disabled:opacity-40"
            >
              {creating ? "Đang tạo…" : "Tạo project + chat"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function statusColor(s: string): "green" | "amber" | "red" | "blue" | "gray" {
  if (s === "done" || s === "success") return "green"
  if (s === "awaiting_approval" || s === "running" ) return s === "running" ? "blue" : "amber"
  if (s === "failed") return "red"
  if (s === "rejected") return "gray"
  return "gray"
}
