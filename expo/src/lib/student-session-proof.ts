/** Server-issued student session proof. `x-student-id` is never enough. */
export const STUDENT_REFRESH_COOKIE = "cc_refresh"
export const STUDENT_REFRESH_HEADER = "x-cc-refresh"
export const STUDENT_MFA_TRUST_COOKIE = "cc_mfa_trust"
export const STUDENT_MFA_TRUST_HEADER = "x-cc-mfa-trust"

export type StudentAuthSession = {
  databaseId: string
  section?: string
  universityId?: number
  id?: string
  authIdentifier?: string
  email?: string
  courseId?: number
  academicTermId?: number
}

export function flattenRequestHeaders(init?: HeadersInit): Record<string, string> {
  if (!init) return {}
  if (typeof Headers !== "undefined" && init instanceof Headers) {
    return Object.fromEntries(init.entries())
  }
  if (Array.isArray(init)) {
    return Object.fromEntries(init)
  }
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(init)) {
    if (typeof value === "string" && value.trim()) out[key] = value
  }
  return out
}

function headerValue(headers: Record<string, string | undefined>, name: string): string {
  const want = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === want && value?.trim()) return value.trim()
  }
  return ""
}

function cookieValue(cookieHeader: string, name: string): boolean {
  return new RegExp(`(?:^|;\\s*)${name}=`, "i").test(cookieHeader)
}

/** True when cookies or native session headers prove a student login. */
export function headersHaveStudentSessionProof(
  headers: Record<string, string | undefined>,
): boolean {
  const cookie = headerValue(headers, "cookie")
  return (
    cookieValue(cookie, STUDENT_REFRESH_COOKIE) ||
    cookieValue(cookie, STUDENT_MFA_TRUST_COOKIE) ||
    Boolean(headerValue(headers, STUDENT_REFRESH_HEADER)) ||
    Boolean(headerValue(headers, STUDENT_MFA_TRUST_HEADER))
  )
}

/** Student lecture endpoints that must never be fetched with header-only identity. */
export const LECTURE_STUDENT_API_PATHS = [
  "/api/student/lectures",
  "/api/student/lectures/",
] as const

/** Student notes endpoints that must never be fetched with header-only identity. */
export const NOTES_STUDENT_API_PATHS = [
  "/api/student/digital-notes",
  "/api/student/course-notes",
] as const

/** Student flashcard endpoints that must never be fetched with header-only identity. */
export const FLASHCARD_STUDENT_API_PATHS = [
  "/api/student/flashcards/decks",
  "/api/student/flashcards/cards/",
  "/api/student/flashcards/gamification",
] as const

/** Student Cora confirm — cookies + MFA required; x-student-id is never enough. */
export const CORA_STUDENT_CONFIRM_API_PATH = "/api/cora/actions/confirm" as const

/** CodeBench Analytics & More endpoints that must never be fetched with header-only identity. */
export const CODEBENCH_ANALYTICS_API_PATHS = [
  "/api/codebench/streak",
  "/api/codebench/badges",
  "/api/codebench/leaderboard",
  "/api/codebench/submissions",
  "/api/codebench/daily-challenge",
  "/api/codebench/analyze",
  "/api/codebench/learning-plan",
] as const

/** Dashboard endpoints that must never be fetched with header-only identity. */
export const DASHBOARD_STUDENT_API_PATHS = [
  "/api/grades/student",
  "/api/student/quiz-history",
  "/api/student/homework-history",
  "/api/attendance/score",
  "/api/attendance/streaks",
  "/api/student/quizzes",
  "/api/student/finals",
  "/api/classroom-points",
  "/api/announcements",
  "/api/student/membership",
  "/api/student/info",
  "/api/student/notifications",
] as const

/** Student assessment take / issues endpoints that must never be fetched with header-only identity. */
export const ASSESSMENT_STUDENT_API_PATHS = [
  "/api/student/start-quiz",
  "/api/student/quiz-attempt/",
  "/api/student/save-answer",
  "/api/student/finalize-quiz",
  "/api/student/quiz-progress",
  "/api/student/issues",
  "/api/student/results/",
  "/api/student/assessment-history",
  "/api/final/take/",
  "/api/quiz/take/",
  "/api/quiz/submit",
  "/api/homework/take/",
  "/api/homework/submit",
  "/api/midsem/take/",
  "/api/midsem/submit",
  "/api/student/mid-semesters",
  "/api/quiz/log-violation",
  "/api/student/attempt/",
  "/api/student/save-and-finish-later",
  "/api/student/quizzes",
] as const

/** Grades + released results — cookies + MFA required; x-student-id is never enough. */
export const GRADES_STUDENT_API_PATHS = [
  "/api/grades/student",
  "/api/student/results/",
] as const
