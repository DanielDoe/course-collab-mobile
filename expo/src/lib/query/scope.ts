import type { AppSession, FacultySession, StudentSession } from "../session"
import { normalizedStudentDatabaseId } from "../student-content-context"

export type QueryPortal = "student" | "faculty" | "admin" | "guest" | "summer"

export type QueryScope = {
  portal: QueryPortal
  userId: string
  courseId: number | null
  section: string | null
  /** Faculty offering session pk — distinguishes reused section codes across terms. */
  sessionId?: number | null
}

export function queryScopeFromSession(
  session: AppSession,
  courseIdOverride?: number | null,
  sectionOverride?: string | null,
): QueryScope {
  if (session.portal === "student") {
    return studentQueryScope({
      ...session,
      ...(courseIdOverride != null ? { courseId: courseIdOverride } : {}),
      ...(sectionOverride != null ? { section: sectionOverride } : {}),
    })
  }
  if (session.portal === "faculty") {
    return facultyQueryScope(session, courseIdOverride ?? null)
  }
  if (session.portal === "admin") {
    return {
      portal: "admin",
      userId: String(session.id),
      courseId: null,
      section: null,
      sessionId: null,
    }
  }
  return {
    portal: session.portal,
    userId: session.databaseId,
    courseId: null,
    section: null,
    sessionId: null,
  }
}

export function studentQueryScope(session: StudentSession): QueryScope {
  const userId =
    normalizedStudentDatabaseId(session) ?? session.id?.trim() ?? session.databaseId?.trim() ?? ""
  return {
    portal: "student",
    userId,
    courseId: session.courseId ?? null,
    section: session.section?.trim() || null,
    sessionId: null,
  }
}

export function studentInboxScope(session: {
  databaseId: string
  section?: string | null
  courseId?: number | null
}): QueryScope {
  return {
    portal: "student",
    userId: session.databaseId,
    courseId: session.courseId ?? null,
    section: session.section?.trim() || null,
    sessionId: null,
  }
}

export function facultyQueryScopeFromInstructor(scope: {
  instructorId: number
  courseId?: number | null
  sessionCode?: string | null
  sessionId?: number | null
}): QueryScope {
  return facultyQueryScope(
    { id: scope.instructorId },
    scope.courseId ?? null,
    scope.sessionCode ?? null,
    scope.sessionId ?? null,
  )
}

export function facultyQueryScope(
  session: Pick<FacultySession, "id">,
  courseId: number | null,
  section: string | null = null,
  sessionId: number | null = null,
): QueryScope {
  const sid =
    sessionId != null && Number.isFinite(sessionId) && sessionId > 0 ? Math.trunc(sessionId) : null
  return {
    portal: "faculty",
    userId: String(session.id),
    courseId,
    section: section?.trim() || null,
    sessionId: sid,
  }
}

export function serializeQueryScope(scope: QueryScope): string {
  const sessionKey =
    scope.sessionId != null && Number.isFinite(scope.sessionId) ? String(scope.sessionId) : "none"
  return [scope.portal, scope.userId, scope.courseId ?? "none", scope.section ?? "none", sessionKey].join(
    ":",
  )
}

export function scopesEqual(a: QueryScope | null, b: QueryScope | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return serializeQueryScope(a) === serializeQueryScope(b)
}
