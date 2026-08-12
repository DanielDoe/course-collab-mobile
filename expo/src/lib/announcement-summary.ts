import {
  announcementPlainText,
  extractBulletPoints,
  ANNOUNCEMENT_LOCKED_MESSAGE} from "./announcement-content"

const KEYWORDS =
  /\b(due|deadline|submit|exam|quiz|homework|class|cancel|required|must|please|remember|important|note|attendance|office hours|final|midterm)\b/i

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
}

/**
 * Prefer server-persisted `ai_summary`. Client extractive logic is fallback only.
 */
export function summarizeAnnouncement(
  content: string,
  options?: {
    title?: string
    maxLength?: number
    locked?: boolean
    aiSummary?: string | null
  },
): string {
  const maxLength = options?.maxLength ?? 150

  if (options?.aiSummary?.trim()) {
    return truncate(options.aiSummary.trim(), maxLength)
  }

  if (options?.locked) {
    return "Content is locked until your instructor unlocks this announcement in class."
  }

  const plain = announcementPlainText(content)
  if (!plain || plain === ANNOUNCEMENT_LOCKED_MESSAGE) {
    return options?.title
      ? `Update about “${options.title}”. Tap to read details.`
      : "Tap to read the full announcement."
  }

  const bullets = extractBulletPoints(content)
  const sentences = splitSentences(plain)
  const priority = sentences.filter((s) => KEYWORDS.test(s))

  let summary = ""
  if (bullets.length > 0) {
    summary = bullets.slice(0, 2).join(" · ")
  } else if (priority.length >= 2) {
    summary = `${priority[0]} ${priority[1]}`
  } else if (priority.length === 1) {
    summary = priority[0]
    const rest = sentences.find((s) => s !== priority[0])
    if (rest) summary = `${summary} ${rest}`
  } else if (sentences.length >= 2) {
    summary = `${sentences[0]} ${sentences[1]}`
  } else {
    summary = sentences[0] ?? plain
  }

  return truncate(summary.trim(), maxLength)
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  const cut = value.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(" ")
  const trimmed = (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trim()
  return `${trimmed}…`
}
