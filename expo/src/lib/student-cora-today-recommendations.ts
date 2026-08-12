import type { AiTutorRecommendation, AiTutorStats } from "./ai-tutor-api"
import type { CoraProgressDetailed } from "./cora-insights-types"
import type { StudentContextPayload } from "./student-context-api"

export const CORA_TODAY_LINK_CHAT = "cora:chat"
export const CORA_TODAY_LINK_PREPARE_EXAM = "cora:prepare-exam"
export const CORA_TODAY_LINK_STUDY_PLAN = "cora:study-plan"
export const CORA_TODAY_LINK_SUMMARIZE = "cora:summarize-lecture"

const MAX_TODAY_ITEMS = 12
const UPCOMING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export type StudentCoraTodayInput = {
  payload: StudentContextPayload | null | undefined
  apiRecommendations?: AiTutorRecommendation[]
  stats?: AiTutorStats | null
  progress?: CoraProgressDetailed | null
}

function item(id: string, title: string, description: string, link: string): AiTutorRecommendation {
  return { id, title, description, link }
}

function dedupeKey(rec: AiTutorRecommendation): string {
  return rec.id || rec.title.trim().toLowerCase()
}

function fallbackRecommendations(courseCode?: string | null): AiTutorRecommendation[] {
  const course = courseCode?.trim() || "your course"
  return [
    item(
      "fallback-solve",
      "Start with Solve",
      "Paste a homework or quiz question for step-by-step help.",
      CORA_TODAY_LINK_CHAT,
    ),
    item(
      "fallback-practice",
      "Open Practice Hub",
      `Work through ${course} topics with guided mode.`,
      "/module/practice",
    ),
    item(
      "fallback-learn",
      "Review lectures",
      "Summarize slides and sample problems with Cora.",
      "/module/lectures",
    ),
  ]
}

function collectWeakTopics(
  payload: StudentContextPayload,
  progress?: CoraProgressDetailed | null,
): string[] {
  const fromStruggling = payload.strugglingTopics ?? []
  const fromMastery =
    payload.topicMastery
      ?.filter((row) => row.status === "weak" || row.mastery < 0.55)
      .map((row) => row.topic) ?? []
  const fromProgress =
    progress?.conceptMastery?.filter((row) => row.mastery < 55).map((row) => row.topic) ?? []

  const seen = new Set<string>()
  const result: string[] = []
  for (const topic of [...fromStruggling, ...fromMastery, ...fromProgress]) {
    const key = topic.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(topic.trim())
  }
  return result
}

/** Merge platform API picks with live student-context signals — API items fill gaps, never duplicate titles. */
export function buildStudentCoraTodayRecommendations(input: StudentCoraTodayInput): AiTutorRecommendation[] {
  const { payload, apiRecommendations = [], stats, progress } = input
  const merged: AiTutorRecommendation[] = []
  const seen = new Set<string>()

  const push = (rec: AiTutorRecommendation) => {
    const key = dedupeKey(rec)
    if (seen.has(key)) return
    seen.add(key)
    merged.push(rec)
  }

  if (!payload) {
    for (const rec of apiRecommendations) push(rec)
    if (merged.length >= 3) return merged.slice(0, MAX_TODAY_ITEMS)
    for (const rec of fallbackRecommendations()) push(rec)
    return merged.slice(0, MAX_TODAY_ITEMS)
  }

  const courseCode = payload.account?.courseCode ?? null
  const now = Date.now()

  for (const assessment of (payload.missedDeadlines ?? []).slice(0, 2)) {
    push(
      item(
        `missed-${assessment.id}`,
        `Catch up on ${assessment.title}`,
        `This ${assessment.type ?? "assignment"} is past due — Cora can help you recover.`,
        CORA_TODAY_LINK_CHAT,
      ),
    )
  }

  for (const assessment of payload.upcomingAssessments ?? []) {
    const dueMs = assessment.dueDate ? new Date(assessment.dueDate).getTime() : NaN
    if (!Number.isFinite(dueMs) || dueMs < now || dueMs - now > UPCOMING_WINDOW_MS) continue
    const days = Math.max(1, Math.ceil((dueMs - now) / (24 * 60 * 60 * 1000)))
    push(
      item(
        `upcoming-${assessment.id}`,
        `Prepare for ${assessment.title}`,
        `Due in ~${days} day${days === 1 ? "" : "s"} — start a focused review with Cora.`,
        CORA_TODAY_LINK_PREPARE_EXAM,
      ),
    )
  }

  for (const topic of collectWeakTopics(payload, progress).slice(0, 2)) {
    push(
      item(
        `weak-${topic.toLowerCase().replace(/\s+/g, "-")}`,
        `Strengthen ${topic}`,
        `Practice guided questions and get Cora feedback on ${courseCode ?? "this topic"}.`,
        "/module/practice",
      ),
    )
  }

  const lecture =
    payload.knowledgeGraph?.lectures?.[0] ??
    (payload.digitalNotes?.[0]
      ? { id: payload.digitalNotes[0].id, title: payload.digitalNotes[0].title }
      : null)
  if (lecture?.title) {
    push(
      item(
        `lecture-${lecture.id}`,
        `Summarize ${lecture.title}`,
        "Turn this lecture into exam-ready notes and a glossary with Cora.",
        CORA_TODAY_LINK_SUMMARIZE,
      ),
    )
  }

  const deck = payload.flashcardDecks?.[0]
  if (deck) {
    const countLabel =
      typeof deck.cardCount === "number" ? `${deck.cardCount} cards` : "Your deck"
    push(
      item(
        `deck-${deck.id}`,
        `Study ${deck.title}`,
        `${countLabel} ready — review or ask Cora to explain tricky cards.`,
        "/module/flashcards",
      ),
    )
  }

  const unread = (payload.knowledgeGraph?.notifications ?? []).filter((row) => !row.isRead)
  if (unread.length > 0) {
    push(
      item(
        `notify-${unread[0].id}`,
        unread.length === 1 ? "Unread course update" : `${unread.length} unread updates`,
        unread[0].title,
        "/module/announcements",
      ),
    )
  }

  const nextStudyEvent = (payload.calendarEvents ?? payload.knowledgeGraph?.calendar ?? []).find((event) => {
    const startMs = event.start ? new Date(event.start).getTime() : NaN
    return Number.isFinite(startMs) && startMs >= now && startMs - now <= UPCOMING_WINDOW_MS
  })
  if (nextStudyEvent?.title) {
    push(
      item(
        `calendar-${nextStudyEvent.id}`,
        `Plan around ${nextStudyEvent.title}`,
        "Build a realistic study schedule with Cora before this commitment.",
        CORA_TODAY_LINK_STUDY_PLAN,
      ),
    )
  }

  if (stats && stats.streakDays <= 1 && stats.totalQuestions > 0) {
    push(
      item(
        "streak",
        "Keep your Cora streak alive",
        "Ask one question today to stay on track with your course.",
        CORA_TODAY_LINK_CHAT,
      ),
    )
  }

  for (const rec of apiRecommendations) push(rec)

  if (merged.length < 3) {
    for (const rec of fallbackRecommendations(courseCode)) {
      push(rec)
      if (merged.length >= 6) break
    }
  }

  return merged.slice(0, MAX_TODAY_ITEMS)
}
