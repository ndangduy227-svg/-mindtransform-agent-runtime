"use client"

import { useState, useCallback, type DragEvent } from "react"
import { Upload, FileText, Trash2, Eye, EyeOff, Bot } from "lucide-react"
import { Badge } from "@/components/Badge"

// ─── Types ──────────────────────────────────────────────────────
interface WorkflowFile {
  id: string
  filename: string
  title: string
  description: string
  agents_used: string[]
  content: string
  uploaded_at: string
}

// ─── Drop Zone ──────────────────────────────────────────────────
function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState(false)
  const stop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }

  return (
    <div
      onDragEnter={e => { stop(e); setOver(true) }}
      onDragLeave={e => { stop(e); setOver(false) }}
      onDragOver={stop}
      onDrop={e => { stop(e); setOver(false); onFiles(Array.from(e.dataTransfer.files)) }}
      onClick={() => {
        const input = document.createElement("input")
        input.type = "file"; input.accept = ".md"; input.multiple = true
        input.onchange = () => { if (input.files) onFiles(Array.from(input.files)) }
        input.click()
      }}
      className={`border-2 border-dashed rounded-[var(--radius)] p-6 text-center cursor-pointer transition-colors ${
        over ? "border-[#4a9966] bg-green-soft" : "border-line hover:border-[#98cba9] hover:bg-[#f7faf7]"
      }`}
    >
      <Upload size={28} className="mx-auto mb-2 text-muted" />
      <div className="text-sm font-medium">Upload Workflow MD</div>
      <div className="text-[11px] text-muted mt-1">1 file MD = 1 use case. Drag & drop hoặc click.</div>
    </div>
  )
}

// ─── Extract metadata from MD ───────────────────────────────────
function extractWorkflowMeta(content: string, filename: string): Partial<WorkflowFile> {
  const lines = content.split("\n")
  let title = filename.replace(".md", "")
  let description = ""
  const agents_used: string[] = []

  // Find title from first H1
  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line.replace("# ", "").trim()
      break
    }
  }

  // Find description — first non-empty non-heading line after title
  let pastTitle = false
  for (const line of lines) {
    if (line.startsWith("# ")) { pastTitle = true; continue }
    if (pastTitle && line.trim() && !line.startsWith("#")) {
      description = line.trim()
      break
    }
  }

  // Find agent references — lines with @Agent or ## Agent:
  const agentPattern = /@(\w+[\w\s]*?)(?:\s|$|,)/g
  let match
  while ((match = agentPattern.exec(content)) !== null) {
    const name = match[1].trim()
    if (!agents_used.includes(name)) agents_used.push(name)
  }

  // Also look for ## Agents Used or similar sections
  const agentSectionRegex = /##\s*(?:Agents?|Roles?)\s*(?:Used|Involved|Required)?[\s\S]*?(?=\n##|\n$)/gi
  const agentSection = agentSectionRegex.exec(content)
  if (agentSection) {
    const bulletLines = agentSection[0].split("\n").filter(l => l.trim().startsWith("-") || l.trim().startsWith("*"))
    for (const bl of bulletLines) {
      const name = bl.replace(/^[\s\-*]+/, "").split(":")[0].split("—")[0].split("–")[0].trim()
      if (name && !agents_used.includes(name)) agents_used.push(name)
    }
  }

  return { title, description, agents_used }
}

// ─── Main View ──────────────────────────────────────────────────
export function WorkflowsUploadView() {
  const [workflows, setWorkflows] = useState<WorkflowFile[]>([])
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)

  const handleFiles = useCallback(async (files: File[]) => {
    setParsing(true)
    const newWorkflows: WorkflowFile[] = []
    for (const file of files) {
      if (!file.name.endsWith(".md")) continue
      const content = await file.text()
      const meta = extractWorkflowMeta(content, file.name)
      newWorkflows.push({
        id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        filename: file.name,
        title: meta.title || file.name,
        description: meta.description || "",
        agents_used: meta.agents_used || [],
        content,
        uploaded_at: new Date().toISOString(),
      })
    }
    setWorkflows(prev => [...prev, ...newWorkflows])
    setParsing(false)
  }, [])

  const removeWorkflow = (id: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== id))
    if (previewId === id) setPreviewId(null)
  }

  const previewing = workflows.find(w => w.id === previewId)

  return (
    <div className="grid grid-cols-[1fr_380px] gap-3.5 items-start min-h-[600px]">
      {/* Workflow list */}
      <div className="border border-line rounded-[var(--radius)] bg-surface overflow-hidden">
        <div className="border-b border-line px-3.5 py-3">
          <h2 className="m-0 text-[15px] font-bold">Workflows</h2>
          <p className="mt-0.5 text-xs text-muted">1 file MD = 1 use case. Upload workflow rồi dùng @workflow trong Chat.</p>
        </div>

        <div className="p-3.5 grid gap-3">
          <DropZone onFiles={handleFiles} />
          {parsing && <div className="text-xs text-muted text-center">Parsing...</div>}

          {workflows.length === 0 && !parsing && (
            <div className="text-center py-6 text-sm text-muted">
              <FileText size={28} className="mx-auto mb-2 opacity-30" />
              Chưa có workflow nào. Upload file .md để bắt đầu.
            </div>
          )}

          <div className="grid gap-2">
            {workflows.map(wf => (
              <div
                key={wf.id}
                className={`border rounded-[var(--radius)] p-3 transition-colors cursor-pointer ${
                  previewId === wf.id ? "border-[#9ecdad] bg-green-soft" : "border-line hover:bg-[#f7faf7]"
                }`}
                onClick={() => setPreviewId(previewId === wf.id ? null : wf.id)}
              >
                <div className="flex items-start gap-2.5">
                  <FileText size={18} className="text-muted mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{wf.title}</div>
                    {wf.description && <div className="text-xs text-muted mt-0.5 line-clamp-2">{wf.description}</div>}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge color="green">{wf.filename}</Badge>
                      {wf.agents_used.map(a => (
                        <Badge key={a} color="blue"><Bot size={10} className="inline mr-0.5" />{a}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setPreviewId(previewId === wf.id ? null : wf.id) }}
                      className="p-1.5 cursor-pointer border-0 bg-transparent"
                      title="Preview"
                    >
                      {previewId === wf.id ? <EyeOff size={14} className="text-muted" /> : <Eye size={14} className="text-muted" />}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); removeWorkflow(wf.id) }}
                      className="p-1.5 cursor-pointer border-0 bg-transparent"
                      title="Remove"
                    >
                      <Trash2 size={14} className="text-muted" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview panel */}
      <div className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden sticky top-4">
        <div className="border-b border-line px-3.5 py-3">
          <h3 className="m-0 text-[14px] font-bold">
            {previewing ? previewing.title : "Preview"}
          </h3>
          {previewing && <p className="mt-0.5 text-[11px] text-muted">{previewing.filename}</p>}
        </div>
        <div className="p-3.5 max-h-[70vh] overflow-y-auto">
          {previewing ? (
            <pre className="whitespace-pre-wrap text-xs leading-relaxed font-mono m-0">{previewing.content}</pre>
          ) : (
            <div className="text-sm text-muted text-center py-8">
              <Eye size={24} className="mx-auto mb-2 opacity-30" />
              Chọn workflow bên trái để xem nội dung MD
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
