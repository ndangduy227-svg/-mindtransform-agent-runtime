/**
 * Parse ROLE.md and SKILL.md files into structured agent config.
 * Format follows 12_Agents convention: H1 = title, H2 = sections, bullets = items.
 */

export interface ParsedRole {
  name: string
  mission: string
  scope: string
  inputs: string[]
  outputs: string[]
  guardrails: string[]
  handoff_to: string[]
  handoff_from: string[]
  tools: string[]
  model_tier: string
  raw_sections: Record<string, string>
}

export interface ParsedSkill {
  name: string
  description: string
  trigger: string
  inputs: string[]
  outputs: string[]
  steps: string[]
  guardrails: string[]
  raw_sections: Record<string, string>
}

export interface ParsedConfig {
  type: "role" | "skill" | "unknown"
  role?: ParsedRole
  skill?: ParsedSkill
  raw: string
}

function extractSections(md: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const lines = md.split("\n")
  let currentSection = "_preamble"
  let buffer: string[] = []

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/)
    if (h2Match) {
      if (buffer.length > 0) {
        sections[currentSection] = buffer.join("\n").trim()
      }
      currentSection = h2Match[1].trim().toLowerCase()
      buffer = []
    } else {
      buffer.push(line)
    }
  }
  if (buffer.length > 0) {
    sections[currentSection] = buffer.join("\n").trim()
  }

  return sections
}

function extractBullets(text: string): string[] {
  return text
    .split("\n")
    .filter((l) => /^\s*[-*]\s/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean)
}

function extractTitle(md: string): string {
  const match = md.match(/^#\s+(.+)/m)
  return match ? match[1].trim() : "Untitled"
}

function findSection(sections: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    for (const [k, v] of Object.entries(sections)) {
      if (k.includes(key)) return v
    }
  }
  return ""
}

function findSectionBullets(sections: Record<string, string>, ...keys: string[]): string[] {
  const text = findSection(sections, ...keys)
  return text ? extractBullets(text) : []
}

function extractInlineValue(sections: Record<string, string>, ...keys: string[]): string {
  const text = findSection(sections, ...keys)
  if (!text) return ""
  // Get first non-empty line that isn't a bullet
  const line = text.split("\n").find((l) => l.trim() && !/^\s*[-*]/.test(l))
  return line?.trim() || text.split("\n")[0]?.trim() || ""
}

export function parseRoleMd(md: string): ParsedRole {
  const sections = extractSections(md)
  const title = extractTitle(md)

  return {
    name: title.replace(/^ROLE:\s*/i, "").replace(/^Agent:\s*/i, ""),
    mission: extractInlineValue(sections, "mission", "purpose", "objective"),
    scope: extractInlineValue(sections, "scope", "boundary", "boundaries"),
    inputs: findSectionBullets(sections, "input", "receives", "accepts"),
    outputs: findSectionBullets(sections, "output", "produces", "delivers", "deliverable"),
    guardrails: findSectionBullets(sections, "guardrail", "constraint", "rule", "limit"),
    handoff_to: findSectionBullets(sections, "handoff to", "hands off to", "downstream"),
    handoff_from: findSectionBullets(sections, "handoff from", "receives from", "upstream"),
    tools: findSectionBullets(sections, "tool", "capability", "mcp"),
    model_tier: extractInlineValue(sections, "model", "tier"),
    raw_sections: sections,
  }
}

export function parseSkillMd(md: string): ParsedSkill {
  const sections = extractSections(md)
  const title = extractTitle(md)

  return {
    name: title.replace(/^SKILL:\s*/i, ""),
    description: extractInlineValue(sections, "description", "purpose", "overview", "_preamble"),
    trigger: extractInlineValue(sections, "trigger", "when", "activation"),
    inputs: findSectionBullets(sections, "input", "receives", "parameters"),
    outputs: findSectionBullets(sections, "output", "produces", "returns"),
    steps: findSectionBullets(sections, "step", "procedure", "process", "flow"),
    guardrails: findSectionBullets(sections, "guardrail", "constraint", "rule"),
    raw_sections: sections,
  }
}

export function parseMd(md: string, filename?: string): ParsedConfig {
  const lower = (filename || "").toLowerCase()
  const content = md.toLowerCase()

  // Detect type by filename or content
  if (lower.includes("role") || content.includes("## mission") || content.includes("## scope")) {
    return { type: "role", role: parseRoleMd(md), raw: md }
  }
  if (lower.includes("skill") || content.includes("## trigger") || content.includes("## steps")) {
    return { type: "skill", skill: parseSkillMd(md), raw: md }
  }

  // Fallback: try role first (more common)
  const role = parseRoleMd(md)
  if (role.mission || role.inputs.length > 0) {
    return { type: "role", role, raw: md }
  }

  return { type: "unknown", raw: md }
}
