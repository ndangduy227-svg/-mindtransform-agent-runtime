"use client"

import { useState } from "react"
import { useFetch, useMutate } from "@/lib/hooks"
import { Badge } from "@/components/Badge"
import { Play, RefreshCw, Check, X } from "lucide-react"

interface Run {
  id: string
  status: string
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  started_at: string
  finished_at: string | null
}

interface Approval {
  id: string
  session_id: string | null
  request_type: string
  payload: Record<string, unknown>
  status: string
  created_at: string
}

export function WorkflowRunsView() {
  const runs = useFetch<Run[]>("/api/workflows/runs")
  const approvals = useFetch<Approval[]>("/api/approvals")
  const startRun = useMutate("/api/workflows/runs", "POST")
  const [vertical, setVertical] = useState("Spa")
  const [busy, setBusy] = useState(false)

  async function handleStart() {
    setBusy(true)
    await startRun.mutate({ graph: "wf01_research_template_blog", vertical })
    await runs.refetch()
    setBusy(false)
  }

  async function decide(approvalId: string, runId: string | null, decision: "approve" | "reject") {
    await fetch(`/api/approvals/${approvalId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, runId }),
    })
    await approvals.refetch()
    await runs.refetch()
  }

  return (
    <div className="grid gap-4">
      {/* Start a run */}
      <section className="border border-line rounded-[var(--radius)] bg-surface p-3.5 flex items-end gap-3 flex-wrap">
        <div className="grid gap-1">
          <label className="text-xs text-muted uppercase tracking-wider">Vertical</label>
          <input
            value={vertical}
            onChange={e => setVertical(e.target.value)}
            className="h-[38px] border border-line rounded-[var(--radius)] px-3 text-sm bg-white min-w-[220px]"
            placeholder="Spa, F&B, Bán lẻ…"
          />
        </div>
        <button
          onClick={handleStart}
          disabled={busy}
          className="h-[38px] px-4 rounded-[var(--radius)] bg-[#17211b] text-white inline-flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50"
        >
          <Play size={16} /> {busy ? "Đang chạy…" : "Chạy WF_01"}
        </button>
        <span className="text-xs text-muted">Gọi engine /run (nếu engine offline, run vẫn được ghi vào DB).</span>
      </section>

      {/* Pending approvals */}
      <section className="border border-line rounded-[var(--radius)] bg-surface overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between">
          <div>
            <h2 className="m-0 text-[15px] font-bold">Chờ duyệt (Human Approval)</h2>
            <p className="mt-0.5 text-xs text-muted">Interrupt từ workflow — founder duyệt để engine resume.</p>
          </div>
          <button onClick={approvals.refetch} className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-surface-2">
            <RefreshCw size={17} className={approvals.loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="p-3.5 grid gap-2.5">
          {(approvals.data ?? []).map(a => (
            <div key={a.id} className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <strong className="block text-sm">{a.request_type}</strong>
                <span className="text-xs text-muted">{new Date(a.created_at).toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => decide(a.id, (a.payload?.runId as string) ?? null, "approve")} className="h-[34px] px-3 rounded-[var(--radius)] bg-green-soft text-green inline-flex items-center gap-1.5 text-sm cursor-pointer border border-green/30"><Check size={15} /> Duyệt</button>
                <button onClick={() => decide(a.id, (a.payload?.runId as string) ?? null, "reject")} className="h-[34px] px-3 rounded-[var(--radius)] bg-red-soft text-red inline-flex items-center gap-1.5 text-sm cursor-pointer border border-red/30"><X size={15} /> Từ chối</button>
              </div>
            </div>
          ))}
          {!approvals.loading && (approvals.data ?? []).length === 0 && (
            <p className="text-muted text-sm m-0 py-4 text-center">Không có request nào chờ duyệt.</p>
          )}
        </div>
      </section>

      {/* Runs list */}
      <section className="border border-line rounded-[var(--radius)] bg-surface overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between">
          <h2 className="m-0 text-[15px] font-bold">Workflow runs</h2>
          <button onClick={runs.refetch} className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-surface-2">
            <RefreshCw size={17} className={runs.loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="p-3.5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Run", "Status", "Input", "Bắt đầu"].map(h => (
                  <th key={h} className="border-b border-line p-2.5 text-left text-[11px] text-muted uppercase tracking-wider bg-[#fbfcfb]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(runs.data ?? []).map(r => (
                <tr key={r.id}>
                  <td className="border-b border-line p-2.5 font-mono text-xs">{r.id.slice(0, 8)}</td>
                  <td className="border-b border-line p-2.5"><Badge color={statusColor(r.status)}>{r.status}</Badge></td>
                  <td className="border-b border-line p-2.5 text-muted text-xs">{JSON.stringify(r.input)}</td>
                  <td className="border-b border-line p-2.5 text-muted text-xs">{new Date(r.started_at).toLocaleString()}</td>
                </tr>
              ))}
              {!runs.loading && (runs.data ?? []).length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted text-sm">Chưa có run nào. Bấm &quot;Chạy WF_01&quot; ở trên.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function statusColor(s: string): "green" | "amber" | "red" | "blue" | "gray" {
  if (s === "done") return "green"
  if (s === "awaiting_approval") return "amber"
  if (s === "failed") return "red"
  if (s === "running") return "blue"
  return "gray"
}
