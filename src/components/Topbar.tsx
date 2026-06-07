"use client"

import { RefreshCw, Download, ShieldCheck } from "lucide-react"

const viewMeta: Record<string, [string, string]> = {
  config: ["Config Studio", "Configure Agent/Workflow/Memory theo luồng: target → SOW → input/output → tools → memory → publish."],
  agents: ["Agent Registry", "Quản lý đội agent, SOW, input/output, quyền tool và policy memory."],
  workflows: ["Workflow Registry", "Thiết kế luồng chạy từ website intake tới proposal seed và approval."],
  sessions: ["Sessions", "Theo dõi chat, lead, qualification, handoff và lịch sử message."],
  memory: ["Memory", "Quản lý context compaction, protected facts và handoff delta."],
  database: ["Database", "Bản đồ database riêng cho runtime, tách khỏi web hiện tại."],
  costs: ["Costs", "Quan sát cost, model calls, eval quality và budget guardrail."],
}

export function Topbar({ activeView }: { activeView: string }) {
  const [title, subtitle] = viewMeta[activeView] || viewMeta.agents
  return (
    <header className="min-h-[72px] border-b border-line bg-white/85 backdrop-blur-lg sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <h1 className="m-0 text-2xl font-bold leading-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted leading-snug">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-surface-2"><RefreshCw size={17} /></button>
        <button className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer hover:bg-surface-2"><Download size={17} /></button>
        <button className="h-[38px] border border-line bg-transparent rounded-[var(--radius)] inline-flex items-center gap-2 px-3 cursor-pointer text-sm hover:bg-surface-2"><ShieldCheck size={17} /><span>3 approvals</span></button>
      </div>
    </header>
  )
}
