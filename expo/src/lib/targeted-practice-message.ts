/** Structured Cora Insights “assign targeted practice” DMs. */

export type TargetedPracticeMessage = {
  greeting: string
  summary: string
  topics: string[]
  tasks: string[]
  encouragement: string
  hasProgressReviewNote: boolean
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripTags(input: string): string {
  return decodeEntities(
    input
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function extractBlocks(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi")
  return [...html.matchAll(re)].map((m) => stripTags(m[1])).filter(Boolean)
}

function looksLikePracticeAssignment(raw: string): boolean {
  const hay = raw.toLowerCase()
  const hasFocus = /\bfocus(?:\s+topics)?\s*:/.test(hay) || /<strong>\s*focus/i.test(raw)
  const hasNext = /what to do next/i.test(raw)
  const hasList = /<(?:ol|ul)\b/i.test(raw) || /<li\b/i.test(raw)
  const hasReview = /progress review/i.test(raw)
  const hasTitle = /targeted practice/i.test(raw)
  return (hasFocus && (hasNext || hasList || hasReview)) || (hasTitle && (hasList || hasNext))
}

function splitTasksFromPlain(text: string): string[] {
  const chunk = text
    .replace(/^what to do next\s*/i, "")
    .replace(/\s*a copy is also in your progress review\.?\s*$/i, "")
    .trim()
  if (!chunk) return []

  const numbered = chunk
    .split(/\n+/)
    .map((line) => line.replace(/^\s*\d+[.)]\s+/, "").trim())
    .filter(Boolean)
  if (numbered.length >= 2 && /\n\s*\d+[.)]\s+/.test(`\n${chunk}`)) return numbered

  const split = chunk
    .split(/(?=\b(?:Do \d|Allocate |Then |After |Complete |Review |Write |Retry ))/g)
    .map((part) => part.trim())
    .filter(Boolean)
  return split.length >= 2 ? split : chunk ? [chunk] : []
}

function topicsFromFocusLine(line: string): string[] {
  const cleaned = line.replace(/^focus(?:\s+topics)?\s*:\s*/i, "").trim()
  if (!cleaned) return []
  return cleaned
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** Parse Cora Insights targeted-practice HTML (or stripped text) into sections. */
export function parseTargetedPracticeMessage(body: string): TargetedPracticeMessage | null {
  const raw = String(body ?? "").trim()
  if (!raw || !looksLikePracticeAssignment(raw)) return null

  const listItems = extractBlocks(raw, "li")
  const paragraphs = extractBlocks(raw, "p")
  const ordered = [...raw.matchAll(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi)].flatMap((m) => extractBlocks(m[1], "li"))
  const unordered = [...raw.matchAll(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi)].flatMap((m) => extractBlocks(m[1], "li"))

  const headingText = extractBlocks(raw, "h3")[0] || extractBlocks(raw, "h2")[0] || ""
  const lines = (paragraphs.length ? paragraphs : stripTags(raw).split(/\n+/).map((line) => line.trim()).filter(Boolean))
    .map((line) => line.replace(/^targeted practice\s*[—:-]?\s*/i, "").trim())
    .filter(Boolean)

  let greeting = ""
  let summary = ""
  let encouragement = ""
  let topics: string[] = unordered.length && ordered.length ? unordered : []
  let tasks: string[] = ordered.length ? ordered : unordered.length && !topics.length ? unordered : []
  let hasProgressReviewNote = /progress review/i.test(raw)

  const leftover: string[] = []
  for (const line of lines) {
    if (/^hi\b/i.test(line) && !greeting) {
      greeting = line.replace(/,+$/, ",")
      continue
    }
    if (/^what to do next\b/i.test(line)) continue
    if (/^focus topics$/i.test(line)) continue
    if (/^targeted practice$/i.test(line) || line === headingText) continue
    if (/progress review/i.test(line)) {
      hasProgressReviewNote = true
      continue
    }
    if (/^focus(?:\s+topics)?\s*:/i.test(line)) {
      if (!topics.length) topics = topicsFromFocusLine(line)
      continue
    }
    leftover.push(line)
  }

  if (!tasks.length) {
    const nextIdx = leftover.findIndex((line) => /what to do next/i.test(line))
    const blob = nextIdx >= 0 ? leftover.slice(nextIdx).join(" ") : leftover.slice(1).join(" ")
    tasks = splitTasksFromPlain(blob)
    if (nextIdx >= 0) leftover.splice(nextIdx)
    else if (tasks.length) leftover.splice(1)
  }

  if (leftover.length) {
    summary = leftover[0] ?? ""
    encouragement = leftover.slice(1).join(" ").trim()
  }

  if (!topics.length && listItems.length && !ordered.length) {
    topics = listItems
  }
  if (!tasks.length && listItems.length && ordered.length === 0 && unordered.length === 0) {
    tasks = listItems
  }

  if (!summary && !tasks.length) return null
  if (!tasks.length && leftover.length > 1) {
    tasks = splitTasksFromPlain(leftover.slice(1).join(" "))
  }

  return {
    greeting,
    summary: summary || leftover.join(" ").trim(),
    topics,
    tasks,
    encouragement,
    hasProgressReviewNote,
  }
}

export function targetedPracticePreviewText(plan: TargetedPracticeMessage, max = 120): string {
  const focus = plan.topics.slice(0, 2).join(", ")
  const text = focus ? `Targeted practice · ${focus}` : plan.summary || "Targeted practice assigned"
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}
