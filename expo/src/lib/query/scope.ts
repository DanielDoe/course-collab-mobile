import type { AppSession, FacultySession, StudentSession } from "../session"

export type QueryPortal = "student" | "faculty" | "admin" | "guest" | "summer"

export type QueryScope = {
  portal: QueryPortal
  userId: string
  courseId: number | null
  section: string | null
}

export function queryScopeFromSession(session: AppSession, facultyCourseId?: number | null): QueryScope {
  if (session.portal === "student") {
    return studentQueryScope(session)
  }
  if (session.portal === "faculty") {
    return facultyQueryScope(session, facultyCourseId ?? null)
  }
  if (session.portal === "admin") {
    return {
      portal: "admin",
      userId: String(session.id),
      courseId: null,
      section: null,
    }
  }
  return {
    portal: session.portal,
    userId: session.databaseId,
    courseId: null,
    section: null,
  }
}

export function studentQueryScope(session: StudentSession): QueryScope {
  return {
    portal: "student",
    userId: session.databaseId,
    courseId: session.courseId ?? null,
    section: session.section?.trim() || null,
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
  }
}

export function facultyQueryScopeFromInstructor(scope: {
  instructorId: number
  courseId?: number | null
}): QueryScope {
  return facultyQueryScope({ id: scope.instructorId }, scope.courseId ?? null)
}

export function facultyQueryScope(
  session: Pick<FacultySession, "id">,
  courseId: number | null,
  section: string | null = null,
): QueryScope {
  return {
    portal: "faculty",
    userId: String(session.id),
    courseId,
    section: section?.trim() || null,
  }
}

export function serializeQueryScope(scope: QueryScope): string {
  return [scope.portal, scope.userId, scope.courseId ?? "none", scope.section ?? "none"].join(":")
}

export function scopesEqual(a: QueryScope | null, b: QueryScope | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return serializeQueryScope(a) === serializeQueryScope(b)
}
