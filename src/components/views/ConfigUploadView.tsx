"use client"

import { useState, useCallback, type DragEvent } from "react"
import { Upload, FileText, X, ChevronRight, Eye, Save } from "lucide-react"
import { Badge } from "@/components/Badge"

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ParsedFile {
  filename: string
  content: string
  type: "role" | "skill" | "script" | "unknown"
  parsed: any
}

function DropZone({ label, accept, onDrop }: { label: string; accept: string; onDrop: (files: File[]) => void }) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrag = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
  const handleDragIn = (e: DragEvent) => { handleDrag(e); setDragOver(true) }
  const handleDragOut = (e: DragEvent) => { handleDrag(e); setDragOver(false) }
  const handleDrop = (e: DragEvent) => {
    handleDrag(e); setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    onDrop(files)
  }

  const handleClick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = accept
    input.multiple = true
    input.onchange = () => {
      if (input.files) onDrop(Array.from(input.files))
    }
    input.click()
  }

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`min-h-[120px] border-2 border-dashed rounded-[var(--radius)] p-4 grid place-items-center gap-2 cursor-pointer transition-colors ${
        dragOver ? "border-[#4a9966] bg-green-soft" : "border-line bg-[#fbfcfb] hover:border-[#98cba9] hover:bg-[#f7faf7]"
      }`}
    >
      <Upload size={24} className="text-muted" />
      <span className="text-sm text-muted text-center">{label}</span>
      <span className="text-xs text-muted">Drag & drop or click to browse</span>
    </div>
  )
}

function FilePreview({ file, onRemove }: { file: ParsedFile; onRemove: () => void }) {
  const [showRaw, setShowRaw] = useState(false)

  const typeColor = file.type === "role" ? "green" : file.type === "skill" ? "blue" : file.type === "script" ? "violet" : "gray"

  return (
    <div className="border border-line rounded-[var(--radius)] bg-[#fbfcfb] overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-line">
        <FileText size={16} className="text-muted" />
        <strong className="text-sm flex-1 truncate">{file.filename}</strong>
        <Badge color={typeColor}>{file.type}</Badge>
        <button onClick={() => setShowRaw(!showRaw)} className="w-7 h-7 grid place-items-center border border-line rounded bg-white cursor-pointer" title="Toggle raw">
          <Eye size={14} />
        </button>
        <button onClick={onRemove} className="w-7 h-7 grid place-items-center border border-line rounded bg-white cursor-pointer text-red-500" title="Remove">
          <X size={14} />
        </button>
      </div>

      {showRaw ? (
        <pre className="max-h-[200px] overflow-auto p-3 text-xs font-mono bg-[#101914] text-[#d8efe0] whitespace-pre-wrap">{file.content}</pre>
      ) : (
        <div className="p-3 grid gap-2">
          {file.type === "role" && file.parsed?.role && (
            <>
              <div className="flex justify-between text-sm"><span className="text-muted">Name</span><strong>{file.parsed.role.name}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted">Mission</span><span className="text-right max-w-[60%]">{file.parsed.role.mission || "—"}</span></div>
              {file.parsed.role.inputs?.length > 0 && (
                <div>
                  <span className="text-xs text-muted uppercase tracking-wider">Inputs</span>
                  <div className="flex flex-wrap gap-1 mt-1">{file.parsed.role.inputs.map((i: string, idx: number) => <span key={idx} className="border border-line bg-white rounded-full px-2 py-0.5 text-xs">{i}</span>)}</div>
                </div>
              )}
              {file.parsed.role.outputs?.length > 0 && (
                <div>
                  <span className="text-xs text-muted uppercase tracking-wider">Outputs</span>
                  <div className="flex flex-wrap gap-1 mt-1">{file.parsed.role.outputs.map((o: string, idx: number) => <span key={idx} className="border border-line bg-white rounded-full px-2 py-0.5 text-xs">{o}</span>)}</div>
                </div>
              )}
              {file.parsed.role.guardrails?.length > 0 && (
                <div>
                  <span className="text-xs text-muted uppercase tracking-wider">Guardrails</span>
                  <div className="grid gap-1 mt-1">{file.parsed.role.guardrails.map((g: string, idx: number) => <div key={idx} className="text-xs text-muted">• {g}</div>)}</div>
                </div>
              )}
            </>
          )}
          {file.type === "skill" && file.parsed?.skill && (
            <>
              <div className="flex justify-between text-sm"><span className="text-muted">Name</span><strong>{file.parsed.skill.name}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted">Trigger</span><span>{file.parsed.skill.trigger || "—"}</span></div>
              {file.parsed.skill.steps?.length > 0 && (
                <div>
                  <span className="text-xs text-muted uppercase tracking-wider">Steps</span>
                  <div className="grid gap-1 mt-1">{file.parsed.skill.steps.map((s: string, idx: number) => <div key={idx} className="text-xs">{idx + 1}. {s}</div>)}</div>
                </div>
              )}
            </>
          )}
          {file.type === "script" && (
            <div className="text-sm text-muted">Script file — will be stored as agent_script</div>
          )}
          {file.type === "unknown" && (
            <div className="text-sm text-muted">Could not detect file type. Check content or rename file.</div>
          )}
        </div>
      )}
    </div>
  )
}

export function ConfigUploadView() {
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleFiles = useCallback(async (newFiles: File[]) => {
    setParsing(true)
    const parsed: ParsedFile[] = []

    for (const file of newFiles) {
      const content = await file.text()
      const ext = file.name.split(".").pop()?.toLowerCase()

      if (ext === "md") {
        try {
          const res = await fetch("/api/config/parse-md", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, filename: file.name }),
          })
          const data = await res.json()
          parsed.push({ filename: file.name, content, type: data.type, parsed: data })
        } catch {
          parsed.push({ filename: file.name, content, type: "unknown", parsed: null })
        }
      } else {
        // Scripts (.py, .js, .ts, .sh, etc.)
        parsed.push({ filename: file.name, content, type: "script", parsed: null })
      }
    }

    setFiles(prev => [...prev, ...parsed])
    setParsing(false)
    setSaved(false)
  }, [])

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setSaved(false)
  }

  const saveAll = async () => {
    setSaving(true)
    // In future: POST to /api/config/save with all parsed files
    // For now, simulate save
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    setSaved(true)
  }

  const roleFiles = files.filter(f => f.type === "role")
  const skillFiles = files.filter(f => f.type === "skill")
  const scriptFiles = files.filter(f => f.type === "script")
  const unknownFiles = files.filter(f => f.type === "unknown")

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[1fr_380px] gap-3.5 items-start">
      <div className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3">
          <h2 className="m-0 text-[15px] font-bold">Agent Config Studio — Upload</h2>
          <p className="mt-0.5 text-xs text-muted">Drag & drop ROLE.md, SKILL.md, hoặc script files. Hệ thống sẽ parse và preview trước khi lưu.</p>
        </div>

        <div className="p-3.5 grid gap-4">
          {/* Drop zones */}
          <div className="grid grid-cols-3 gap-3">
            <DropZone label="ROLE.md" accept=".md" onDrop={handleFiles} />
            <DropZone label="SKILL.md" accept=".md" onDrop={handleFiles} />
            <DropZone label="Scripts (.py, .js, .ts)" accept=".py,.js,.ts,.sh" onDrop={handleFiles} />
          </div>

          {parsing && <div className="text-sm text-muted text-center py-2">Parsing files...</div>}

          {/* File previews */}
          {files.length > 0 && (
            <>
              {roleFiles.length > 0 && (
                <div>
                  <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Role Definitions ({roleFiles.length})</h3>
                  <div className="grid gap-2">
                    {roleFiles.map((f, i) => <FilePreview key={`role-${i}`} file={f} onRemove={() => removeFile(files.indexOf(f))} />)}
                  </div>
                </div>
              )}
              {skillFiles.length > 0 && (
                <div>
                  <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Skill Definitions ({skillFiles.length})</h3>
                  <div className="grid gap-2">
                    {skillFiles.map((f, i) => <FilePreview key={`skill-${i}`} file={f} onRemove={() => removeFile(files.indexOf(f))} />)}
                  </div>
                </div>
              )}
              {scriptFiles.length > 0 && (
                <div>
                  <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Scripts ({scriptFiles.length})</h3>
                  <div className="grid gap-2">
                    {scriptFiles.map((f, i) => <FilePreview key={`script-${i}`} file={f} onRemove={() => removeFile(files.indexOf(f))} />)}
                  </div>
                </div>
              )}
              {unknownFiles.length > 0 && (
                <div>
                  <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Unknown ({unknownFiles.length})</h3>
                  <div className="grid gap-2">
                    {unknownFiles.map((f, i) => <FilePreview key={`unk-${i}`} file={f} onRemove={() => removeFile(files.indexOf(f))} />)}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={() => { setFiles([]); setSaved(false) }} className="h-[38px] border border-line bg-surface rounded-[var(--radius)] flex items-center gap-2 px-3 cursor-pointer text-sm">
                  <X size={16} /><span>Clear All</span>
                </button>
                <button
                  onClick={saveAll}
                  disabled={saving || saved}
                  className="h-[38px] border border-[#17211b] bg-[#17211b] text-white rounded-[var(--radius)] flex items-center gap-2 px-3 cursor-pointer text-sm disabled:opacity-50"
                >
                  {saved ? <><span>Saved</span></> : saving ? <><span>Saving...</span></> : <><Save size={16} /><span>Save Config</span><ChevronRight size={14} /></>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary sidebar */}
      <aside className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        <div className="min-h-[56px] border-b border-line px-3.5 py-3">
          <h2 className="m-0 text-[15px] font-bold">Upload Summary</h2>
          <p className="mt-0.5 text-xs text-muted">Overview of uploaded files and their parsing status.</p>
        </div>
        <div className="p-3.5 grid gap-3">
          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb] grid gap-2.5">
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Total files</span><strong>{files.length}</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Roles</span><strong>{roleFiles.length}</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Skills</span><strong>{skillFiles.length}</strong></div>
            <div className="flex justify-between items-center text-sm"><span className="text-muted">Scripts</span><strong>{scriptFiles.length}</strong></div>
            {unknownFiles.length > 0 && (
              <div className="flex justify-between items-center text-sm"><span className="text-muted">Unknown</span><strong className="text-amber-600">{unknownFiles.length}</strong></div>
            )}
          </div>

          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
            <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Config Pipeline</h3>
            <div className="grid gap-2">
              {["Upload files", "Parse & detect type", "Preview config", "Save to Supabase"].map((step, i) => {
                const done = i === 0 ? files.length > 0 : i === 1 ? files.length > 0 && !parsing : i === 2 ? files.length > 0 : saved
                return (
                  <div key={step} className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold ${done ? "bg-[#17211b] text-white" : "border border-line text-muted"}`}>{i + 1}</div>
                    <span className={done ? "text-foreground" : "text-muted"}>{step}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border border-line rounded-[var(--radius)] p-3 bg-[#fbfcfb]">
            <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">DB Targets</h3>
            <div className="flex flex-wrap gap-1.5">
              {["agents", "agent_versions", "agent_skills", "agent_scripts"].map(t => (
                <span key={t} className="border border-line bg-white rounded-full px-2 py-1 text-xs text-[#425047]">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
