export interface Agent {
  id: string
  name: string
  role: string
  scope: string
  status: "production" | "draft" | "paused"
  policy: string
  owner: string
  model: string
  mission: string
  sowIn: string[]
  sowOut: string[]
  inputs: string[]
  outputs: string[]
}

export interface WorkflowStep {
  title: string
  owner: string
  badge: string
  body: string
}

export interface Session {
  id: string
  title: string
  company: string
  status: string
  pain: string
  contact: string
  score: string
  offer: string
  messages: [string, string][]
}

export interface ConfigTarget {
  id: string
  type: string
  title: string
  summary: string
  record: string
  slug: string
  version: string
  gate: string
  risk: string
  primaryOutput: string
  dbHome: string[]
}

export interface ConfigStep {
  key: string
  title: string
  purpose: string
  fields: [string, string][]
  checks: string[]
  contracts: [string, string][]
  writes: string[]
}

export const agents: Agent[] = [
  {
    id: "mind-ai-consultant",
    name: "Mind AI Consultant",
    role: "Customer-facing diagnosis",
    scope: "Intake, diagnosis, first workflow recommendation",
    status: "production",
    policy: "Approval before proposal",
    owner: "Founder",
    model: "Fast reasoning",
    mission: "Act as one clear consultant for SMB owners. Ask enough to understand pain, then convert the chat into a useful business handoff.",
    sowIn: ["Qualify inbound website chat", "Extract business profile and workflow pain", "Recommend first workflow to fix", "Create lead qualification and proposal seed"],
    sowOut: ["Do not promise custom pricing without founder approval", "Do not run external tool actions", "Do not present itself as multiple internal agents"],
    inputs: ["industry", "company_size", "departments", "website", "first_problem", "chat_messages", "contact_email"],
    outputs: ["consultant_summary", "pain_map", "workflow_recommendation", "lead_score", "proposal_seed_json", "handoff_to_planner"]
  },
  {
    id: "workflow-automation-architect",
    name: "Workflow Automation Architect",
    role: "Workflow and automation governance",
    scope: "Map process, owners, Base schema, risks",
    status: "production",
    policy: "Evidence gate required",
    owner: "Founder",
    model: "Reasoning",
    mission: "Turn a messy SMB workflow into a practical operating system with clear forms, tables, owners, views, automations, and QA.",
    sowIn: ["Map current and target workflow", "Design Lark/Base schema and approval points", "Score automation readiness", "Identify handoff and adoption risks"],
    sowOut: ["Do not build templates directly", "Do not add automation before workflow clarity", "Do not make unsupported ROI claims"],
    inputs: ["business_context", "process_steps", "roles", "exceptions", "current_tools", "desired_dashboard"],
    outputs: ["workflow_architecture", "base_schema", "automation_governance_scorecard", "tool_contracts", "risk_register"]
  },
  {
    id: "planner-manager",
    name: "Mind AI Planner Manager",
    role: "Build brief and task packet",
    scope: "Convert approved diagnosis into execution packet",
    status: "production",
    policy: "Founder can edit SOW",
    owner: "Founder",
    model: "Balanced",
    mission: "Create a buildable task packet that downstream agents can execute without losing business context.",
    sowIn: ["Research use-case details", "Create build brief", "Define acceptance criteria", "Route to builder or marketer"],
    sowOut: ["Do not publish", "Do not rewrite brand positioning", "Do not create vague implementation specs"],
    inputs: ["consultant_summary", "approved_scope", "workflow_architecture", "target_persona", "deadline"],
    outputs: ["task_packet", "implementation_brief", "acceptance_criteria", "builder_handoff", "marketing_angle"]
  },
  {
    id: "lark-template-builder",
    name: "Lark Template Builder",
    role: "Lark/Base build execution",
    scope: "Build template assets and setup docs",
    status: "draft",
    policy: "Tool approval required",
    owner: "Founder",
    model: "Tool capable",
    mission: "Build the concrete Lark template, demo data, screenshots, and setup assets from an approved task packet.",
    sowIn: ["Create Base/table structure", "Prepare views, forms, dashboards", "Generate setup guide and demo data", "Capture build evidence"],
    sowOut: ["Do not change client-facing terms", "Do not publish CMS assets", "Do not run destructive Lark operations"],
    inputs: ["task_packet", "base_schema", "demo_data", "view_spec", "automation_rules"],
    outputs: ["lark_template_link", "setup_guide", "screenshots", "media_manifest", "evidence_gate_input"]
  },
  {
    id: "orchestrator-chief",
    name: "Orchestrator Chief Of Staff",
    role: "Evidence and routing gate",
    scope: "Verify done means done",
    status: "production",
    policy: "Can block handoff",
    owner: "Founder",
    model: "Reasoning",
    mission: "Protect the system from sloppy handoffs, missing evidence, stale context, and agent role drift.",
    sowIn: ["Review packet status", "Check required outputs", "Validate evidence", "Route next owner"],
    sowOut: ["Do not build content itself", "Do not approve public claims without source", "Do not ignore founder decisions"],
    inputs: ["task_packet_status", "output_manifest", "evidence_items", "founder_decisions"],
    outputs: ["evidence_gate_report", "blocked_items", "handoff_decision", "next_action"]
  }
]

export const workflowSteps: WorkflowStep[] = [
  { title: "Start website session", owner: "MindAI public API", badge: "Session", body: "Create session, capture industry, company size, departments, website, and first problem." },
  { title: "Consultant diagnosis", owner: "Mind AI Consultant", badge: "Agent", body: "Ask follow-up questions, extract pain map, recommend the first workflow to fix." },
  { title: "Context snapshot", owner: "Memory Service", badge: "Memory", body: "Compress chat into protected facts, session summary, decisions, and handoff delta." },
  { title: "Lead qualification", owner: "Runtime DB", badge: "Score", body: "Write lead score, fit reason, recommended offer, urgency, budget signal, and next action." },
  { title: "Proposal seed", owner: "Planner Manager", badge: "Output", body: "Generate scope, suggested Starter Sprint, implementation path, assumptions, and open questions." },
  { title: "Founder approval", owner: "Approval Queue", badge: "Gate", body: "Founder approves, edits, rejects, or asks the agent to collect more information." }
]

export const runEvents: [string, string, string, string][] = [
  ["14:02", "Session created", "mind-ai-session-240604-01", "Done"],
  ["14:03", "Contact captured", "email, website, company size", "Done"],
  ["14:05", "Diagnosis completed", "Daily sales reporting pain", "Done"],
  ["14:06", "Context snapshot written", "snapshot v3, 64% token reduction", "Done"],
  ["14:08", "Proposal seed generated", "Starter Sprint suggested", "Review"],
  ["14:09", "Approval requested", "Founder must approve send-out", "Waiting"]
]

export const sessions: Session[] = [
  {
    id: "sess-240604-retail",
    title: "Retail chain owner",
    company: "3 branches, HCMC",
    status: "Review",
    pain: "Owner chases daily sales reports over Zalo and cannot compare branches.",
    contact: "minh@example.com",
    score: "82",
    offer: "Daily Sales Starter Sprint",
    messages: [
      ["user", "Tôi có 3 cửa hàng, mỗi ngày phải nhắn Zalo hỏi doanh số từng chi nhánh."],
      ["agent", "Mình sẽ gom lại thành một workflow: nhân viên nhập một lần, chủ xem dashboard và chỉ nhận cảnh báo khi có lệch số."],
      ["user", "Đúng, tôi cần biết cửa hàng nào tụt doanh thu hoặc thiếu hàng nhanh hơn."]
    ]
  },
  {
    id: "sess-240604-spa",
    title: "Spa operations lead",
    company: "2 locations",
    status: "Qualified",
    pain: "Customer follow-up and service issue handoff are scattered.",
    contact: "linh@example.com",
    score: "76",
    offer: "Mini CRM + Issue Tracker",
    messages: [
      ["user", "Khách phản hồi trên Zalo rồi bị trôi, nhân viên quên follow-up."],
      ["agent", "Workflow đầu tiên nên là mini CRM kèm issue tracker, có owner và trạng thái rõ."]
    ]
  },
  {
    id: "sess-240604-fnb",
    title: "Cafe manager",
    company: "5 stores",
    status: "Needs info",
    pain: "Checklist and shift handoff are not consistent between stores.",
    contact: "pending",
    score: "61",
    offer: "Store Checklist Sprint",
    messages: [
      ["user", "Quản lý ca mỗi nơi làm một kiểu."],
      ["agent", "Mình cần thêm thông tin về checklist hiện tại và ai là người chịu trách nhiệm đóng ca."]
    ]
  }
]

export const configTargets: ConfigTarget[] = [
  {
    id: "agent-consultant",
    type: "Agent config",
    title: "Mind AI Consultant",
    summary: "Front-facing company person for website intake and diagnosis.",
    record: "agent_version",
    slug: "mind-ai-consultant",
    version: "v0.3 draft",
    gate: "Needs test run",
    risk: "Medium",
    primaryOutput: "consultant_summary + proposal_seed_json",
    dbHome: ["agents", "agent_versions", "agent_tool_permissions", "agent_eval_rubrics"]
  },
  {
    id: "workflow-intake",
    type: "Workflow config",
    title: "Website MindAI Intake",
    summary: "Public chat to session, lead score, proposal seed, founder approval, planner handoff.",
    record: "workflow_version",
    slug: "website-mindai-intake",
    version: "v0.1 draft",
    gate: "Needs API contract",
    risk: "Medium",
    primaryOutput: "lead_qualification + approval_request + handoff",
    dbHome: ["workflows", "workflow_versions", "workflow_steps", "workflow_runs"]
  },
  {
    id: "memory-protocol",
    type: "Memory config",
    title: "Context Compaction Protocol",
    summary: "Protect critical facts and compact long sessions before handoff.",
    record: "memory_policy_version",
    slug: "context-compaction-v0",
    version: "v0.1 draft",
    gate: "Needs memory-loss eval",
    risk: "High",
    primaryOutput: "context_snapshot + protected_facts + handoff_delta",
    dbHome: ["context_snapshots", "memory_items", "protected_facts", "handoffs"]
  }
]

export const configSteps: ConfigStep[] = [
  {
    key: "identity", title: "Identity",
    purpose: "Name the config target, owner, surface, version, and business reason before touching prompts or tools.",
    fields: [["Slug", "Stable system id"], ["Owner", "Founder or role owner"], ["Surface", "Website, admin, internal workflow"], ["Business goal", "What this config must make possible"]],
    checks: ["Unique slug", "Owner exists", "Surface is clear", "Goal maps to Mindtransform ICP"],
    contracts: [["record_type", "Versioned runtime record"], ["status", "Draft until test and founder approval"], ["source_of_truth", "Runtime DB, not website state"]],
    writes: ["version table", "audit_events"]
  },
  {
    key: "sow", title: "SOW",
    purpose: "Lock what the target can and cannot do so the system does not drift into generic AI automation.",
    fields: [["In scope", "Allowed responsibilities"], ["Out of scope", "Blocked responsibilities"], ["Escalation rule", "When founder approval is required"], ["Drift alert", "What should stop the run"]],
    checks: ["In/out scope is explicit", "Approval gate exists", "Brand/ICP guardrail exists", "No unsupported promise"],
    contracts: [["sow_in", "Array of allowed jobs"], ["sow_out", "Array of blocked jobs"], ["approval_policy", "Required before risky output"]],
    writes: ["policy tables", "protected_facts"]
  },
  {
    key: "inputs", title: "Inputs",
    purpose: "Define exactly what data is needed before the system can run reliably.",
    fields: [["Required input", "Minimum fields"], ["Optional input", "Helpful fields"], ["Missing-data path", "Ask follow-up or mark needs_info"], ["PII handling", "Where contact data is stored"]],
    checks: ["Required input is not too heavy", "Contact data is separated", "Missing-data state exists", "Website fields are mapped"],
    contracts: [["input_schema", "Typed required/optional fields"], ["field_map", "Website/API to runtime mapping"], ["validation", "Reject or ask when missing"]],
    writes: ["sessions", "contacts/leads", "session_messages"]
  },
  {
    key: "outputs", title: "Outputs",
    purpose: "Force the target to produce useful artifacts, not just a pretty chat answer.",
    fields: [["Customer output", "Readable answer"], ["Founder output", "Score, risk, next action"], ["Agent handoff", "Compact payload for next role"], ["Artifact format", "Markdown, JSON, DB row, file link"]],
    checks: ["Every output has owner", "Output can be audited", "Next agent can use it", "No public send before approval"],
    contracts: [["output_schema", "Named structured artifacts"], ["handoff_delta", "Only next-agent context"], ["artifact_links", "Evidence paths when available"]],
    writes: ["artifacts", "handoffs", "lead_qualification"]
  },
  {
    key: "tools", title: "Tools",
    purpose: "Decide what tools can run automatically, what needs approval, and what is blocked.",
    fields: [["Allowed tools", "Read/write within runtime"], ["Approval tools", "Email, CRM sync, task packet creation"], ["Blocked tools", "Public post, pricing change, destructive Lark action"], ["Audit", "Input/output/cost/decision per call"]],
    checks: ["No side effect without permission", "Every call logs evidence", "Blocked actions are explicit", "Cost guardrail applies"],
    contracts: [["tool_policy.allowed", "Safe runtime actions"], ["tool_policy.approval_required", "External or commercial actions"], ["tool_policy.blocked", "Risky/destructive actions"]],
    writes: ["tool_permissions", "tool_calls", "approval_requests"]
  },
  {
    key: "memory", title: "Memory",
    purpose: "Define what gets remembered, compacted, protected, or excluded from future prompts.",
    fields: [["Compaction trigger", "Message count, handoff, token threshold"], ["Protected facts", "Contact, scope, founder decisions, ICP"], ["Overwrite rule", "Requires newer evidence"], ["Prompt assembly", "What enters next model call"]],
    checks: ["Critical facts survive compaction", "Snapshot has source range", "Old claims are filtered", "Prompt token budget is visible"],
    contracts: [["context_snapshot", "Summary + decisions + risks"], ["protected_facts", "Facts with source and freshness"], ["prompt_context", "Protected facts + latest snapshot + current task"]],
    writes: ["context_snapshots", "memory_items", "protected_facts"]
  },
  {
    key: "test_publish", title: "Test & Publish",
    purpose: "Run a test case, attach evidence, and publish only after founder approval.",
    fields: [["Test case", "Scenario to simulate"], ["Pass criteria", "Required outputs and quality"], ["Failure signal", "Brand drift, vague output, missing boundary"], ["Publish action", "Create production version"]],
    checks: ["Output contract complete", "Brand drift check passes", "Cost below threshold", "Founder decision recorded"],
    contracts: [["eval_case", "Repeatable test"], ["publish_gate", "Test + evidence + approval"], ["rollback", "Previous version remains available"]],
    writes: ["eval_cases", "eval_runs", "approval_decisions", "version table"]
  }
]
