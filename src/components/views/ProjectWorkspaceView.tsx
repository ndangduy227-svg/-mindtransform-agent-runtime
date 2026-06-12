"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Badge } from "@/components/Badge"
import { statusColor } from "./ProjectsView"
import { ArrowLeft, Send, Play, Check, X, RefreshCw } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Workspace {
  project: { id: string; name: string; objective: string | null; industry: string | null }
  workflow: { workflow_key: string; workflow_version: string } | null
  sessionId: string | null
  messages: { id: string; role: string; content: string; created_at: string }[]
  runs: { id: string; status: string; current_node: string | null; output: any; started_at: string }[]
  latestRunId: string | null
  nodeRuns: { node_id: string; status: string; retry_count: number; output_summary: any; error: any; started_at: string; finished_at: string | null }[]
  events: { type: string; payload: any; created_at: string }[]
  pendingApprovals: { id: string; run_id: string; payload: any; created_at: string }[]
  usage: {
    total: { calls: number; tokens: number; cost: number }
    chat: { calls: number; tokens: number; cost: number }
    workflow: { calls: number; tokens: number; cost: number }
    byNode: { node: string; calls: number; tokens: number; cost: number }[]
    recent: any[]
  }
}

// The Mind Flow v1 — display order (brief §6; keep in sync with engine MIND_FLOW_NODES)
const FLOW_NODES = [
  "project_intake", "research", "workflow_plan", "scope_approval",
  "lark_build", "lark_verify", "evidence_capture", "docs_and_blog",
  "artifact_claim_gate", "publish_approval", "publish_strategy",
  "public_verify", "receipt_and_handoff",
]
const fmtTok = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

export function ProjectWorkspaceView({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const [ws, setWs] = useState<Workspace | null>(null)
  const [tab, setTab] = useState<"chat" | "graph" | "outputs" | "usage">("chat")
  const [msg, setMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [inspect, setInspect] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`)
    if (res.ok) setWs(await res.json())
  }, [projectId])

  useEffect(() => { load() }, [load])
  // poll while a run is active so Graph/Approval update live
  useEffect(() => {
    const active = ws?.runs?.[0]?.status === "running" || ws?.runs?.[0]?.status === "awaiting_approval"
    if (!active) return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [ws?.runs, load])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [ws?.messages?.length])

  async function send() {
    if (!msg.trim() || sending) return
    setSending(true)
    await fetch(`/api/projects/${projectId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    })
    setMsg("")
    await load()
    setSending(false)
  }

  async function startRun() {
    await fetch(`/api/projects/${projectId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vertical: ws?.project.industry || ws?.project.name }),
    })
    await load()
    setTab("graph")
  }

  async function decide(approvalId: string, runId: string, decision: "approve" | "reject") {
    await fetch(`/api/approvals/${approvalId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, runId }),
    })
    await load()
  }

  if (!ws) return <p className="text-muted text-sm">Đang tải workspace…</p>

  const latestRun = ws.runs[0]
  const nodeStatus = (n: string) => ws.nodeRuns.find(r => r.node_id === n)

  return (
    <div className="grid gap-4">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-surface-2"><ArrowLeft size={17} /></button>
          <div>
            <strong className="block text-base">{ws.project.name}</strong>
            <span className="text-xs text-muted">The Mind Flow · {latestRun ? <Badge color={statusColor(latestRun.status)}>{latestRun.status}</Badge> : "chưa chạy"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={startRun} className="h-[38px] px-4 rounded-[var(--radius)] bg-[#17211b] text-white inline-flex items-center gap-2 text-sm cursor-pointer"><Play size={15} /> Chạy The Mind Flow</button>
          <button onClick={load} className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-surface-2"><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* approval banner */}
      {ws.pendingApprovals.map(a => (
        <div key={a.id} className="border border-amber/40 bg-amber-soft rounded-[var(--radius)] p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <strong className="block text-sm">⏸ Chờ duyệt: {a.payload?.summary ?? "Workflow approval"}</strong>
            <span className="text-xs text-muted">Graph đang pause — chỉ chạy tiếp khi bạn quyết định.</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => decide(a.id, a.run_id, "approve")} className="h-[36px] px-4 rounded-[var(--radius)] bg-green-soft text-green border border-green/30 inline-flex items-center gap-1.5 text-sm cursor-pointer"><Check size={15} /> Approve</button>
            <button onClick={() => decide(a.id, a.run_id, "reject")} className="h-[36px] px-4 rounded-[var(--radius)] bg-red-soft text-red border border-red/30 inline-flex items-center gap-1.5 text-sm cursor-pointer"><X size={15} /> Reject</button>
          </div>
        </div>
      ))}

      {/* tabs */}
      <div className="flex gap-1 border-b border-line">
        {(["chat", "graph", "outputs", "usage"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm capitalize cursor-pointer border-b-2 -mb-px ${tab === t ? "border-[#17211b] font-semibold" : "border-transparent text-muted hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* CHAT */}
      {tab === "chat" && (
        <section className="border border-line rounded-[var(--radius)] bg-surface flex flex-col" style={{ minHeight: 420 }}>
          <div className="flex-1 p-4 grid gap-3 content-start overflow-y-auto" style={{ maxHeight: 480 }}>
            {ws.messages.map(m => (
              <div key={m.id} className={`max-w-[78%] rounded-[var(--radius)] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-[#17211b] text-white justify-self-end" : "bg-[#f1f4f1] justify-self-start"}`}>
                {m.content}
                <div className={`text-[10px] mt-1 ${m.role === "user" ? "text-white/50" : "text-muted"}`}>{new Date(m.created_at).toLocaleTimeString()}</div>
              </div>
            ))}
            {ws.messages.length === 0 && <p className="text-muted text-sm m-0">Giao use case cho agent — ví dụ: &quot;Spa 3 chi nhánh chase báo cáo qua Zalo&quot;.</p>}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-line p-3 flex gap-2">
            <textarea value={msg} onChange={e => setMsg(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
              className="flex-1 border border-line rounded-[var(--radius)] px-3 py-2 text-sm bg-white resize-none" rows={2} placeholder="Nhắn cho agent… (Enter để gửi)" />
            <button onClick={send} disabled={sending} className="w-[44px] rounded-[var(--radius)] bg-[#17211b] text-white grid place-items-center cursor-pointer disabled:opacity-40"><Send size={17} /></button>
          </div>
        </section>
      )}

      {/* GRAPH */}
      {tab === "graph" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-4 items-start">
          <section className="border border-line rounded-[var(--radius)] bg-surface p-4 grid gap-2">
            {FLOW_NODES.map((n, i) => {
              const nr = nodeStatus(n)
              const status = nr?.status ?? "pending"
              const isCurrent = latestRun?.current_node === n && latestRun?.status === "running"
              return (
                <div key={n}>
                  <button onClick={() => setInspect(n)}
                    className={`w-full text-left border rounded-[var(--radius)] p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isCurrent ? "border-blue bg-blue-soft" : inspect === n ? "border-[#17211b]" : "border-line bg-[#fbfcfb] hover:bg-surface-2"}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-white border border-line grid place-items-center text-xs font-bold">{i + 1}</span>
                      <div>
                        <strong className="block text-sm">{n}</strong>
                        {nr?.retry_count ? <span className="text-[11px] text-amber">retry ×{nr.retry_count}</span> : null}
                      </div>
                    </div>
                    <Badge color={status === "pending" ? "gray" : statusColor(status)}>{status}</Badge>
                  </button>
                  {i < FLOW_NODES.length - 2 && <div className="w-px h-3 bg-line ml-[26px]" />}
                </div>
              )
            })}
          </section>

          {/* inspector */}
          <aside className="border border-line rounded-[var(--radius)] bg-surface overflow-hidden sticky top-24">
            <div className="min-h-[52px] border-b border-line px-3.5 py-3"><h2 className="m-0 text-[15px] font-bold">Node inspector{inspect ? `: ${inspect}` : ""}</h2></div>
            <div className="p-3.5 grid gap-3 text-sm">
              {!inspect && <p className="text-muted m-0">Click 1 node để xem chi tiết.</p>}
              {inspect && (() => {
                const nr = nodeStatus(inspect)
                if (!nr) return <p className="text-muted m-0">Node chưa chạy trong run gần nhất.</p>
                return (
                  <>
                    <div className="flex justify-between"><span className="text-muted">Status</span><Badge color={statusColor(nr.status)}>{nr.status}</Badge></div>
                    <div className="flex justify-between"><span className="text-muted">Bắt đầu</span><span>{new Date(nr.started_at).toLocaleTimeString()}</span></div>
                    {nr.finished_at && <div className="flex justify-between"><span className="text-muted">Kết thúc</span><span>{new Date(nr.finished_at).toLocaleTimeString()}</span></div>}
                    {nr.output_summary?.notePreview && (
                      <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] text-xs whitespace-pre-wrap">{nr.output_summary.notePreview}</div>
                    )}
                    {nr.error && <div className="border border-red/30 rounded-[var(--radius)] p-3 bg-red-soft text-xs">{nr.error.message}</div>}
                  </>
                )
              })()}
              <div className="border-t border-line pt-3">
                <span className="text-xs text-muted uppercase tracking-wider">Events ({ws.events.length})</span>
                <div className="grid gap-1 mt-2 max-h-[200px] overflow-y-auto">
                  {ws.events.slice().reverse().map((e, i) => (
                    <div key={i} className="text-xs flex justify-between gap-2">
                      <code className="text-[11px]">{e.type}</code>
                      <span className="text-muted">{new Date(e.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* OUTPUTS */}
      {tab === "outputs" && (
        <section className="border border-line rounded-[var(--radius)] bg-surface p-4 grid gap-3">
          {latestRun?.output?.blocked && (
            <div className="border border-red/30 bg-red-soft rounded-[var(--radius)] p-4 text-sm">
              <strong className="block mb-1">🚫 Run BLOCKED tại node: {latestRun.output.blocked.node}</strong>
              <span className="text-muted">{latestRun.output.blocked.reason}</span>
            </div>
          )}
          {latestRun?.output?.publishStatus === "draft" && (
            <div className="border border-amber/40 bg-amber-soft rounded-[var(--radius)] p-3 text-sm">
              📝 Publish bị từ chối — output giữ ở <strong>Draft</strong>.
            </div>
          )}
          {latestRun?.output?.notes?.length ? (
            (latestRun.output.notes as string[]).map((n, i) => (
              <div key={i} className="border border-line rounded-[var(--radius)] p-4 bg-[#fbfcfb] text-sm whitespace-pre-wrap leading-relaxed">{n}</div>
            ))
          ) : (
            <p className="text-muted text-sm m-0">Chưa có output. Run xong (hoặc bị reject) sẽ hiển thị tại đây. Lưu ý: build/evidence/publish hiện là stub — chưa phải deliverable thật.</p>
          )}
        </section>
      )}

      {/* USAGE */}
      {tab === "usage" && (
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-4">
            {[["Tổng", ws.usage.total], ["Chat", ws.usage.chat], ["Workflow", ws.usage.workflow]].map(([label, u]: any) => (
              <div key={label} className="border border-line rounded-[var(--radius)] bg-surface p-4">
                <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
                <strong className="block text-xl mt-1">${u.cost.toFixed(4)}</strong>
                <span className="text-xs text-muted">{u.calls} calls · {fmtTok(u.tokens)} tokens (provider-reported)</span>
              </div>
            ))}
          </div>
          <section className="border border-line rounded-[var(--radius)] bg-surface overflow-hidden">
            <div className="min-h-[48px] border-b border-line px-3.5 py-3"><h2 className="m-0 text-[15px] font-bold">Theo node</h2></div>
            <div className="p-3.5">
              <table className="w-full border-collapse text-sm">
                <thead><tr>{["Node", "Calls", "Tokens", "Cost"].map(h => <th key={h} className="border-b border-line p-2 text-left text-[11px] text-muted uppercase bg-[#fbfcfb]">{h}</th>)}</tr></thead>
                <tbody>
                  {ws.usage.byNode.map(r => (
                    <tr key={r.node}>
                      <td className="border-b border-line p-2">{r.node}</td>
                      <td className="border-b border-line p-2">{r.calls}</td>
                      <td className="border-b border-line p-2">{fmtTok(r.tokens)}</td>
                      <td className="border-b border-line p-2">${r.cost.toFixed(4)}</td>
                    </tr>
                  ))}
                  {ws.usage.byNode.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted text-sm">Chưa có model call nào.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
