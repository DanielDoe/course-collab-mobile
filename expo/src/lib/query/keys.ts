import type { QueryScope } from "./scope"

type ScopeParts = readonly [userId: string, courseId: string, section: string, sessionId: string]

function scopeParts(scope: QueryScope): ScopeParts {
  const sessionId =
    scope.sessionId != null && Number.isFinite(scope.sessionId) ? String(scope.sessionId) : "none"
  return [scope.userId, String(scope.courseId ?? "none"), scope.section ?? "none", sessionId]
}

/**
 * Cache keys always include portal + user + course + section.
 * Course A never shares a key with Course B. Roles never share prefixes.
 */
export const queryKeys = {
  student: {
    notes: {
      root: (scope: QueryScope) => ["student", "notes", ...scopeParts(scope)] as const,
      mine: (scope: QueryScope) => ["student", "notes", ...scopeParts(scope), "mine"] as const,
      course: (scope: QueryScope) => ["student", "notes", ...scopeParts(scope), "course"] as const,
      detail: (scope: QueryScope, noteId: string | number) =>
        ["student", "notes", ...scopeParts(scope), "detail", String(noteId)] as const,
      shares: (scope: QueryScope, noteId: string | number) =>
        ["student", "notes", ...scopeParts(scope), "shares", String(noteId)] as const,
      roster: (scope: QueryScope) => ["student", "notes", ...scopeParts(scope), "roster"] as const,
    },
    flashcards: {
      root: (scope: QueryScope) => ["student", "flashcards", ...scopeParts(scope)] as const,
      decks: (scope: QueryScope) => ["student", "flashcards", ...scopeParts(scope), "decks"] as const,
      deck: (scope: QueryScope, deckId: string | number) =>
        ["student", "flashcards", ...scopeParts(scope), "deck", String(deckId)] as const,
      gamification: (scope: QueryScope) =>
        ["student", "flashcards", ...scopeParts(scope), "gamification"] as const,
    },
    announcements: {
      root: (scope: QueryScope) => ["student", "announcements", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["student", "announcements", ...scopeParts(scope), "list"] as const,
      detail: (scope: QueryScope, id: number) =>
        ["student", "announcements", ...scopeParts(scope), "detail", id] as const,
      comments: (scope: QueryScope, id: number) =>
        ["student", "announcements", ...scopeParts(scope), "comments", id] as const,
    },
    notifications: {
      root: (scope: QueryScope) => ["student", "notifications", ...scopeParts(scope)] as const,
      inbox: (scope: QueryScope) => ["student", "notifications", ...scopeParts(scope), "inbox"] as const,
    },
    lectures: {
      root: (scope: QueryScope) => ["student", "lectures", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["student", "lectures", ...scopeParts(scope), "list"] as const,
    },
    dashboard: {
      root: (scope: QueryScope) => ["student", "dashboard", ...scopeParts(scope)] as const,
      bundle: (scope: QueryScope) => ["student", "dashboard", ...scopeParts(scope), "bundle"] as const,
    },
    practice: {
      root: (scope: QueryScope) => ["student", "practice", ...scopeParts(scope)] as const,
      hub: (scope: QueryScope) => ["student", "practice", ...scopeParts(scope), "hub"] as const,
    },
    groups: {
      root: (scope: QueryScope) => ["student", "groups", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["student", "groups", ...scopeParts(scope), "list"] as const,
    },
    projects: {
      root: (scope: QueryScope) => ["student", "projects", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["student", "projects", ...scopeParts(scope), "list"] as const,
    },
    officeHours: {
      root: (scope: QueryScope) => ["student", "officeHours", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["student", "officeHours", ...scopeParts(scope), "list"] as const,
    },
    calendar: {
      root: (scope: QueryScope) => ["student", "calendar", ...scopeParts(scope)] as const,
      range: (scope: QueryScope, start: string, end: string) =>
        ["student", "calendar", ...scopeParts(scope), "range", start, end] as const,
    },
    messages: {
      root: (scope: QueryScope) => ["student", "messages", ...scopeParts(scope)] as const,
      inbox: (scope: QueryScope) => ["student", "messages", ...scopeParts(scope), "inbox"] as const,
    },
    grades: {
      root: (scope: QueryScope) => ["student", "grades", ...scopeParts(scope)] as const,
      bundle: (scope: QueryScope) => ["student", "grades", ...scopeParts(scope), "bundle"] as const,
    },
    analytics: {
      root: (scope: QueryScope) => ["student", "analytics", ...scopeParts(scope)] as const,
      bundle: (scope: QueryScope) => ["student", "analytics", ...scopeParts(scope), "bundle"] as const,
    },
    syllabus: {
      root: (scope: QueryScope) => ["student", "syllabus", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["student", "syllabus", ...scopeParts(scope), "list"] as const,
    },
  },
  faculty: {
    dashboard: {
      root: (scope: QueryScope) => ["faculty", "dashboard", ...scopeParts(scope)] as const,
      bundle: (scope: QueryScope) => ["faculty", "dashboard", ...scopeParts(scope), "bundle"] as const,
    },
    announcements: {
      root: (scope: QueryScope) => ["faculty", "announcements", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["faculty", "announcements", ...scopeParts(scope), "list"] as const,
    },
    notes: {
      root: (scope: QueryScope) => ["faculty", "notes", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["faculty", "notes", ...scopeParts(scope), "list"] as const,
      bundle: (scope: QueryScope, topicSession: string) =>
        ["faculty", "notes", ...scopeParts(scope), "bundle", topicSession] as const,
    },
    questionBank: {
      root: (scope: QueryScope) => ["faculty", "questionBank", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["faculty", "questionBank", ...scopeParts(scope), "list"] as const,
    },
    officeHours: {
      root: (scope: QueryScope) => ["faculty", "officeHours", ...scopeParts(scope)] as const,
      bundle: (scope: QueryScope) => ["faculty", "officeHours", ...scopeParts(scope), "bundle"] as const,
    },
    quizzes: {
      root: (scope: QueryScope) => ["faculty", "quizzes", ...scopeParts(scope)] as const,
      list: (scope: QueryScope, assessmentType = "quiz") =>
        ["faculty", "quizzes", ...scopeParts(scope), "list", assessmentType] as const,
    },
    homework: {
      root: (scope: QueryScope) => ["faculty", "homework", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["faculty", "homework", ...scopeParts(scope), "list"] as const,
    },
    students: {
      root: (scope: QueryScope) => ["faculty", "students", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["faculty", "students", ...scopeParts(scope), "list"] as const,
    },
    flashcards: {
      root: (scope: QueryScope) => ["faculty", "flashcards", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["faculty", "flashcards", ...scopeParts(scope), "list"] as const,
      bundle: (scope: QueryScope, deckSession: string, topicSession: string) =>
        ["faculty", "flashcards", ...scopeParts(scope), "bundle", deckSession, topicSession] as const,
    },
    messages: {
      root: (scope: QueryScope) => ["faculty", "messages", ...scopeParts(scope)] as const,
      inbox: (scope: QueryScope) => ["faculty", "messages", ...scopeParts(scope), "inbox"] as const,
    },
    syllabus: {
      root: (scope: QueryScope) => ["faculty", "syllabus", ...scopeParts(scope)] as const,
      list: (scope: QueryScope) => ["faculty", "syllabus", ...scopeParts(scope), "list"] as const,
    },
    calendar: {
      root: (scope: QueryScope) => ["faculty", "calendar", ...scopeParts(scope)] as const,
      range: (scope: QueryScope, start: string, end: string, view: "all" | "selected" = "all") =>
        ["faculty", "calendar", ...scopeParts(scope), "range", start, end, view] as const,
    },
  },
  admin: {
    faculty: (scope: QueryScope) => ["admin", "faculty", ...scopeParts(scope)] as const,
    students: (scope: QueryScope) => ["admin", "students", ...scopeParts(scope)] as const,
    courses: (scope: QueryScope) => ["admin", "courses", ...scopeParts(scope)] as const,
  },
} as const

export function queryKeyPortal(queryKey: readonly unknown[]): string | null {
  const head = queryKey[0]
  return typeof head === "string" ? head : null
}

export function queryKeyUserId(queryKey: readonly unknown[]): string | null {
  const userId = queryKey[2]
  return typeof userId === "string" ? userId : null
}

export function queryKeyCourseId(queryKey: readonly unknown[]): string | null {
  const courseId = queryKey[3]
  return typeof courseId === "string" ? courseId : null
}
