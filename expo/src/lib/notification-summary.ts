const KEYWORDS =
  /\b(due|deadline|submit|exam|quiz|homework|recommendation|letter|approve|review|class|cancel|required|must|please|remember|important|attendance|final|midterm|updated|request)\b/i

const MAX_SUMMARY_CHARS = 320

function truncate(value: string, max = MAX_SUMMARY_CHARS): string {
  if (value.length <= max) return value
  const cut = value.slice(0, max)
  const lastSpace = cut.lastIndexOf(" ")
  const base = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()
  return `${base}…`
}

/** Prefer server `ai_summary`; client extractive logic is fallback only. */
export function summarizeNotification(
  title: string,
  message: string,
  options?: { type?: string | null; aiSummary?: string | null; maxLength?: number },
): string {
  const maxLength = options?.maxLength ?? MAX_SUMMARY_CHARS
  if (options?.aiSummary?.trim()) {
    return truncate(options.aiSummary.trim(), maxLength)
  }

  const cleanTitle = title.trim()
  const plain = message.trim()
  if (!plain) return truncate(cleanTitle || "Course notification", maxLength)

  const sentences = plain
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)

  const priority = sentences.filter((s) => KEYWORDS.test(s))
  let summary = ""
  if (priority.length >= 2) {
    summary = `${priority[0]} ${priority[1]}`
  } else if (priority.length === 1) {
    summary = priority[0]
  } else if (sentences.length >= 2) {
    summary = `${sentences[0]} ${sentences[1]}`
  } else {
    summary = sentences[0] ?? plain
  }

  if (cleanTitle && !summary.toLowerCase().includes(cleanTitle.toLowerCase().slice(0, 12))) {
    summary = `${cleanTitle}. ${summary}`
  }

  return truncate(summary.trim(), maxLength)
}

export function notificationActionLabel(type: string, link?: string | null): string {
  const key = (type ?? "").toLowerCase()
  if (key.includes("recommendation")) return "Open Recommendation Letter"
  if (key.includes("office_hour")) return "Open Office Hours"
  if (key.includes("quiz") || key.includes("submission") || key.includes("homework") || key.includes("exam")) {
    return "Open Related Assessment"
  }
  if (key.includes("announcement")) return "Open Announcement"
  if (key.includes("lecture")) return "Open Lectures"
  if (key.includes("group")) return "Open Groups"
  if (key.includes("project")) return "Open Projects"
  if (link) return "Open Related Screen"
  return "Open Related Screen"
}
