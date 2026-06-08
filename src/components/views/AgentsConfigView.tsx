"use client"

import { useState, useCallback, useEffect, type DragEvent } from "react"
import { Upload, Bot, ChevronRight, Trash2, Plus, FileText, Code, Wrench, X } from "lucide-react"
import { Badge } from "@/components/Badge"
import { useFetch } from "@/lib/hooks"

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ──────────────────────────────────────────────────────
interface AgentConfig {
  id: string
  name: string
  role: string
  mission: string
  parent_id: string | null
  skills: SkillFile[]
  scripts: ScriptFile[]
  tools: ToolConfig[]
  raw_role_md: string
}

interface SkillFile {
  id: string
  filename: string
  name: string
  type: "router" | "workflow" | "evidence" | "guardrail" | "factory"
  content: string
}

interface ScriptFile {
  id: string
  filename: string
  runtime: string
  content: string
}

interface ToolConfig {
  id: string
  kind: "mcp" | "cli"
  name: string
  config: string
}

// ─── Drop Zone ──────────────────────────────────────────────────
function DropZone({ label, accept, icon: Icon, onFiles }: {
  label: string; accept: string; icon: any; onFiles: (files: File[]) => void
}) {
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
        input.type = "file"; input.accept = accept; input.multiple = true
        input.onchange = () => { if (input.files) onFiles(Array.from(input.files)) }
        input.click()
      }}
      className={`border-2 border-dashed rounded-[var(--radius)] p-3 flex items-center gap-3 cursor-pointer transition-colors ${
        over ? "border-[#4a9966] bg-green-soft" : "border-line hover:border-[#98cba9] hover:bg-[#f7faf7]"
      }`}
    >
      <Icon size={18} className="text-muted shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted">Drag & drop or click</div>
      </div>
    </div>
  )
}

// ─── Main View ──────────────────────────────────────────────────
export function AgentsConfigView() {
  const { data: dbAgents, refetch } = useFetch<any[]>("/api/agents")
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)

  // Sync from DB on load
  useEffect(() => {
    if (dbAgents && dbAgents.length > 0 && agents.length === 0) {
      setAgents(dbAgents.map((a: any) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        mission: a.mission || "",
        parent_id: null,
        skills: [],
        scripts: [],
        tools: [],
        raw_role_md: "",
      })))
    }
  }, [dbAgents, agents.length])

  const selected = agents.find(a => a.id === selectedId) || null
  const topLevel = agents.filter(a => !a.parent_id)
  const getChildren = (id: string) => agents.filter(a => a.parent_id === id)

  // Parse uploaded ROLE.md → create agent
  const handleRoleMd = useCallback(async (files: File[]) => {
    setParsing(true)
    for (const file of files) {
      const content = await file.text()
      try {
        const res = await fetch("/api/config/parse-md", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, filename: file.name }),
        })
        const parsed = await res.json()
        if (parsed.role) {
          const newAgent: AgentConfig = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: parsed.role.name,
            role: parsed.role.name,
            mission: parsed.role.mission,
            parent_id: null,
            skills: [],
            scripts: [],
            tools: [],
            raw_role_md: content,
          }
          setAgents(prev => [...prev, newAgent])
          setSelectedId(newAgent.id)
        }
      } catch { /* ignore parse errors */ }
    }
    setParsing(false)
  }, [])

  // Add skill files to selected agent
  const handleSkillMd = useCallback(async (files: File[]) => {
    if (!selectedId) return
    setParsing(true)
    for (const file of files) {
      const content = await file.text()
      try {
        const res = await fetch("/api/config/parse-md", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, filename: file.name }),
        })
        const parsed = await res.json()
        const skill: SkillFile = {
          id: `skill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          filename: file.name,
          name: parsed.skill?.name || file.name.replace(".md", ""),
          type: "workflow",
          content,
        }
        setAgents(prev => prev.map(a =>
          a.id === selectedId ? { ...a, skills: [...a.skills, skill] } : a
        ))
      } catch { /* ignore */ }
    }
    setParsing(false)
  }, [selectedId])

  // Add script files
  const handleScripts = useCallback(async (files: File[]) => {
    if (!selectedId) return
    for (const file of files) {
      const content = await file.text()
      const ext = file.name.split(".").pop() || "js"
      const script: ScriptFile = {
        id: `script_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        filename: file.name,
        runtime: ext === "py" ? "python" : "node",
        content,
      }
      setAgents(prev => prev.map(a =>
        a.id === selectedId ? { ...a, scripts: [...a.scripts, script] } : a
      ))
    }
  }, [selectedId])

  // Add tool config
  const addTool = useCallback((kind: "mcp" | "cli") => {
    if (!selectedId) return
    const tool: ToolConfig = {
      id: `tool_${Date.now()}`,
      kind,
      name: kind === "mcp" ? "New MCP Server" : "New CLI Tool",
      config: kind === "mcp" ? '{"server_ref": "", "methods": []}' : '{"command": ""}',
    }
    setAgents(prev => prev.map(a =>
      a.id === selectedId ? { ...a, tools: [...a.tools, tool] } : a
    ))
  }, [selectedId])

  // Set as sub-agent
  const setParent = useCallback((childId: string, parentId: string | null) => {
    setAgents(prev => prev.map(a => a.id === childId ? { ...a, parent_id: parentId } : a))
  }, [])

  // Remove items
  const removeSkill = (skillId: string) => {
    setAgents(prev => prev.map(a =>
      a.id === selectedId ? { ...a, skills: a.skills.filter(s => s.id !== skillId) } : a
    ))
  }
  const removeScript = (scriptId: string) => {
    setAgents(prev => prev.map(a =>
      a.id === selectedId ? { ...a, scripts: a.scripts.filter(s => s.id !== scriptId) } : a
    ))
  }
  const removeTool = (toolId: string) => {
    setAgents(prev => prev.map(a =>
      a.id === selectedId ? { ...a, tools: a.tools.filter(t => t.id !== toolId) } : a
    ))
  }

  // Save to DB
  const saveAgent = async () => {
    if (!selected) return
    try {
      await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          role: selected.role,
          mission: selected.mission,
          skills: selected.skills,
          scripts: selected.scripts,
          tools: selected.tools,
          raw_role_md: selected.raw_role_md,
        }),
      })
      refetch()
    } catch { /* ignore */ }
  }

  return (
    <div className="grid grid-cols-[280px_1fr] gap-3.5 items-start min-h-[600px]">
      {/* Agent tree */}
      <div className="border border-line rounded-[var(--radius)] bg-surface overflow-hidden">
        <div className="border-b border-line px-3.5 py-3">
          <h2 className="m-0 text-[15px] font-bold">Agents</h2>
          <p className="mt-0.5 text-xs text-muted">Upload ROLE.md để tạo agent mới</p>
        </div>

        <div className="p-3 grid gap-2">
          <DropZone label="Upload ROLE.md" accept=".md" icon={Upload} onFiles={handleRoleMd} />
          {parsing && <div className="text-xs text-muted text-center">Parsing...</div>}

          <div className="grid gap-1 mt-1">
            {topLevel.map(agent => (
              <div key={agent.id}>
                <button
                  onClick={() => setSelectedId(agent.id)}
                  className={`w-full rounded-[var(--radius)] p-2.5 text-left flex items-center gap-2 cursor-pointer border ${
                    selectedId === agent.id ? "border-[#9ecdad] bg-green-soft" : "border-transparent hover:bg-[#f7faf7]"
                  }`}
                >
                  <Bot size={16} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{agent.name}</div>
                    <div className="text-[11px] text-muted truncate">{agent.skills.length} skills · {agent.tools.length} tools</div>
                  </div>
                  <ChevronRight size={14} className="text-muted shrink-0" />
                </button>
                {/* Sub-agents */}
                {getChildren(agent.id).map(child => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedId(child.id)}
                    className={`w-full rounded-[var(--radius)] p-2 pl-8 text-left flex items-center gap-2 cursor-pointer border ${
                      selectedId === child.id ? "border-[#9ecdad] bg-green-soft" : "border-transparent hover:bg-[#f7faf7]"
                    }`}
                  >
                    <Bot size={14} className="shrink-0 text-muted" />
                    <span className="text-sm truncate">{child.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent detail */}
      <div className="border border-line rounded-[var(--radius)] bg-surface shadow-[var(--shadow)] overflow-hidden">
        {!selected ? (
          <div className="p-8 text-center text-sm text-muted">
            <Bot size={32} className="mx-auto mb-3 opacity-30" />
            Upload ROLE.md hoặc chọn agent bên trái để config
          </div>
        ) : (
          <>
            <div className="border-b border-line px-3.5 py-3 flex items-center justify-between">
              <div>
                <h2 className="m-0 text-[15px] font-bold">{selected.name}</h2>
                <p className="mt-0.5 text-xs text-muted">{selected.mission || "No mission defined"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={saveAgent} className="h-[34px] border border-[#17211b] bg-[#17211b] text-white rounded-[var(--radius)] px-3 text-sm cursor-pointer">Save</button>
              </div>
            </div>

            <div className="p-3.5 grid gap-4">
              {/* Parent selector */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">Parent agent:</span>
                <select
                  value={selected.parent_id || ""}
                  onChange={e => setParent(selected.id, e.target.value || null)}
                  className="h-[32px] border border-line rounded-[var(--radius)] px-2 text-sm bg-white"
                >
                  <option value="">None (top-level)</option>
                  {agents.filter(a => a.id !== selected.id).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Skills */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="m-0 text-xs text-muted uppercase tracking-wider">Skills ({selected.skills.length})</h3>
                </div>
                <DropZone label="Upload SKILL.md" accept=".md" icon={FileText} onFiles={handleSkillMd} />
                {selected.skills.length > 0 && (
                  <div className="grid gap-1.5 mt-2">
                    {selected.skills.map(s => (
                      <div key={s.id} className="border border-line rounded-[var(--radius)] p-2.5 flex items-center gap-2 bg-[#fbfcfb]">
                        <FileText size={14} className="text-muted shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{s.name}</span>
                          <span className="text-[11px] text-muted ml-2">{s.filename}</span>
                        </div>
                        <Badge color="blue">{s.type}</Badge>
                        <button onClick={() => removeSkill(s.id)} className="p-1 cursor-pointer border-0 bg-transparent"><Trash2 size={13} className="text-muted" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Scripts */}
              <section>
                <h3 className="m-0 mb-2 text-xs text-muted uppercase tracking-wider">Scripts ({selected.scripts.length})</h3>
                <DropZone label="Upload scripts (.py, .js, .ts)" accept=".py,.js,.ts,.sh" icon={Code} onFiles={handleScripts} />
                {selected.scripts.length > 0 && (
                  <div className="grid gap-1.5 mt-2">
                    {selected.scripts.map(s => (
                      <div key={s.id} className="border border-line rounded-[var(--radius)] p-2.5 flex items-center gap-2 bg-[#fbfcfb]">
                        <Code size={14} className="text-muted shrink-0" />
                        <span className="text-sm flex-1">{s.filename}</span>
                        <Badge color="violet">{s.runtime}</Badge>
                        <button onClick={() => removeScript(s.id)} className="p-1 cursor-pointer border-0 bg-transparent"><Trash2 size={13} className="text-muted" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Tools (MCP + CLI) */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="m-0 text-xs text-muted uppercase tracking-wider">Connections & Tools ({selected.tools.length})</h3>
                  <div className="flex gap-1.5">
                    <button onClick={() => addTool("mcp")} className="h-[28px] border border-line rounded-[var(--radius)] px-2 text-xs flex items-center gap-1 cursor-pointer bg-white hover:bg-[#f7faf7]">
                      <Plus size={12} /> MCP
                    </button>
                    <button onClick={() => addTool("cli")} className="h-[28px] border border-line rounded-[var(--radius)] px-2 text-xs flex items-center gap-1 cursor-pointer bg-white hover:bg-[#f7faf7]">
                      <Plus size={12} /> CLI
                    </button>
                  </div>
                </div>
                {selected.tools.length > 0 && (
                  <div className="grid gap-1.5">
                    {selected.tools.map(t => (
                      <div key={t.id} className="border border-line rounded-[var(--radius)] p-2.5 bg-[#fbfcfb]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Wrench size={14} className="text-muted" />
                          <input
                            value={t.name}
                            onChange={e => {
                              const val = e.target.value
                              setAgents(prev => prev.map(a => a.id === selectedId
                                ? { ...a, tools: a.tools.map(tool => tool.id === t.id ? { ...tool, name: val } : tool) }
                                : a
                              ))
                            }}
                            className="flex-1 h-[28px] border border-line rounded px-2 text-sm bg-white"
                          />
                          <Badge color={t.kind === "mcp" ? "green" : "amber"}>{t.kind.toUpperCase()}</Badge>
                          <button onClick={() => removeTool(t.id)} className="p-1 cursor-pointer border-0 bg-transparent"><Trash2 size={13} className="text-muted" /></button>
                        </div>
                        <textarea
                          value={t.config}
                          onChange={e => {
                            const val = e.target.value
                            setAgents(prev => prev.map(a => a.id === selectedId
                              ? { ...a, tools: a.tools.map(tool => tool.id === t.id ? { ...tool, config: val } : tool) }
                              : a
                            ))
                          }}
                          className="w-full h-[60px] border border-line rounded px-2 py-1.5 text-xs font-mono bg-white resize-y"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {selected.tools.length === 0 && (
                  <div className="text-xs text-muted">Chưa có tool nào. Bấm + MCP hoặc + CLI để thêm.</div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
