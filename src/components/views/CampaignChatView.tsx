"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Plus, Send, RotateCw, Target, Brain, ShieldCheck,
  Building2, User2, Sparkles, ChevronRight, X,
} from "lucide-react"
import { Badge, statusBadgeColor } from "@/components/Badge"
import { useFetch, useMutate } from "@/lib/hooks"

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface Campaign {
  id: string
  status: string
  source: string
  context: any
  created_at: string
  lead: {
    id: string
    status: string
    score: number | null
    recommended_offer: string | null
    pain_summary: string | null
    organization: { id: string; name: string; industry: string | null; website: string | null }
    contact: { id: string; name: string | null; email: string | null; phone: string | null }
  } | null
}

interface Message {
  id: string
  role: string
  content: string
  token_estimate: number | null
  created_at: string
}

interface CampaignDetail extends Campaign {
  messages: Message[]
  snapshots: any[]
  facts: any[]
  qualifications: any[]
  approvals: any[]
}

/* ------------------------------------------------------------------ */
/*  New Campaign Modal                                                */
/* ------------------------------------------------------------------ */
function NewCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: any) => void }) {
  const [form, setForm] = useState({ company: "", industry: "", contactName: "", contactEmail: "", problem: "" })
  const { mutate, loading } = useMutate("/api/campaigns", "POST")
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async () => {
    const res = await mutate(form)
    if (res) { onCreated(res); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-lg border border-line rounded-[var(--radius)] bg-surface shadow-lg p-5 grid gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold m-0">New Campaign</h2>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center cursor-pointer border-0 bg-transparent"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Company</label>
            <input className="h-[38px] border border-line rounded-[var(--radius)] px-2.5 text-sm bg-white" value={form.company} onChange={e => set("company", e.target.value)} placeholder="e.g. ABC Corp" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Industry</label>
            <input className="h-[38px] border border-line rounded-[var(--radius)] px-2.5 text-sm bg-white" value={form.industry} onChange={e => set("industry", e.target.value)} placeholder="e.g. Manufacturing" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Contact Name</label>
            <input className="h-[38px] border border-line rounded-[var(--radius)] px-2.5 text-sm bg-white" value={form.contactName} onChange={e => set("contactName", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Contact Email</label>
            <input className="h-[38px] border border-line rounded-[var(--radius)] px-2.5 text-sm bg-white" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs text-muted uppercase tracking-wider">Problem / Pain</label>
          <textarea className="min-h-[80px] border border-line rounded-[var(--radius)] px-2.5 py-2 text-sm bg-white resize-y" value={form.problem} onChange={e => set("problem", e.target.value)} placeholder="What problem does the client want to solve?" />
        </div>
        <button disabled={!form.company || loading} onClick={submit} className="h-[42px] border border-[#17211b] bg-[#17211b] text-white rounded-[var(--radius)] flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50">
          <Plus size={16} /><span>{loading ? "Creating..." : "Create Campaign"}</span>
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main View                                                        */
/* ------------------------------------------------------------------ */
export function CampaignChatView() {
  const { data: campaigns, loading: listLoading, refetch } = useFetch<Campaign[]>("/api/campaigns")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<CampaignDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load detail when campaign selected
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${id}`)
      const data = await res.json()
      setDetail(data)
    } catch { /* ignore */ }
    setDetailLoading(false)
  }, [])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId, loadDetail])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [detail?.messages])

  // Auto-select first campaign
  useEffect(() => {
    if (campaigns?.length && !selectedId) setSelectedId(campaigns[0].id)
  }, [campaigns, selectedId])

  const sendMessage = async () => {
    if (!input.trim() || !selectedId) return
    setSending(true)
    const msg = input
    setInput("")
    try {
      // POST sends user message + gets AI response in one call
      await fetch(`/api/campaigns/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: msg }),
      })
      await loadDetail(selectedId)
    } catch { /* ignore */ }
    setSending(false)
  }

  const qualify = async () => {
    if (!selectedId) return
    await fetch(`/api/campaigns/${selectedId}/qualify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: 75,
        fit_reason: "Good fit — SMB with operational pain, ready to pilot AI",
        recommended_offer: "AI Operating Partner — Pilot",
        urgency: "medium",
        next_action: "Schedule deep-dive with Architect agent",
      }),
    })
    await loadDetail(selectedId)
    refetch()
  }

  const snapshot = async () => {
    if (!selectedId || !detail) return
    await fetch(`/api/campaigns/${selectedId}/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `Campaign with ${detail.lead?.organization?.name || "Unknown"}. ${detail.messages?.length || 0} messages exchanged.`,
        decisions: ["Initial intake completed"],
        risks: ["Need more detail on current tech stack"],
        protected_facts: [
          { key: "company", value: detail.lead?.organization?.name },
          { key: "industry", value: detail.lead?.organization?.industry },
        ],
      }),
    })
    await loadDetail(selectedId)
  }

  const requestApproval = async () => {
    if (!selectedId) return
    await fetch(`/api/campaigns/${selectedId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "request",
        request_type: "proposal_seed",
        payload: { note: "Lead qualified. Ready for proposal seed generation." },
      }),
    })
    await loadDetail(selectedId)
    refetch()
  }

  const onCreated = (res: any) => {
    refetch()
    setSelectedId(res.session?.id || null)
  }

  return (
    <>
      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} onCreated={onCreated} />}

      <div className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-[15px] font-bold">Campaign Chat</h2>
            <p className="mt-0.5 text-xs text-muted">Mỗi chiến dịch = 1 session + lead + tổ chức. Chat, chẩn đoán, chấm điểm lead, xin duyệt.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer"><RotateCw size={17} /></button>
            <button onClick={() => setShowNew(true)} className="h-[38px] border border-[#17211b] bg-[#17211b] text-white rounded-[var(--radius)] flex items-center gap-2 px-3 cursor-pointer text-sm">
              <Plus size={16} /><span>New Campaign</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[300px_1fr_280px] min-h-[600px]">
          {/* Campaign list */}
          <div className="border-r border-line overflow-y-auto max-h-[700px]">
            {listLoading && <div className="p-3 text-sm text-muted">Loading...</div>}
            {campaigns?.length === 0 && <div className="p-3 text-sm text-muted">No campaigns yet. Create one to start.</div>}
            {campaigns?.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full border-b border-line p-3 text-left grid gap-1.5 cursor-pointer ${c.id === selectedId ? "bg-green-soft" : "bg-transparent hover:bg-[#f7faf7]"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm truncate">{c.lead?.organization?.name || "Unknown"}</strong>
                  <Badge color={statusBadgeColor(c.status)}>{c.status}</Badge>
                </div>
                <span className="text-xs text-muted truncate">{c.lead?.contact?.name || c.lead?.contact?.email || "—"}</span>
                <span className="text-xs text-muted truncate">{c.lead?.pain_summary || c.context?.problem || "No description"}</span>
                <span className="text-[10px] text-muted">{new Date(c.created_at).toLocaleDateString("vi-VN")}</span>
              </button>
            ))}
          </div>

          {/* Chat panel */}
          <div className="flex flex-col">
            {!selectedId || detailLoading ? (
              <div className="flex-1 grid place-items-center text-sm text-muted">
                {detailLoading ? "Loading..." : "Select a campaign to start chatting"}
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3.5 grid gap-2 content-start max-h-[540px]">
                  {(!detail?.messages || detail.messages.length === 0) && (
                    <div className="text-sm text-muted text-center py-8">
                      <Sparkles size={24} className="mx-auto mb-2 opacity-40" />
                      Start the conversation. Mind AI Consultant will diagnose the client.
                    </div>
                  )}
                  {detail?.messages?.map(msg => (
                    <div
                      key={msg.id}
                      className={`max-w-[85%] border rounded-[var(--radius)] p-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "border-[#d6dfed] bg-blue-soft justify-self-end"
                          : "border-[#d4e5d9] bg-green-soft justify-self-start"
                      }`}
                    >
                      <strong className="block mb-0.5 text-xs">
                        {msg.role === "user" ? "You" : "Mind AI"}
                      </strong>
                      {msg.content}
                      <span className="block text-[10px] text-muted mt-1">
                        {new Date(msg.created_at).toLocaleTimeString("vi-VN")}
                      </span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-line p-3 flex gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 h-[42px] border border-line rounded-[var(--radius)] px-3 text-sm bg-white"
                    disabled={sending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="h-[42px] w-[42px] border border-[#17211b] bg-[#17211b] text-white rounded-[var(--radius)] grid place-items-center cursor-pointer disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right sidebar — lead info + actions */}
          <div className="border-l border-line p-3 grid gap-3 content-start overflow-y-auto max-h-[700px]">
            {detail?.lead ? (
              <>
                <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 size={15} className="text-muted" />
                    <strong className="text-sm">{detail.lead.organization?.name}</strong>
                  </div>
                  <div className="flex justify-between text-xs"><span className="text-muted">Industry</span><span>{detail.lead.organization?.industry || "—"}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted">Website</span><span>{detail.lead.organization?.website || "—"}</span></div>
                </div>

                <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <User2 size={15} className="text-muted" />
                    <strong className="text-sm">Contact</strong>
                  </div>
                  <div className="flex justify-between text-xs"><span className="text-muted">Name</span><span>{detail.lead.contact?.name || "—"}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted">Email</span><span>{detail.lead.contact?.email || "—"}</span></div>
                </div>

                <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Target size={15} className="text-muted" />
                    <strong className="text-sm">Lead Score</strong>
                  </div>
                  <div className="text-2xl font-bold">{detail.lead.score ?? "—"}<span className="text-sm text-muted font-normal">/100</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted">Status</span><Badge color={statusBadgeColor(detail.lead.status)}>{detail.lead.status}</Badge></div>
                  <div className="flex justify-between text-xs"><span className="text-muted">Offer</span><span className="text-right">{detail.lead.recommended_offer || "—"}</span></div>
                </div>

                {/* Actions */}
                <div className="grid gap-2">
                  <h3 className="text-xs text-muted uppercase tracking-wider m-0">Actions</h3>
                  <button onClick={qualify} className="h-[36px] w-full border border-line bg-white rounded-[var(--radius)] flex items-center gap-2 px-3 cursor-pointer text-sm hover:bg-[#f7faf7]">
                    <Target size={14} /><span>Qualify Lead</span><ChevronRight size={14} className="ml-auto" />
                  </button>
                  <button onClick={snapshot} className="h-[36px] w-full border border-line bg-white rounded-[var(--radius)] flex items-center gap-2 px-3 cursor-pointer text-sm hover:bg-[#f7faf7]">
                    <Brain size={14} /><span>Memory Snapshot</span><ChevronRight size={14} className="ml-auto" />
                  </button>
                  <button onClick={requestApproval} className="h-[36px] w-full border border-line bg-white rounded-[var(--radius)] flex items-center gap-2 px-3 cursor-pointer text-sm hover:bg-[#f7faf7]">
                    <ShieldCheck size={14} /><span>Request Approval</span><ChevronRight size={14} className="ml-auto" />
                  </button>
                </div>

                {/* Facts */}
                {detail.facts && detail.facts.length > 0 && (
                  <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
                    <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Protected Facts</h3>
                    <div className="grid gap-1.5">
                      {detail.facts.map((f: any) => (
                        <div key={f.id} className="flex justify-between text-xs">
                          <span className="text-muted">{f.fact_key}</span>
                          <span>{String(f.fact_value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approvals */}
                {detail.approvals && detail.approvals.length > 0 && (
                  <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
                    <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Approvals</h3>
                    <div className="grid gap-1.5">
                      {detail.approvals.map((a: any) => (
                        <div key={a.id} className="flex justify-between items-center text-xs">
                          <span>{a.request_type}</span>
                          <Badge color={a.status === "approved" ? "green" : a.status === "pending" ? "amber" : "red"}>{a.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted">Select a campaign to see details</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
