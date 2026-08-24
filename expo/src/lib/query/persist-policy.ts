import { queryKeyPortal } from "./keys"

const PERSISTABLE_PREFIXES = [
  ["student", "notes"],
  ["student", "flashcards"],
  ["student", "announcements"],
  ["student", "lectures"],
  ["student", "practice"],
  ["student", "groups"],
  ["student", "projects"],
  ["student", "officeHours"],
  ["student", "calendar"],
  ["faculty", "notes"],
  ["faculty", "flashcards"],
  ["faculty", "announcements"],
] as const

const NEVER_PERSIST_SEGMENTS = new Set([
  "dashboard",
  "questionBank",
  "quizzes",
  "homework",
  "grades",
  "exam",
  "exams",
  "finals",
  "answers",
  "answerKey",
  "hiddenKey",
  "admin",
  "cora",
  "auth",
  "session",
  "password",
  "token",
  "billing",
  "payment",
  "membership",
  "trade",
  "messages",
])

export function canPersistQueryKey(queryKey: readonly unknown[]): boolean {
  if (queryKey.length < 2) return false
  const portal = queryKeyPortal(queryKey)
  if (portal === "admin") return false
  if (queryKey.some((part) => typeof part === "string" && NEVER_PERSIST_SEGMENTS.has(part))) {
    return false
  }
  return PERSISTABLE_PREFIXES.some(
    (prefix) => queryKey[0] === prefix[0] && queryKey[1] === prefix[1],
  )
}

export function persistStorageKey(portal: string, userId: string, courseId: number | null): string {
  return `cc.query.v1.${portal}.${userId}.${courseId ?? "none"}`
}

export function isQueryPersistStorageKey(key: string): boolean {
  return key.startsWith("cc.query.v1.")
}
