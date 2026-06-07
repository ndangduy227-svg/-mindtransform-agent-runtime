"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react"
import { configTargets, configSteps } from "@/lib/data"
import { Badge } from "@/components/Badge"

export function ConfigView() {
  const [targetId, setTargetId] = useState(configTargets[0].id)
  const [stepIdx, setStepIdx] = useState(0)

  const target = configTargets.find(t => t.id === targetId) || configTargets[0]
  const step = configSteps[stepIdx]
  const writes = [...new Set([...target.dbHome, ...step.writes])]
  const payload = {
    target_slug: target.slug,
    target_type: target.type,
    record_type: target.record,
    version: target.version,
    step: step.key,
    publish_gate: target.gate,
    risk_level: target.risk,
    primary_output: target.primaryOutput,
    db_writes: writes,
    contracts: Object.fromEntries(step.contracts),
    validation_checks: step.checks,
  }

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[0.62fr_1.12fr_0.82fr] gap-3.5 items-start">
      {/* Target selector */}
      <aside className="border border-line rounded-[var(--radius)] bg-surface overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3">
          <h2 className="m-0 text-[15px] font-bold">Config Target</h2>
          <p className="mt-0.5 text-xs text-muted">Chọn thứ cần cấu hình trước khi publish vào runtime.</p>
        </div>
        <div className="p-3.5 grid gap-2">
          {configTargets.map(ct => (
            <button key={ct.id} onClick={() => { setTargetId(ct.id); setStepIdx(0) }} className={`w-full border rounded-[var(--radius)] p-3 text-left grid gap-1.5 cursor-pointer ${ct.id === targetId ? "border-[#98cba9] bg-green-soft" : "border-line bg-[#fbfcfb] hover:bg-[#f7faf7]"}`}>
              <strong className="text-sm">{ct.title}</strong>
              <span className="text-xs text-muted">{ct.type}</span>
              <span className="text-xs text-muted leading-snug">{ct.summary}</span>
            </button>
          ))}
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2.5 mt-2">
            <h3 className="m-0 text-sm font-bold">Config rule</h3>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Draft first</span><strong>On</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Founder approval</span><strong>Required</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Versioning</span><strong>Every publish</strong></div>
          </div>
        </div>
      </aside>

      {/* Main config editor */}
      <section className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-[15px] font-bold">Configure {target.title}</h2>
            <p className="mt-0.5 text-xs text-muted">{target.summary} Output: {target.primaryOutput}.</p>
          </div>
          <Badge color="violet">{target.type}</Badge>
        </div>
        <div className="p-3.5 grid gap-3">
          {/* Flow strip */}
          <div className="grid grid-cols-7 gap-1.5">
            {configSteps.map((s, i) => (
              <button key={s.key} onClick={() => setStepIdx(i)} className={`min-h-[54px] border rounded-[var(--radius)] p-2 grid place-content-center gap-0.5 text-center text-[11px] cursor-pointer ${i === stepIdx ? "bg-[#17211b] text-white border-[#17211b]" : "bg-white text-muted border-line"}`}>
                <strong>{i + 1}</strong>
                <span>{s.title}</span>
              </button>
            ))}
          </div>

          {/* Step hero */}
          <div className="border border-line rounded-[var(--radius)] p-3.5 bg-[#fbfcfb] grid gap-2.5">
            <Badge color={target.risk === "High" ? "red" : "violet"}>{target.record}</Badge>
            <h3 className="m-0 text-lg font-bold">{stepIdx + 1}. {step.title}</h3>
            <p className="m-0 text-sm text-muted leading-relaxed">{step.purpose}</p>
          </div>

          {/* Fields & Checks */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
              <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">What founder configures</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {step.fields.map(f => (
                  <div key={f[0]} className="grid gap-1.5">
                    <label className="text-xs text-muted uppercase tracking-wider">{f[0]}</label>
                    <div className={`min-h-[38px] border border-line rounded-[var(--radius)] bg-white p-2 text-sm ${f[1].length > 48 ? "min-h-[86px]" : ""}`}>{f[1]}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
              <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Runtime validation</h3>
              <div className="grid gap-2">
                {step.checks.map((c, i) => (
                  <div key={i} className="border border-line rounded-[var(--radius)] bg-white p-2.5 grid grid-cols-[auto_1fr_auto] gap-2.5 items-start text-sm">
                    <strong>Check {i + 1}</strong>
                    <span>{c}</span>
                    <Badge color="green">Required</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contract preview */}
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
            <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Contract preview</h3>
            <div className="grid gap-2">
              {step.contracts.map(r => (
                <div key={r[0]} className="border border-line rounded-[var(--radius)] bg-white p-2.5 grid grid-cols-[auto_1fr_auto] gap-2.5 items-start text-sm">
                  <strong><code className="font-mono text-xs">{r[0]}</code></strong>
                  <span>{r[1]}</span>
                  <Badge color="blue">Contract</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Footer nav */}
          <div className="flex justify-between items-center gap-2.5 flex-wrap">
            <button disabled={stepIdx === 0} onClick={() => setStepIdx(Math.max(0, stepIdx - 1))} className="h-[38px] border border-line bg-surface rounded-[var(--radius)] inline-flex items-center gap-2 px-3 cursor-pointer text-sm disabled:opacity-45 disabled:cursor-not-allowed">
              <ArrowLeft size={17} /><span>Previous</span>
            </button>
            <div className="flex flex-wrap gap-1.5">
              {step.writes.map(w => <span key={w} className="border border-line bg-[#fbfcfb] rounded-full px-2 py-1 text-xs text-[#425047]">{w}</span>)}
            </div>
            <button onClick={() => setStepIdx(Math.min(configSteps.length - 1, stepIdx + 1))} className="h-[38px] border border-[#17211b] bg-[#17211b] text-white rounded-[var(--radius)] inline-flex items-center gap-2 px-3 cursor-pointer text-sm">
              {stepIdx === configSteps.length - 1 ? <><span>Ready for approval</span><ShieldCheck size={17} /></> : <><span>Next</span><ArrowRight size={17} /></>}
            </button>
          </div>
        </div>
      </section>

      {/* Publish preview */}
      <aside className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3">
          <h2 className="m-0 text-[15px] font-bold">Publish Preview</h2>
          <p className="mt-0.5 text-xs text-muted">Thấy rõ config này sẽ ghi vào bảng nào và tạo version gì.</p>
        </div>
        <div className="p-3.5 grid gap-3">
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2.5">
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Current version</span><strong>{target.version}</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Publish gate</span><strong>{target.gate}</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Risk level</span><strong>{target.risk}</strong></div>
          </div>
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
            <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Database writes</h3>
            <div className="grid gap-1.5">
              {writes.map(w => (
                <div key={w} className="border border-line rounded-[var(--radius)] bg-[#fbfcfb] p-2.5 flex justify-between items-center gap-2.5 text-sm">
                  <span>{w}</span>
                  <Badge color={target.dbHome.includes(w) ? "blue" : "green"}>{target.dbHome.includes(w) ? "target" : "step"}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
            <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">JSON payload</h3>
            <pre className="max-h-[460px] overflow-auto border border-line rounded-[var(--radius)] bg-[#101914] text-[#d8efe0] p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        </div>
      </aside>
    </div>
  )
}
