import { resolveNotificationLink } from "../notification-link"
import { normalizeCoraDeepLink } from "./resolve-open-route-normalize"

const ENTITY_TYPE_TO_NATIVE: Record<string, string> = {
  announcement: "/announcements",
  question: "/module/question-bank",
  assessment: "/module/quizzes",
  message: "/module/messages",
  syllabus: "/module/syllabus",
  lecture: "/module/lectures",
  flashcard_deck: "/module/flashcards",
  note: "/module/notes",
  calendar_events: "/module/calendar",
  practice_quiz: "/module/practice",
  study_plan: "/module/ai-tutor",
}

const NATIVE_ROUTE_PREFIX =
  /^\/(module|dashboard|announcements|assessment|messages|lecture|collaboration|membership|settings|recommendations|summer|flashcards|schedule-adjustment)(\/|$|\?)/

export function nativeRouteForModuleId(moduleId: string): string | null {
  return resolveNotificationLink(`/student/dashboard-v2/${moduleId}`)
}

export function resolveCoraOpenRoute(route: string | null | undefined): string | null {
  const normalized = normalizeCoraDeepLink(route)
  if (!normalized) return null

  if (NATIVE_ROUTE_PREFIX.test(normalized)) {
    return normalized
  }

  const fromLink = resolveNotificationLink(normalized) ?? resolveNotificationLink(route)
  if (fromLink) return fromLink

  const entityType = normalized.match(/entityType[=:]([a-z_]+)/i)?.[1]
  if (entityType && ENTITY_TYPE_TO_NATIVE[entityType]) {
    return ENTITY_TYPE_TO_NATIVE[entityType]
  }

  return null
}
