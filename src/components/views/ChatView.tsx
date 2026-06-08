"use client"

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type FormEvent } from "react"
import { Send, Bot, User, Loader2, AtSign, FileText, X, MessageCircle } from "lucide-react"
import { Badge } from "@/components/Badge"

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ──────────────────────────────────────────────────────
interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  workflow_ref?: string
  timestamp: string
  provider?: string
  model?: string
}

interface WorkflowRef {
  filename: string
  title: string
  content: string
}

// ─── Chat View ──────────────────────────────────────────────────
export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showWorkflowPicker, setShowWorkflowPicker] = useState(false)
  const [attachedWorkflow, setAttachedWorkflow] = useState<WorkflowRef | null>(null)
  const [workflows] = useState<WorkflowRef[]>([]) // Will be populated from uploaded workflows
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Create or get session
  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: "Chat Session",
          industry: "General",
          problem: "General chat",
        }),
      })
      const data = await res.json()
      const id = data.session?.id || data.id
      setSessionId(id)
      return id
    } catch {
      throw new Error("Failed to create session")
    }
  }, [sessionId])

  // Send message
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return

    // Add user message to UI immediately
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      workflow_ref: attachedWorkflow?.filename,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setSending(true)

    try {
      const sid = await ensureSession()

      // Build content with workflow context if attached
      let fullContent = text
      if (attachedWorkflow) {
        fullContent = `[Context: @${attachedWorkflow.filename}]\n\n---\nWorkflow content:\n${attachedWorkflow.content}\n---\n\nUser request: ${text}`
      }

      const res = await fetch(`/api/campaigns/${sid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fullContent, role: "user" }),
      })

      const data = await res.json()

      if (data.aiMessage) {
        setMessages(prev => [...prev, {
          id: data.aiMessage.id || `ai_${Date.now()}`,
          role: "assistant",
          content: data.aiMessage.content,
          timestamp: data.aiMessage.created_at || new Date().toISOString(),
          provider: data.provider,
          model: data.model,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: "assistant",
        content: "⚠️ Lỗi kết nối. Vui lòng thử lại.",
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
      setAttachedWorkflow(null)
    }
  }, [input, sending, attachedWorkflow, ensureSession])

  // Handle keyboard
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    // @ trigger for workflow picker
    if (e.key === "@") {
      setShowWorkflowPicker(true)
    }
  }

  // Handle input change — detect @workflow
  const handleInputChange = (val: string) => {
    setInput(val)
    if (val.includes("@") && !attachedWorkflow) {
      setShowWorkflowPicker(true)
    } else {
      setShowWorkflowPicker(false)
    }
  }

  // New session
  const handleNewChat = () => {
    setMessages([])
    setSessionId(null)
    setAttachedWorkflow(null)
    setInput("")
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] border border-line rounded-[var(--radius)] bg-surface overflow-hidden">
      {/* Header */}
      <div className="border-b border-line px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h2 className="m-0 text-[15px] font-bold flex items-center gap-2">
            <MessageCircle size={18} />
            Chat
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Gõ @workflow.md để gắn use case → Chat với LLM
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sessionId && (
            <Badge color="green">Session active</Badge>
          )}
          <button
            onClick={handleNewChat}
            className="h-[32px] border border-line rounded-[var(--radius)] px-3 text-xs cursor-pointer bg-white hover:bg-[#f7faf7]"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <Bot size={48} className="mx-auto mb-4 text-muted opacity-30" />
            <h3 className="text-base font-bold mb-1">Mind Agent Chat</h3>
            <p className="text-sm text-muted max-w-[400px] mx-auto leading-relaxed">
              Bắt đầu chat hoặc gõ <span className="font-mono bg-[#f0f4f1] px-1 py-0.5 rounded">@workflow.md</span> để gắn 1 use case vào cuộc trò chuyện.
            </p>
            <div className="mt-4 grid gap-2 max-w-[380px] mx-auto">
              {["Đọc @WF_06 và build cho tôi CRM bất động sản", "Tư vấn giải pháp AI cho SMB vận hành", "Phân tích quy trình order processing"].map(hint => (
                <button
                  key={hint}
                  onClick={() => { setInput(hint); inputRef.current?.focus() }}
                  className="text-left border border-line rounded-[var(--radius)] p-2.5 text-xs cursor-pointer bg-white hover:bg-[#f7faf7] transition-colors"
                >
                  <span className="text-muted">→</span> {hint}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 max-w-[720px] mx-auto">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-[30px] h-[30px] rounded-[var(--radius)] bg-[#142018] text-white grid place-items-center shrink-0 mt-0.5">
                    <Bot size={16} />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-[var(--radius)] p-3 ${
                  msg.role === "user"
                    ? "bg-[#17211b] text-white"
                    : "bg-[#f0f4f1] border border-line"
                }`}>
                  {msg.workflow_ref && (
                    <div className="flex items-center gap-1 mb-1.5">
                      <Badge color="blue"><AtSign size={10} /> {msg.workflow_ref}</Badge>
                    </div>
                  )}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  {msg.provider && (
                    <div className="mt-1.5 text-[10px] opacity-60">{msg.provider} · {msg.model}</div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-[30px] h-[30px] rounded-[var(--radius)] bg-[#e8ede9] grid place-items-center shrink-0 mt-0.5">
                    <User size={16} className="text-muted" />
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex gap-2.5">
                <div className="w-[30px] h-[30px] rounded-[var(--radius)] bg-[#142018] text-white grid place-items-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="bg-[#f0f4f1] border border-line rounded-[var(--radius)] p-3">
                  <Loader2 size={16} className="animate-spin text-muted" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-line p-3 shrink-0">
        {/* Attached workflow badge */}
        {attachedWorkflow && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <Badge color="blue">
              <FileText size={11} className="mr-1" />
              @{attachedWorkflow.filename}
            </Badge>
            <button onClick={() => setAttachedWorkflow(null)} className="p-0.5 cursor-pointer border-0 bg-transparent">
              <X size={12} className="text-muted" />
            </button>
            <span className="text-[11px] text-muted">Workflow content sẽ được gửi cùng tin nhắn</span>
          </div>
        )}

        {/* Workflow picker dropdown */}
        {showWorkflowPicker && workflows.length > 0 && (
          <div className="mb-2 border border-line rounded-[var(--radius)] bg-white shadow-[var(--shadow)] max-h-[160px] overflow-y-auto">
            {workflows.map(wf => (
              <button
                key={wf.filename}
                onClick={() => {
                  setAttachedWorkflow(wf)
                  setShowWorkflowPicker(false)
                  setInput(input.replace(/@\S*$/, ""))
                  inputRef.current?.focus()
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[#f7faf7] border-0 bg-transparent cursor-pointer flex items-center gap-2"
              >
                <FileText size={14} className="text-muted" />
                <span className="font-medium">{wf.title}</span>
                <span className="text-[11px] text-muted ml-auto">{wf.filename}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 max-w-[720px] mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Gõ tin nhắn... (dùng @workflow.md để gắn use case)"
            rows={1}
            className="flex-1 min-h-[42px] max-h-[120px] border border-line rounded-[var(--radius)] px-3 py-2.5 text-sm resize-none bg-white focus:outline-none focus:border-[#9ecdad]"
            style={{ height: "auto" }}
            onInput={e => {
              const el = e.target as HTMLTextAreaElement
              el.style.height = "auto"
              el.style.height = Math.min(el.scrollHeight, 120) + "px"
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={`h-[42px] w-[42px] rounded-[var(--radius)] grid place-items-center border-0 cursor-pointer transition-colors shrink-0 ${
              input.trim() && !sending
                ? "bg-[#17211b] text-white"
                : "bg-[#e8ede9] text-muted cursor-not-allowed"
            }`}
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
