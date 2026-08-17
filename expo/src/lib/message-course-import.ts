import { normalizeImportedProblem, type CoraImportedProblem } from "./cora-api"

const EMBED_OPEN = "[[cc-course-import:v1]]"
const EMBED_CLOSE = "[[/cc-course-import]]"
const EMBED_RE = /\[\[cc-course-import:v1\]\]\s*([\s\S]*?)\s*\[\[\/cc-course-import\]\]/i

export type ParsedMessageCourseImport = {
  problem: CoraImportedProblem
  label: string
  userNote: string
  previewText: string
}

function resolveImportLabel(problem: CoraImportedProblem, label?: string | null): string {
  return label?.trim() || problem.title?.trim() || problem.topic?.trim() || "Course question"
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function stripFallbackImportLine(text: string, label: string): string {
  const fallbackRe = new RegExp(`^Course question:\\s*${escapeRegExp(label)}\\s*$`, "im")
  return text.replace(fallbackRe, "").trim()
}

function sanitizeProblemForMessageShare(problem: CoraImportedProblem): CoraImportedProblem {
  const normalized = normalizeImportedProblem(problem)
  return {
    ...normalized,
    expectedAnswer: null,
    hint: null,
    explanation: null,
    referenceSteps: undefined,
  }
}

/** Serialize imported course question for message storage (keeps KaTeX + figure metadata). */
export function buildMessageBodyWithCourseImport(
  problem: CoraImportedProblem,
  label: string,
  userNote?: string,
): string {
  const normalized = sanitizeProblemForMessageShare(problem)
  const title = resolveImportLabel(normalized, label)
  const payload = JSON.stringify({ v: 1, label: title, problem: normalized })
  const embed = `${EMBED_OPEN}\n${payload}\n${EMBED_CLOSE}`
  const fallback = `Course question: ${title}`
  const note = userNote?.trim()
  return [embed, fallback, note].filter(Boolean).join("\n\n")
}

/** Parse structured course import embedded in a message body. */
export function parseCourseImportFromMessage(body: string): ParsedMessageCourseImport | null {
  const match = body.match(EMBED_RE)
  if (!match?.[1]) return null

  try {
    const parsed = JSON.parse(match[1].trim()) as {
      label?: string
      problem?: CoraImportedProblem
    }
    if (!parsed.problem?.questionText) return null

    const problem = normalizeImportedProblem(parsed.problem)
    const label = resolveImportLabel(problem, parsed.label)
    const withoutEmbed = body.replace(match[0], "").trim()
    const userNote = stripFallbackImportLine(withoutEmbed, label)

    return {
      problem,
      label,
      userNote,
      previewText: `Course question: ${label}`,
    }
  } catch {
    return null
  }
}

/** Inbox / thread list preview for messages with embedded course imports. */
export function messageCourseImportPreview(body: string, max = 120): string | null {
  const parsed = parseCourseImportFromMessage(body)
  if (parsed) {
    const note = parsed.userNote.trim()
    const base = parsed.previewText
    if (!note) {
      return base.length <= max ? base : `${base.slice(0, max)}…`
    }
    const combined = `${base} — ${note}`
    return combined.length <= max ? combined : `${combined.slice(0, max)}…`
  }

  // Inbox payloads are often truncated and omit the closing marker.
  const label = incompleteCourseImportLabel(body)
  if (!label) return null
  const text = label === "Course question" ? label : `Course question: ${label}`
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

/** Label from a truncated or unclosed course-import embed. */
export function incompleteCourseImportLabel(body: string): string | null {
  if (!/\[\[cc-course-import/i.test(body)) return null
  return body.match(/"label"\s*:\s*"([^"]+)"/)?.[1]?.trim() || "Course question"
}

/** Remove embed markup so thread bubbles never dump raw JSON. */
export function stripCourseImportMarkup(body: string): string {
  if (!/\[\[cc-course-import/i.test(body)) return body
  return body
    .replace(/\[\[cc-course-import:v1\]\][\s\S]*?(?:\[\[\/cc-course-import\]\]|$)/i, "")
    .replace(/^Course question:\s*.+$/im, "")
    .trim()
}
