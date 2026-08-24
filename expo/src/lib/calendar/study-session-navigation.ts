import type { CalendarEvent } from "./types"

export function isStudySessionEvent(event: CalendarEvent): boolean {
  const title = event.title?.trim() ?? ""
  return (
    event.event_type === "study_session" ||
    event.event_type === "ai_reminder" ||
    title.startsWith("Practice Hub:") ||
    title.startsWith("Flashcards:") ||
    title.startsWith("Study:") ||
    /study session/i.test(title)
  )
}

function normalizeEmbeddedPath(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let path = trimmed
  if (/^coursecollab:\/\//i.test(trimmed)) {
    path = trimmed.replace(/^coursecollab:\/\//i, "")
  } else if (/^https?:\/\//i.test(trimmed)) {
    try {
      path = new URL(trimmed).pathname
    } catch {
      return null
    }
  }

  if (!path.startsWith("/")) path = `/${path}`
  return path.replace(/\/$/, "") || "/"
}

function routeFromEmbeddedPath(path: string): string | null {
  const flashcardMatch = path.match(/^\/flashcards\/(\d+)(?:\/edit)?$/)
  if (flashcardMatch) {
    return path.endsWith("/edit") ? `/flashcards/${flashcardMatch[1]}/edit` : `/flashcards/${flashcardMatch[1]}`
  }

  const dashboardFlashcards = path.match(/^\/student\/dashboard-v2\/flashcards\/(\d+)(?:\/edit)?$/)
  if (dashboardFlashcards) {
    return path.endsWith("/edit")
      ? `/flashcards/${dashboardFlashcards[1]}/edit`
      : `/flashcards/${dashboardFlashcards[1]}`
  }

  if (path.startsWith("/student/dashboard-v2/practice")) return "/module/practice"
  if (path.startsWith("/student/dashboard-v2/flashcards")) return "/module/flashcards"
  if (path.startsWith("/student/dashboard-v2/ai-tutor")) return "/module/ai-tutor"
  if (path.startsWith("/module/")) return path

  return null
}

function resolveEmbeddedStudyRoute(...parts: Array<string | null | undefined>): string | null {
  const haystack = parts.filter(Boolean).join("\n")
  if (!haystack) return null

  const embeddedPath =
    haystack.match(/coursecollab:\/\/\/[^\s"'<>]+/i)?.[0] ??
    haystack.match(
      /\/(?:module|flashcards|assessment|announcements|messages|lecture|collaboration|recommendations|schedule-adjustment|student)[^\s"'<>]*/i,
    )?.[0] ??
    haystack.match(/https?:\/\/[^\s"'<>]+/i)?.[0]

  if (embeddedPath) {
    const normalized = normalizeEmbeddedPath(embeddedPath)
    if (normalized) {
      const routed = routeFromEmbeddedPath(normalized)
      if (routed) return routed
    }
  }

  const deckMatch = haystack.match(/(?:deck[_\s-]?id|flashcard[_\s-]?deck)[=:\s#]+(\d+)/i)
  if (deckMatch) return `/flashcards/${deckMatch[1]}`

  const topicMatch = haystack.match(/(?:practice[_\s-]?topic|topic)[=:\s#]+([^\n,]+)/i)
  if (topicMatch) {
    const topic = encodeURIComponent(topicMatch[1].trim())
    // The practice hub ignores ?topic=; /practice/topic is the screen that reads it.
    return `/practice/topic?topic=${topic}`
  }

  return null
}

/** Native route when the student taps Study on a calendar session row. */
export function resolveStudySessionRoute(event: CalendarEvent): string {
  const title = event.title?.trim() ?? ""
  const description = event.description?.trim() ?? ""

  const embedded = resolveEmbeddedStudyRoute(description, event.location, title)
  if (embedded) return embedded

  if (title.startsWith("Flashcards:") || (event.event_type === "ai_reminder" && title.startsWith("Flashcards:"))) {
    return "/module/flashcards"
  }
  if (title.startsWith("Practice Hub:")) {
    return "/module/practice"
  }
  if (/practice|quiz|homework|exam|analysis|problem/i.test(`${title} ${description}`)) {
    return "/module/practice"
  }
  if (/flashcard|deck|review cards/i.test(`${title} ${description}`)) {
    return "/module/flashcards"
  }
  if (title.startsWith("Study:")) {
    return "/module/flashcards"
  }
  if (event.event_type === "study_session" || /study session/i.test(title)) {
    return "/module/flashcards"
  }
  return "/module/ai-tutor"
}
