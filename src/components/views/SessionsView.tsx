"use client"

import { useState } from "react"
import { RotateCw } from "lucide-react"
import { sessions } from "@/lib/data"
import { Badge, statusBadgeColor } from "@/components/Badge"

export function SessionsView() {
  const [selectedId, setSelectedId] = useState(sessions[0].id)
  const session = sessions.find(s => s.id === selectedId) || sessions[0]

  return (
    <div className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
      <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-[15px] font-bold">MindAI Intake Sessions</h2>
          <p className="mt-0.5 text-xs text-muted">Website sessions move into runtime, then become lead qualification and handoff records.</p>
        </div>
        <button className="w-[38px] h-[38px] border border-line bg-surface rounded-[var(--radius)] grid place-items-center cursor-pointer"><RotateCw size={17} /></button>
      </div>
      <div className="p-3.5 grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-3.5">
        <div className="grid gap-2">
          {sessions.map(s => (
            <button key={s.id} onClick={() => setSelectedId(s.id)} className={`w-full border rounded-[var(--radius)] p-3 text-left grid gap-2 cursor-pointer ${s.id === selectedId ? "border-[#9ecdad] bg-green-soft" : "border-line bg-[#fbfcfb]"}`}>
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm">{s.title}</strong>
                <Badge color={statusBadgeColor(s.status)}>{s.status}</Badge>
              </div>
              <p className="m-0 text-sm text-muted">{s.company}</p>
              <p className="m-0 text-sm text-muted leading-snug">{s.pain}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2.5">
            <h3 className="m-0 text-sm font-bold">{session.title}</h3>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Company</span><strong>{session.company}</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Contact</span><strong>{session.contact}</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Lead score</span><strong>{session.score}/100</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Recommended offer</span><strong>{session.offer}</strong></div>
          </div>
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
            <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Pain Map</h3>
            <p className="m-0 text-sm leading-relaxed">{session.pain}</p>
          </div>
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
            <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Conversation</h3>
            <div className="grid gap-2">
              {session.messages.map((msg, i) => (
                <div key={i} className={`border rounded-[var(--radius)] p-2.5 text-sm leading-relaxed ${msg[0] === "user" ? "border-[#d6dfed] bg-blue-soft" : "border-[#d4e5d9] bg-green-soft"}`}>
                  <strong className="block mb-0.5">{msg[0] === "user" ? "User" : "Mind AI"}</strong>
                  {msg[1]}
                </div>
              ))}
            </div>
          </div>
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
            <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Runtime Writes</h3>
            <div className="flex flex-wrap gap-1.5">
              {["sessions", "session_messages", "context_snapshots", "lead_qualification", "approval_requests"].map(t => (
                <span key={t} className="border border-line bg-[#fbfcfb] rounded-full px-2 py-1 text-xs text-[#425047]">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
