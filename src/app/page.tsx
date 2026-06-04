"use client";

import { type ReactNode, useMemo, useState } from "react";

type View = "config" | "agents" | "workflows" | "sessions" | "memory" | "database" | "costs";

type AgentStatus = "production" | "draft" | "review";

type Agent = {
  id: string;
  name: string;
  role: string;
  scope: string;
  status: AgentStatus;
  policy: string;
  owner: string;
  model: string;
  mission: string;
  sowIn: string[];
  sowOut: string[];
  inputs: string[];
  outputs: string[];
};

type ConfigTarget = {
  id: string;
  type: string;
  title: string;
  summary: string;
  version: string;
  gate: string;
  risk: "Low" | "Medium" | "High";
  record: string;
  slug: string;
  primaryOutput: string;
  tables: string[];
};

type ConfigStep = {
  key: string;
  title: string;
  purpose: string;
  fields: [string, string][];
  checks: string[];
  contracts: [string, string][];
  writes: string[];
};

type Session = {
  id: string;
  title: string;
  company: string;
  status: string;
  pain: string;
  contact: string;
  score: number;
  offer: string;
  messages: [role: "User" | "Mind AI", text: string][];
};

const navItems: { id: View; label: string; hint: string }[] = [
  { id: "config", label: "Config", hint: "Define runtime versions" },
  { id: "agents", label: "Agents", hint: "Registry and contracts" },
  { id: "workflows", label: "Workflows", hint: "Run maps and gates" },
  { id: "sessions", label: "Sessions", hint: "Website intake inbox" },
  { id: "memory", label: "Memory", hint: "Snapshots and facts" },
  { id: "database", label: "Database", hint: "Runtime tables" },
  { id: "costs", label: "Costs", hint: "Budget and evals" },
];

const viewCopy: Record<View, { title: string; subtitle: string }> = {
  config: {
    title: "Config Studio",
    subtitle: "Configure agent, workflow, and memory versions before production publish.",
  },
  agents: {
    title: "Agent Registry",
    subtitle: "Inspect every agent role, SOW, input contract, output contract, policy, and status.",
  },
  workflows: {
    title: "Workflow Registry",
    subtitle: "Track the first sellable flow from website MindAI intake to proposal seed.",
  },
  sessions: {
    title: "Session Inbox",
    subtitle: "Review active website sessions, lead scores, pain maps, offers, and next actions.",
  },
  memory: {
    title: "Memory Control",
    subtitle: "Protect critical facts, compact context, and hand off only what the next agent needs.",
  },
  database: {
    title: "Runtime Database",
    subtitle: "Separate agent runtime data model for sessions, workflows, tools, approvals, and costs.",
  },
  costs: {
    title: "Cost And Eval",
    subtitle: "Track model calls, token budgets, quality checks, and approval thresholds.",
  },
};

const agents: Agent[] = [
  {
    id: "mind-ai-consultant",
    name: "Mind AI Consultant",
    role: "Customer-facing diagnosis",
    scope: "Intake, pain map, first workflow recommendation, proposal seed",
    status: "production",
    policy: "Founder approval before proposal send",
    owner: "Founder",
    model: "Fast reasoning",
    mission:
      "Act as one clear consultant for SMB owners and convert a chat into a practical implementation handoff.",
    sowIn: ["Qualify inbound chat", "Extract business context", "Recommend first workflow", "Create lead score"],
    sowOut: ["No final pricing promise", "No external tool action", "No public posting"],
    inputs: ["industry", "company_size", "first_problem", "website", "chat_messages", "contact_email"],
    outputs: ["consultant_summary", "pain_map", "workflow_recommendation", "lead_score", "proposal_seed_json"],
  },
  {
    id: "workflow-automation-architect",
    name: "Workflow Automation Architect",
    role: "Workflow and automation governance",
    scope: "Map process, owner, Base schema, automation fit, risks",
    status: "production",
    policy: "Evidence gate required",
    owner: "Founder",
    model: "Reasoning",
    mission:
      "Turn a messy SMB process into a practical operating system with forms, tables, owners, views, and useful automation.",
    sowIn: ["Map current workflow", "Design target workflow", "Score automation readiness", "Define tool contracts"],
    sowOut: ["No template build", "No unsupported ROI claim", "No automation before workflow clarity"],
    inputs: ["business_context", "process_steps", "roles", "exceptions", "current_tools"],
    outputs: ["workflow_architecture", "base_schema", "automation_scorecard", "risk_register"],
  },
  {
    id: "planner-manager",
    name: "Mind AI Planner Manager",
    role: "Task packet planner",
    scope: "Convert approved diagnosis into a buildable execution packet",
    status: "production",
    policy: "Founder can edit SOW",
    owner: "Founder",
    model: "Balanced",
    mission:
      "Create a clear task packet so downstream agents can execute without re-reading the full chat.",
    sowIn: ["Create build brief", "Define acceptance criteria", "Route builder handoff", "Map marketing angle"],
    sowOut: ["No publishing", "No brand rewrite", "No vague implementation specs"],
    inputs: ["consultant_summary", "approved_scope", "workflow_architecture", "deadline"],
    outputs: ["task_packet", "implementation_brief", "acceptance_criteria", "builder_handoff"],
  },
  {
    id: "lark-template-builder",
    name: "Lark Template Builder",
    role: "Lark/Base build execution",
    scope: "Build template assets, demo data, screenshots, and docs",
    status: "draft",
    policy: "Tool approval required",
    owner: "Founder",
    model: "Tool capable",
    mission:
      "Build the concrete Lark template and setup evidence from an approved task packet.",
    sowIn: ["Create Base structure", "Prepare views and forms", "Generate demo data", "Capture evidence"],
    sowOut: ["No client-facing terms", "No CMS publish", "No destructive Lark operation"],
    inputs: ["task_packet", "base_schema", "demo_data", "view_spec"],
    outputs: ["lark_template_link", "setup_guide", "screenshots", "evidence_manifest"],
  },
  {
    id: "orchestrator-chief",
    name: "Orchestrator Chief Of Staff",
    role: "Evidence and routing gate",
    scope: "Verify output quality, block weak handoffs, route next action",
    status: "review",
    policy: "Can block handoff",
    owner: "Founder",
    model: "Reasoning",
    mission:
      "Protect the system from missing evidence, stale context, sloppy handoffs, and role drift.",
    sowIn: ["Review packet status", "Validate evidence", "Check required outputs", "Route next owner"],
    sowOut: ["No content build", "No unsourced approval", "No ignoring founder decisions"],
    inputs: ["task_packet_status", "output_manifest", "evidence_items", "founder_decisions"],
    outputs: ["evidence_gate_report", "blocked_items", "handoff_decision", "next_action"],
  },
];

const configTargets: ConfigTarget[] = [
  {
    id: "agent-consultant",
    type: "Agent config",
    title: "Mind AI Consultant",
    summary: "Front-facing company person for website intake and workflow diagnosis.",
    version: "v0.3 draft",
    gate: "Needs test run",
    risk: "Medium",
    record: "agent_version",
    slug: "mind-ai-consultant",
    primaryOutput: "consultant_summary + proposal_seed_json",
    tables: ["agents", "agent_versions", "agent_tool_permissions", "agent_eval_rubrics"],
  },
  {
    id: "workflow-intake",
    type: "Workflow config",
    title: "Website MindAI Intake",
    summary: "Public chat to session, lead score, proposal seed, approval, and Planner handoff.",
    version: "v0.1 draft",
    gate: "Needs API contract",
    risk: "Medium",
    record: "workflow_version",
    slug: "website-mindai-intake",
    primaryOutput: "lead_qualification + approval_request + handoff",
    tables: ["workflows", "workflow_versions", "workflow_steps", "workflow_runs"],
  },
  {
    id: "memory-protocol",
    type: "Memory config",
    title: "Context Compaction Protocol",
    summary: "Protect critical facts and compact long sessions before handoff.",
    version: "v0.1 draft",
    gate: "Needs memory-loss eval",
    risk: "High",
    record: "memory_policy_version",
    slug: "context-compaction-v0",
    primaryOutput: "context_snapshot + protected_facts + handoff_delta",
    tables: ["context_snapshots", "memory_items", "protected_facts", "handoffs"],
  },
];

const configSteps: ConfigStep[] = [
  {
    key: "identity",
    title: "Identity",
    purpose: "Name the target, owner, surface, version, and business reason before prompts or tools.",
    fields: [
      ["Slug", "Stable system id"],
      ["Owner", "Founder or role owner"],
      ["Surface", "Website, admin, or internal workflow"],
      ["Business goal", "What this config must make possible"],
    ],
    checks: ["Unique slug", "Owner exists", "Surface is clear", "Goal maps to SMB workflow ICP"],
    contracts: [
      ["record_type", "Versioned runtime record"],
      ["status", "Draft until test and founder approval"],
      ["source_of_truth", "Runtime DB, not website state"],
    ],
    writes: ["version table", "audit_events"],
  },
  {
    key: "sow",
    title: "SOW",
    purpose: "Lock what the target can and cannot do so it does not drift into generic AI automation.",
    fields: [
      ["In scope", "Allowed responsibilities"],
      ["Out of scope", "Blocked responsibilities"],
      ["Escalation rule", "When founder approval is required"],
      ["Drift alert", "What should stop the run"],
    ],
    checks: ["In/out scope is explicit", "Approval gate exists", "Brand guardrail exists", "No unsupported promise"],
    contracts: [
      ["sow_in", "Array of allowed jobs"],
      ["sow_out", "Array of blocked jobs"],
      ["approval_policy", "Required before risky output"],
    ],
    writes: ["policy tables", "protected_facts"],
  },
  {
    key: "inputs",
    title: "Inputs",
    purpose: "Define exactly what data is needed before the system can run reliably.",
    fields: [
      ["Required input", "industry, company_size, first_problem"],
      ["Optional input", "departments, website, current_tools, locations"],
      ["Missing-data path", "Ask follow-up or mark needs_info"],
      ["PII handling", "Contact data stored in leads/contacts"],
    ],
    checks: ["Required input is not too heavy", "Contact data is separated", "Missing-data state exists", "Website fields are mapped"],
    contracts: [
      ["input_schema", "Typed required and optional fields"],
      ["field_map", "Website/API to runtime mapping"],
      ["validation", "Reject or ask when missing"],
    ],
    writes: ["sessions", "contacts", "leads", "session_messages"],
  },
  {
    key: "outputs",
    title: "Outputs",
    purpose: "Force useful artifacts, not just a nice chat reply.",
    fields: [
      ["Customer output", "Readable diagnosis"],
      ["Founder output", "Score, risk, next action"],
      ["Agent handoff", "Compact payload for next role"],
      ["Artifact format", "Markdown, JSON, DB row, file link"],
    ],
    checks: ["Every output has owner", "Output can be audited", "Next agent can use it", "No public send before approval"],
    contracts: [
      ["output_schema", "Named structured artifacts"],
      ["handoff_delta", "Only next-agent context"],
      ["artifact_links", "Evidence paths when available"],
    ],
    writes: ["artifacts", "handoffs", "lead_qualification"],
  },
  {
    key: "tools",
    title: "Tools",
    purpose: "Decide what runs automatically, what needs approval, and what is blocked.",
    fields: [
      ["Allowed tools", "Read/write within runtime"],
      ["Approval tools", "Email, CRM sync, task packet creation"],
      ["Blocked tools", "Public post, pricing change, destructive Lark action"],
      ["Audit", "Input/output/cost/decision per call"],
    ],
    checks: ["No side effect without permission", "Every call logs evidence", "Blocked actions are explicit", "Cost guardrail applies"],
    contracts: [
      ["tool_policy.allowed", "Safe runtime actions"],
      ["tool_policy.approval_required", "External or commercial actions"],
      ["tool_policy.blocked", "Risky/destructive actions"],
    ],
    writes: ["tool_permissions", "tool_calls", "approval_requests"],
  },
  {
    key: "memory",
    title: "Memory",
    purpose: "Define what gets remembered, compacted, protected, or excluded from future prompts.",
    fields: [
      ["Compaction trigger", "Message count, handoff, token threshold"],
      ["Protected facts", "Contact, scope, founder decisions, ICP"],
      ["Overwrite rule", "Requires newer evidence"],
      ["Prompt assembly", "What enters next model call"],
    ],
    checks: ["Critical facts survive compaction", "Snapshot has source range", "Old claims are filtered", "Prompt token budget is visible"],
    contracts: [
      ["context_snapshot", "Summary, decisions, and risks"],
      ["protected_facts", "Facts with source and freshness"],
      ["prompt_context", "Protected facts + latest snapshot + current task"],
    ],
    writes: ["context_snapshots", "memory_items", "protected_facts"],
  },
  {
    key: "publish",
    title: "Test & Publish",
    purpose: "Run a test case, attach evidence, and publish only after founder approval.",
    fields: [
      ["Test case", "Retail owner chasing daily sales reports by chat"],
      ["Pass criteria", "Required outputs and quality"],
      ["Failure signal", "Brand drift, vague output, missing boundary"],
      ["Publish action", "Create production version"],
    ],
    checks: ["Output contract complete", "Brand drift check passes", "Cost below threshold", "Founder decision recorded"],
    contracts: [
      ["eval_case", "Repeatable test"],
      ["publish_gate", "Test + evidence + approval"],
      ["rollback", "Previous version remains available"],
    ],
    writes: ["eval_cases", "eval_runs", "approval_decisions", "version table"],
  },
];

const workflowSteps = [
  ["Start website session", "MindAI public API", "Capture industry, company size, website, and first problem."],
  ["Consultant diagnosis", "Mind AI Consultant", "Ask follow-up questions, extract pain map, recommend first workflow."],
  ["Context snapshot", "Memory Service", "Compact chat into protected facts, decisions, risks, and handoff delta."],
  ["Lead qualification", "Runtime DB", "Write lead score, fit reason, offer, urgency, and next action."],
  ["Proposal seed", "Planner Manager", "Generate starter scope, assumptions, open questions, and implementation path."],
  ["Founder approval", "Approval Queue", "Approve, edit, reject, or request more info before handoff."],
];

const runTrace = [
  ["14:02", "Session created", "mind-ai-session-240604-01", "Done"],
  ["14:03", "Contact captured", "email, website, company size", "Done"],
  ["14:05", "Diagnosis completed", "Daily sales reporting pain", "Done"],
  ["14:06", "Context snapshot written", "64 percent token reduction", "Done"],
  ["14:08", "Proposal seed generated", "Starter Sprint suggested", "Review"],
  ["14:09", "Approval requested", "Founder must approve send-out", "Waiting"],
];

const sessions: Session[] = [
  {
    id: "sess-retail",
    title: "Retail chain owner",
    company: "3 branches, HCMC",
    status: "Review",
    pain: "Owner chases daily sales reports over Zalo and cannot compare branches.",
    contact: "minh@example.com",
    score: 82,
    offer: "Daily Sales Starter Sprint",
    messages: [
      ["User", "I have 3 stores and keep asking each branch for daily sales on Zalo."],
      ["Mind AI", "The first workflow should be Daily Sales Report: staff submit once, owner sees branch comparison and exceptions."],
      ["User", "I need to know which branch is dropping revenue or missing stock faster."],
    ],
  },
  {
    id: "sess-spa",
    title: "Spa operations lead",
    company: "2 locations",
    status: "Qualified",
    pain: "Customer follow-up and service issue handoff are scattered.",
    contact: "linh@example.com",
    score: 76,
    offer: "Mini CRM + Issue Tracker",
    messages: [
      ["User", "Customer feedback gets buried in chat and staff forget follow-up."],
      ["Mind AI", "The first workflow should be Mini CRM plus Issue Tracker with an owner and visible status."],
    ],
  },
  {
    id: "sess-fnb",
    title: "Cafe manager",
    company: "5 stores",
    status: "Needs info",
    pain: "Checklist and shift handoff are inconsistent between stores.",
    contact: "pending",
    score: 61,
    offer: "Store Checklist Sprint",
    messages: [
      ["User", "Each shift manager closes the day in a different way."],
      ["Mind AI", "I need the current closing checklist and who owns the final shift confirmation."],
    ],
  },
];

const databaseGroups = [
  ["Identity", ["organizations", "contacts", "leads"]],
  ["Agents", ["agents", "agent_versions", "agent_skills", "agent_tool_permissions"]],
  ["Workflows", ["workflows", "workflow_versions", "workflow_steps", "workflow_runs", "workflow_run_events"]],
  ["Sessions", ["sessions", "session_messages", "handoffs", "lead_qualification"]],
  ["Memory", ["context_snapshots", "memory_items", "protected_facts"]],
  ["Tools and Cost", ["tools", "tool_calls", "approval_requests", "model_calls", "cost_events", "eval_runs"]],
];

const costRows = [
  ["Mind AI Consultant", "Website intake", "42", "188k", "$3.18", "Pass"],
  ["Planner Manager", "Proposal seed", "11", "91k", "$1.74", "Review"],
  ["Workflow Architect", "Automation fit", "9", "76k", "$1.21", "Pass"],
  ["Orchestrator", "Evidence gate", "7", "38k", "$0.83", "Pass"],
];

export default function Home() {
  const [view, setView] = useState<View>("config");
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0].id);
  const [agentFilter, setAgentFilter] = useState<"all" | AgentStatus>("all");
  const [selectedTargetId, setSelectedTargetId] = useState(configTargets[0].id);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0].id);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0];
  const selectedTarget = configTargets.find((target) => target.id === selectedTargetId) ?? configTargets[0];
  const selectedStep = configSteps[selectedStepIndex];
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0];

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => agentFilter === "all" || agent.status === agentFilter);
  }, [agentFilter]);

  const configWrites = [...new Set([...selectedTarget.tables, ...selectedStep.writes])];
  const configPayload = {
    target_slug: selectedTarget.slug,
    target_type: selectedTarget.type,
    record_type: selectedTarget.record,
    version: selectedTarget.version,
    active_step: selectedStep.key,
    publish_gate: selectedTarget.gate,
    risk_level: selectedTarget.risk,
    primary_output: selectedTarget.primaryOutput,
    db_writes: configWrites,
    contracts: Object.fromEntries(selectedStep.contracts),
    validation_checks: selectedStep.checks,
  };

  return (
    <main className="min-h-screen bg-[#f5f7f3] text-[#17211b]">
      <div className="grid min-h-screen grid-cols-[260px_minmax(0,1fr)] max-[900px]:grid-cols-1">
        <aside className="sticky top-0 flex h-screen flex-col border-r border-[#dbe2dc] bg-white/90 p-4 max-[900px]:static max-[900px]:h-auto max-[900px]:border-b max-[900px]:border-r-0">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-[#17211b] font-bold text-white">M</div>
            <div>
              <div className="font-semibold">Mind Agent Center</div>
              <div className="text-xs text-[#667269]">Agent runtime v0</div>
            </div>
          </div>

          <nav className="grid gap-2 max-[900px]:grid-cols-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`rounded-lg px-3 py-3 text-left transition ${
                  view === item.id ? "bg-[#17211b] text-white" : "hover:bg-[#edf2ee]"
                }`}
              >
                <div className="text-sm font-semibold">{item.label}</div>
                <div className={`mt-1 text-xs ${view === item.id ? "text-white/70" : "text-[#667269]"}`}>{item.hint}</div>
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-3 max-[900px]:mt-4">
            <div className="text-xs uppercase tracking-[0.12em] text-[#667269]">First proof</div>
            <div className="mt-2 text-lg font-semibold">MindAI to Proposal</div>
            <p className="mt-2 text-sm leading-6 text-[#667269]">
              Session, diagnosis, snapshot, lead score, approval, and Planner handoff.
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 border-b border-[#dbe2dc] bg-white/85 px-6 py-4 backdrop-blur max-[900px]:static max-[700px]:items-start max-[700px]:flex-col">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">{viewCopy[view].title}</h1>
              <p className="mt-1 text-sm text-[#667269]">{viewCopy[view].subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border border-[#dbe2dc] bg-white px-3 py-2 text-sm font-medium">Sync</button>
              <button className="rounded-lg border border-[#dbe2dc] bg-white px-3 py-2 text-sm font-medium">Export</button>
              <button className="rounded-lg border border-[#dbe2dc] bg-white px-3 py-2 text-sm font-medium">3 approvals</button>
              <button className="rounded-lg bg-[#17211b] px-3 py-2 text-sm font-medium text-white">New config</button>
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-[1500px] gap-4 p-6 max-[700px]:p-4">
            <KpiStrip />
            {view === "config" && (
              <ConfigView
                targets={configTargets}
                steps={configSteps}
                selectedTarget={selectedTarget}
                selectedStep={selectedStep}
                selectedStepIndex={selectedStepIndex}
                configWrites={configWrites}
                configPayload={configPayload}
                onSelectTarget={(id) => {
                  setSelectedTargetId(id);
                  setSelectedStepIndex(0);
                }}
                onSelectStep={setSelectedStepIndex}
                onPrev={() => setSelectedStepIndex((current) => Math.max(0, current - 1))}
                onNext={() => setSelectedStepIndex((current) => Math.min(configSteps.length - 1, current + 1))}
              />
            )}
            {view === "agents" && (
              <AgentsView
                agents={filteredAgents}
                selectedAgent={selectedAgent}
                selectedAgentId={selectedAgentId}
                filter={agentFilter}
                onFilter={setAgentFilter}
                onSelect={setSelectedAgentId}
              />
            )}
            {view === "workflows" && <WorkflowsView />}
            {view === "sessions" && (
              <SessionsView
                sessions={sessions}
                selectedSession={selectedSession}
                selectedSessionId={selectedSessionId}
                onSelect={setSelectedSessionId}
              />
            )}
            {view === "memory" && <MemoryView />}
            {view === "database" && <DatabaseView />}
            {view === "costs" && <CostsView />}
          </div>
        </section>
      </div>
    </main>
  );
}

function KpiStrip() {
  const kpis = [
    ["Active agents", "8", "5 production, 3 draft"],
    ["Open sessions", "24", "6 waiting founder review"],
    ["Protected facts", "138", "No stale critical facts"],
    ["Cost today", "$7.42", "72 percent below guardrail"],
  ];

  return (
    <div className="grid grid-cols-4 gap-3 max-[1150px]:grid-cols-2 max-[650px]:grid-cols-1">
      {kpis.map(([label, value, helper]) => (
        <div key={label} className="rounded-lg border border-[#dbe2dc] bg-white p-4 shadow-sm">
          <div className="text-sm text-[#667269]">{label}</div>
          <div className="mt-5 text-3xl font-semibold">{value}</div>
          <div className="mt-3 text-xs text-[#1f7a4d]">{helper}</div>
        </div>
      ))}
    </div>
  );
}

function ConfigView({
  targets,
  steps,
  selectedTarget,
  selectedStep,
  selectedStepIndex,
  configWrites,
  configPayload,
  onSelectTarget,
  onSelectStep,
  onPrev,
  onNext,
}: {
  targets: ConfigTarget[];
  steps: ConfigStep[];
  selectedTarget: ConfigTarget;
  selectedStep: ConfigStep;
  selectedStepIndex: number;
  configWrites: string[];
  configPayload: unknown;
  onSelectTarget: (id: string) => void;
  onSelectStep: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(220px,0.62fr)_minmax(420px,1.12fr)_minmax(320px,0.82fr)] gap-4 max-[1250px]:grid-cols-1">
      <Panel title="Config Target" subtitle="Choose what runtime version you are editing.">
        <div className="grid gap-2">
          {targets.map((target) => (
            <button
              key={target.id}
              onClick={() => onSelectTarget(target.id)}
              className={`rounded-lg border p-3 text-left ${
                target.id === selectedTarget.id ? "border-[#9ac9a8] bg-[#e3f3e9]" : "border-[#dbe2dc] bg-[#fbfcfb] hover:bg-[#f7faf7]"
              }`}
            >
              <div className="font-semibold">{target.title}</div>
              <div className="mt-1 text-xs text-[#667269]">{target.type}</div>
              <p className="mt-2 text-sm leading-6 text-[#667269]">{target.summary}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-3 text-sm">
          <InfoRow label="Draft first" value="On" />
          <InfoRow label="Founder approval" value="Required" />
          <InfoRow label="Versioning" value="Every publish" />
        </div>
      </Panel>

      <Panel title={`Configure ${selectedTarget.title}`} subtitle={`${selectedTarget.summary} Output: ${selectedTarget.primaryOutput}.`}>
        <div className="grid grid-cols-7 gap-2 max-[760px]:grid-cols-1">
          {steps.map((step, index) => (
            <button
              key={step.key}
              onClick={() => onSelectStep(index)}
              className={`min-h-16 rounded-lg border px-2 py-2 text-center text-xs ${
                index === selectedStepIndex ? "border-[#17211b] bg-[#17211b] text-white" : "border-[#dbe2dc] bg-white text-[#667269]"
              }`}
            >
              <div className="font-semibold">{index + 1}</div>
              <div className="mt-1">{step.title}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-4">
          <Badge tone={selectedTarget.risk === "High" ? "red" : "violet"}>{selectedTarget.record}</Badge>
          <h2 className="mt-3 text-xl font-semibold">
            {selectedStepIndex + 1}. {selectedStep.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#667269]">{selectedStep.purpose}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
          <ContractBlock title="Founder configures">
            <div className="grid grid-cols-2 gap-2 max-[620px]:grid-cols-1">
              {selectedStep.fields.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#dbe2dc] bg-white p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-[#667269]">{label}</div>
                  <div className="mt-2 text-sm leading-6">{value}</div>
                </div>
              ))}
            </div>
          </ContractBlock>
          <ContractBlock title="Runtime validation">
            <div className="grid gap-2">
              {selectedStep.checks.map((check, index) => (
                <ContractRow key={check} label={`Check ${index + 1}`} value={check} badge="Required" />
              ))}
            </div>
          </ContractBlock>
        </div>

        <ContractBlock title="Contract preview" className="mt-4">
          <div className="grid gap-2">
            {selectedStep.contracts.map(([label, value]) => (
              <ContractRow key={label} label={label} value={value} badge="Contract" />
            ))}
          </div>
        </ContractBlock>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onPrev}
            disabled={selectedStepIndex === 0}
            className="rounded-lg border border-[#dbe2dc] bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            Previous
          </button>
          <div className="flex flex-wrap gap-2">
            {selectedStep.writes.map((write) => (
              <span key={write} className="rounded-full border border-[#dbe2dc] bg-white px-2 py-1 text-xs text-[#667269]">
                {write}
              </span>
            ))}
          </div>
          <button onClick={onNext} className="rounded-lg bg-[#17211b] px-4 py-2 text-sm font-semibold text-white">
            {selectedStepIndex === steps.length - 1 ? "Ready for approval" : "Next"}
          </button>
        </div>
      </Panel>

      <Panel title="Publish Preview" subtitle="See what this config will write before it goes live.">
        <div className="rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-3 text-sm">
          <InfoRow label="Current version" value={selectedTarget.version} />
          <InfoRow label="Publish gate" value={selectedTarget.gate} />
          <InfoRow label="Risk level" value={selectedTarget.risk} />
        </div>
        <ContractBlock title="Database writes" className="mt-4">
          <div className="grid gap-2">
            {configWrites.map((write) => (
              <div key={write} className="flex items-center justify-between gap-3 rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] px-3 py-2 text-sm">
                <span>{write}</span>
                <Badge tone={selectedTarget.tables.includes(write) ? "blue" : "green"}>
                  {selectedTarget.tables.includes(write) ? "target" : "step"}
                </Badge>
              </div>
            ))}
          </div>
        </ContractBlock>
        <ContractBlock title="JSON payload" className="mt-4">
          <pre className="max-h-[420px] overflow-auto rounded-lg bg-[#101914] p-3 text-xs leading-6 text-[#d8efe0]">
            {JSON.stringify(configPayload, null, 2)}
          </pre>
        </ContractBlock>
      </Panel>
    </div>
  );
}

function AgentsView({
  agents,
  selectedAgent,
  selectedAgentId,
  filter,
  onFilter,
  onSelect,
}: {
  agents: Agent[];
  selectedAgent: Agent;
  selectedAgentId: string;
  filter: "all" | AgentStatus;
  onFilter: (filter: "all" | AgentStatus) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(420px,1.2fr)_minmax(340px,0.8fr)] gap-4 max-[1050px]:grid-cols-1">
      <Panel title="Agent Registry" subtitle="Versioned role, SOW, input contract, output contract, and policy.">
        <div className="mb-3 flex flex-wrap justify-between gap-2">
          <div className="flex rounded-lg border border-[#dbe2dc] bg-white p-1">
            {(["all", "production", "draft", "review"] as const).map((item) => (
              <button
                key={item}
                onClick={() => onFilter(item)}
                className={`rounded-md px-3 py-2 text-sm ${filter === item ? "bg-[#17211b] text-white" : "text-[#667269]"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-[#dbe2dc]">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-[#fbfcfb] text-left text-xs uppercase tracking-[0.12em] text-[#667269]">
              <tr>
                <th className="w-[28%] border-b border-[#dbe2dc] p-3">Agent</th>
                <th className="w-[22%] border-b border-[#dbe2dc] p-3">Role</th>
                <th className="w-[28%] border-b border-[#dbe2dc] p-3">Scope</th>
                <th className="w-[22%] border-b border-[#dbe2dc] p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  onClick={() => onSelect(agent.id)}
                  className={`cursor-pointer border-b border-[#dbe2dc] last:border-b-0 ${
                    agent.id === selectedAgentId ? "bg-[#e3f3e9]" : "bg-white hover:bg-[#f7faf7]"
                  }`}
                >
                  <td className="p-3 align-top">
                    <div className="font-semibold">{agent.name}</div>
                    <div className="mt-1 text-xs text-[#667269]">{agent.id}</div>
                  </td>
                  <td className="p-3 align-top">{agent.role}</td>
                  <td className="p-3 align-top text-[#667269]">{agent.scope}</td>
                  <td className="p-3 align-top">
                    <Badge tone={agent.status === "production" ? "green" : agent.status === "draft" ? "amber" : "violet"}>
                      {agent.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={selectedAgent.name} subtitle={`${selectedAgent.role} | Owner: ${selectedAgent.owner} | Model: ${selectedAgent.model}`}>
        <ContractBlock title="Mission">
          <p className="text-sm leading-6 text-[#667269]">{selectedAgent.mission}</p>
        </ContractBlock>
        <div className="mt-3 grid grid-cols-2 gap-3 max-[620px]:grid-cols-1">
          <ContractBlock title="SOW in scope">
            <BulletList items={selectedAgent.sowIn} />
          </ContractBlock>
          <ContractBlock title="SOW out of scope">
            <BulletList items={selectedAgent.sowOut} />
          </ContractBlock>
        </div>
        <ContractBlock title="Input contract" className="mt-3">
          <ChipList items={selectedAgent.inputs} />
        </ContractBlock>
        <ContractBlock title="Output contract" className="mt-3">
          <ChipList items={selectedAgent.outputs} />
        </ContractBlock>
        <div className="mt-3 rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-3 text-sm">
          <InfoRow label="Approval policy" value={selectedAgent.policy} />
          <InfoRow label="Memory policy" value="Protected facts + handoff delta" />
          <InfoRow label="Tool access" value="Scoped by role" />
        </div>
      </Panel>
    </div>
  );
}

function WorkflowsView() {
  return (
    <div className="grid grid-cols-[minmax(420px,1fr)_minmax(340px,0.75fr)] gap-4 max-[1050px]:grid-cols-1">
      <Panel title="Website MindAI to Proposal" subtitle="First proof workflow for Mindtransform Agent Runtime.">
        <div className="grid gap-3">
          {workflowSteps.map(([title, owner, body], index) => (
            <div key={title} className="grid grid-cols-[42px_minmax(0,1fr)_auto] gap-3 rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-3 max-[640px]:grid-cols-1">
              <div className="grid size-9 place-items-center rounded-lg bg-[#17211b] text-sm font-semibold text-white">{index + 1}</div>
              <div>
                <div className="font-semibold">{title}</div>
                <p className="mt-1 text-sm leading-6 text-[#667269]">{body}</p>
                <div className="mt-2 text-xs text-[#667269]">Owner: {owner}</div>
              </div>
              <Badge tone={index < 2 ? "green" : index < 4 ? "blue" : "amber"}>{index < 2 ? "run" : index < 4 ? "write" : "gate"}</Badge>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Run Trace" subtitle="Each step writes evidence, cost, and approval status.">
        <div className="overflow-hidden rounded-lg border border-[#dbe2dc]">
          {runTrace.map(([time, title, body, status]) => (
            <div key={`${time}-${title}`} className="grid grid-cols-[80px_minmax(0,1fr)_auto] gap-3 border-b border-[#dbe2dc] bg-[#fbfcfb] p-3 text-sm last:border-b-0 max-[620px]:grid-cols-1">
              <time className="text-xs text-[#667269]">{time}</time>
              <div>
                <div className="font-semibold">{title}</div>
                <div className="mt-1 text-[#667269]">{body}</div>
              </div>
              <Badge tone={status === "Done" ? "green" : status === "Review" ? "amber" : "red"}>{status}</Badge>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SessionsView({
  sessions,
  selectedSession,
  selectedSessionId,
  onSelect,
}: {
  sessions: Session[];
  selectedSession: Session;
  selectedSessionId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Panel title="MindAI Intake Sessions" subtitle="Website sessions become lead qualification and handoff records.">
      <div className="grid grid-cols-[minmax(300px,0.8fr)_minmax(420px,1.2fr)] gap-4 max-[1050px]:grid-cols-1">
        <div className="grid gap-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`rounded-lg border p-3 text-left ${
                session.id === selectedSessionId ? "border-[#9ac9a8] bg-[#e3f3e9]" : "border-[#dbe2dc] bg-[#fbfcfb]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{session.title}</div>
                <Badge tone={session.status === "Review" ? "amber" : session.status === "Qualified" ? "green" : "blue"}>
                  {session.status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-[#667269]">{session.company}</div>
              <p className="mt-2 text-sm leading-6 text-[#667269]">{session.pain}</p>
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          <div className="rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-3 text-sm">
            <div className="mb-2 font-semibold">{selectedSession.title}</div>
            <InfoRow label="Company" value={selectedSession.company} />
            <InfoRow label="Contact" value={selectedSession.contact} />
            <InfoRow label="Lead score" value={`${selectedSession.score}/100`} />
            <InfoRow label="Recommended offer" value={selectedSession.offer} />
          </div>
          <ContractBlock title="Pain map">
            <p className="text-sm leading-6 text-[#667269]">{selectedSession.pain}</p>
          </ContractBlock>
          <ContractBlock title="Conversation">
            <div className="grid gap-2">
              {selectedSession.messages.map(([role, text], index) => (
                <div key={`${role}-${index}`} className={`rounded-lg border p-3 text-sm leading-6 ${role === "User" ? "border-[#cbdcf0] bg-[#e6eef8]" : "border-[#c7e6d2] bg-[#e3f3e9]"}`}>
                  <div className="font-semibold">{role}</div>
                  {text}
                </div>
              ))}
            </div>
          </ContractBlock>
          <ContractBlock title="Runtime writes">
            <ChipList items={["sessions", "session_messages", "context_snapshots", "lead_qualification", "approval_requests"]} />
          </ContractBlock>
        </div>
      </div>
    </Panel>
  );
}

function MemoryView() {
  const cards = [
    ["Protected facts", "ICP, brand positioning, approved pricing guardrails, client contact data, and committed scope."],
    ["Session summary", "Condensed chat context, problem statement, workflow pain, current tools, and business size."],
    ["Decision log", "Founder approvals, rejected actions, selected workflow, handoff destination, and next owner."],
    ["Handoff delta", "Only the difference needed by the next agent, so Planner does not re-read the full chat."],
    ["Stale facts", "Facts older than the policy window are flagged before they can enter prompt context."],
    ["Compression audit", "Every compaction stores source message range, output snapshot, model, token count, and risk note."],
  ];

  return (
    <div className="grid grid-cols-[minmax(420px,1fr)_minmax(320px,0.65fr)] gap-4 max-[1050px]:grid-cols-1">
      <Panel title="Context Compaction" subtitle="Memory is split into facts, summary, decisions, and handoff delta.">
        <div className="grid grid-cols-3 gap-3 max-[1050px]:grid-cols-2 max-[650px]:grid-cols-1">
          {cards.map(([title, body]) => (
            <div key={title} className="min-h-36 rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-3">
              <div className="font-semibold">{title}</div>
              <p className="mt-2 text-sm leading-6 text-[#667269]">{body}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Memory Policy" subtitle="Guardrails for long consultation sessions.">
        <div className="rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-3">
          <InfoRow label="Max raw messages" value="18" />
          <InfoRow label="Protected fact overwrite" value="Approval" />
          <InfoRow label="Snapshot cadence" value="Per handoff" />
          <InfoRow label="Long-term memory" value="Lead scoped" />
          <InfoRow label="RAG status" value="Delayed" />
        </div>
      </Panel>
    </div>
  );
}

function DatabaseView() {
  return (
    <Panel title="Runtime Database" subtitle="Separate Supabase/Postgres schema planned for v1 persistence.">
      <div className="grid grid-cols-3 gap-3 max-[1050px]:grid-cols-2 max-[650px]:grid-cols-1">
        {databaseGroups.map(([group, tables]) => (
          <div key={group as string} className="min-h-36 rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-3">
            <div className="font-semibold">{group}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(tables as string[]).map((table) => (
                <code key={table} className="rounded-md bg-[#edf2ee] px-2 py-1 text-xs text-[#344039]">
                  {table}
                </code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CostsView() {
  return (
    <div className="grid grid-cols-[minmax(420px,1fr)_minmax(320px,0.65fr)] gap-4 max-[1050px]:grid-cols-1">
      <Panel title="Cost And Eval Console" subtitle="Track model calls by session, agent, workflow, token usage, and output quality.">
        <div className="overflow-hidden rounded-lg border border-[#dbe2dc]">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-[#fbfcfb] text-left text-xs uppercase tracking-[0.12em] text-[#667269]">
              <tr>
                <th className="border-b border-[#dbe2dc] p-3">Agent</th>
                <th className="border-b border-[#dbe2dc] p-3">Calls</th>
                <th className="border-b border-[#dbe2dc] p-3">Tokens</th>
                <th className="border-b border-[#dbe2dc] p-3">Cost</th>
                <th className="border-b border-[#dbe2dc] p-3">Quality</th>
              </tr>
            </thead>
            <tbody>
              {costRows.map(([agent, scope, calls, tokens, cost, quality]) => (
                <tr key={agent} className="border-b border-[#dbe2dc] bg-white last:border-b-0">
                  <td className="p-3">
                    <div className="font-semibold">{agent}</div>
                    <div className="mt-1 text-xs text-[#667269]">{scope}</div>
                  </td>
                  <td className="p-3">{calls}</td>
                  <td className="p-3">{tokens}</td>
                  <td className="p-3">{cost}</td>
                  <td className="p-3">
                    <Badge tone={quality === "Pass" ? "green" : "amber"}>{quality}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Budget Guardrail" subtitle="Block runaway sessions before they become expensive.">
        <div className="rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-3">
          <InfoRow label="Daily budget" value="$25.00" />
          <div className="my-3 h-2 overflow-hidden rounded-full bg-[#e5ebe6]">
            <div className="h-full w-[30%] rounded-full bg-[#1f7a4d]" />
          </div>
          <InfoRow label="Per lead max" value="$1.20" />
          <InfoRow label="Approval threshold" value="$0.60" />
          <InfoRow label="Auto-stop low confidence" value="On" />
          <InfoRow label="Eval sample rate" value="20%" />
        </div>
      </Panel>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#dbe2dc] bg-white shadow-[0_18px_46px_rgba(24,35,29,0.08)]">
      <div className="border-b border-[#dbe2dc] px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-6 text-[#667269]">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ContractBlock({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-[#dbe2dc] bg-[#fbfcfb] p-3 ${className}`}>
      <div className="mb-3 text-xs uppercase tracking-[0.12em] text-[#667269]">{title}</div>
      {children}
    </div>
  );
}

function ContractRow({ label, value, badge }: { label: string; value: string; badge: string }) {
  return (
    <div className="grid grid-cols-[minmax(105px,0.35fr)_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-[#dbe2dc] bg-white p-3 text-sm max-[620px]:grid-cols-1">
      <code className="font-semibold">{label}</code>
      <span className="leading-6 text-[#667269]">{value}</span>
      <Badge tone="blue">{badge}</Badge>
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "blue" | "amber" | "red" | "violet"; children: ReactNode }) {
  const tones = {
    green: "border-[#c7e6d2] bg-[#e3f3e9] text-[#1f7a4d]",
    blue: "border-[#cbdcf0] bg-[#e6eef8] text-[#245e9f]",
    amber: "border-[#ead7a9] bg-[#f7edd7] text-[#9a6a16]",
    red: "border-[#ebc8c3] bg-[#f5e3e1] text-[#a14343]",
    violet: "border-[#dccfed] bg-[#eee8f6] text-[#7252a6]",
  } as const;

  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#dbe2dc] py-2 text-sm last:border-b-0">
      <span className="text-[#667269]">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-[#dbe2dc] bg-white px-2 py-1 text-xs text-[#425047]">
          {item}
        </span>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2 text-sm leading-6 text-[#667269]">
      {items.map((item) => (
        <li key={item}>- {item}</li>
      ))}
    </ul>
  );
}
