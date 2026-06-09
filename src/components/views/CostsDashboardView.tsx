"use client"

import { useFetch } from "@/lib/hooks"
import { RefreshCw, DollarSign, Hash, ArrowDownUp } from "lucide-react"

interface CostData {
  totals: { calls: number; costUsd: number; tokensIn: number; tokensOut: number }
  byProvider: { provider: string; calls: number; tokens: number; cost: number }[]
  byDay: { day: string; cost: number }[]
  recent: {
    provider: string; model: string; prompt_tokens: number
    completion_tokens: number; cost_usd: number; status: string; created_at: string
  }[]
}

const fmtUsd = (n: number) => `$${(n ?? 0).toFixed(4)}`
const fmtTok = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n ?? 0}`)

export function CostsDashboardView() {
  const { data, loading, error, refetch } = useFetch<CostData>("/api/costs")

  const maxDay = Math.max(0.0001, ...(data?.byDay ?? []).map(d => d.cost))

  return (
    <div className="grid gap-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi icon={<DollarSign size={16} />} label="Total cost" value={fmtUsd(data?.totals.costUsd ?? 0)} />
        <Kpi icon={<Hash size={16} />} label="Model calls" value={`${data?.totals.calls ?? 0}`} />
        <Kpi icon={<ArrowDownUp size={16} />} label="Tokens in" value={fmtTok(data?.totals.tokensIn ?? 0)} />
        <Kpi icon={<ArrowDownUp size={16} />} label="Tokens out" value={fmtTok(data?.totals.tokensOut ?? 0)} />
      </div>

      {error && (
        <div className="border border-amber/40 bg-amber-soft rounded-[var(--radius)] p-3 text-sm">
          Chưa đọc được model_calls: {error}. Kiểm tra Supabase env + bảng đã tạo chưa.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 items-start">
        {/* Recent calls */}
        <section className="border border-line rounded-[var(--radius)] bg-surface overflow-hidden">
          <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between">
            <div>
              <h2 className="m-0 text-[15px] font-bold">Model calls (gần đây)</h2>
              <p className="mt-0.5 text-xs text-muted">Đọc trực tiếp từ bảng model_calls.</p>
            </div>
            <button onClick={refetch} className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-surface-2">
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="p-3.5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {["Provider", "Model", "In", "Out", "Cost"].map(h => (
                    <th key={h} className="border-b border-line p-2.5 text-left text-[11px] text-muted uppercase tracking-wider bg-[#fbfcfb]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.recent ?? []).map((r, i) => (
                  <tr key={i}>
                    <td className="border-b border-line p-2.5 capitalize">{r.provider}</td>
                    <td className="border-b border-line p-2.5 text-muted text-xs">{r.model}</td>
                    <td className="border-b border-line p-2.5">{fmtTok(r.prompt_tokens)}</td>
                    <td className="border-b border-line p-2.5">{fmtTok(r.completion_tokens)}</td>
                    <td className="border-b border-line p-2.5">{fmtUsd(Number(r.cost_usd))}</td>
                  </tr>
                ))}
                {!loading && (data?.recent ?? []).length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted text-sm">Chưa có model call nào. Chạy 1 phiên Chat để sinh dữ liệu.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* By provider + by day */}
        <aside className="grid gap-4">
          <section className="border border-line rounded-[var(--radius)] bg-surface overflow-hidden">
            <div className="min-h-[56px] border-b border-line px-3.5 py-3">
              <h2 className="m-0 text-[15px] font-bold">Theo provider</h2>
            </div>
            <div className="p-3.5 grid gap-2.5">
              {(data?.byProvider ?? []).map(p => (
                <div key={p.provider} className="flex justify-between items-center text-sm border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
                  <span className="capitalize font-medium">{p.provider}</span>
                  <span className="text-muted text-xs">{p.calls} calls · {fmtTok(p.tokens)} tok</span>
                  <strong>{fmtUsd(p.cost)}</strong>
                </div>
              ))}
              {(data?.byProvider ?? []).length === 0 && <p className="text-muted text-sm m-0">—</p>}
            </div>
          </section>

          <section className="border border-line rounded-[var(--radius)] bg-surface overflow-hidden">
            <div className="min-h-[56px] border-b border-line px-3.5 py-3">
              <h2 className="m-0 text-[15px] font-bold">Cost theo ngày</h2>
            </div>
            <div className="p-3.5 grid gap-2">
              {(data?.byDay ?? []).map(d => (
                <div key={d.day} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
                  <span className="text-muted w-[70px]">{d.day.slice(5)}</span>
                  <span className="h-2 rounded-full bg-[#e5ebe6] overflow-hidden">
                    <span className="block h-full bg-gradient-to-r from-green to-blue rounded-full" style={{ width: `${(d.cost / maxDay) * 100}%` }} />
                  </span>
                  <strong>{fmtUsd(d.cost)}</strong>
                </div>
              ))}
              {(data?.byDay ?? []).length === 0 && <p className="text-muted text-sm m-0">—</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-line rounded-[var(--radius)] bg-surface p-4">
      <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider">{icon}{label}</div>
      <strong className="block text-2xl mt-2">{value}</strong>
    </div>
  )
}
