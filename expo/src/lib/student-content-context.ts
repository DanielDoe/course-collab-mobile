import type { StudentSession } from "./session"

export type StudentContentSession = Pick<
  StudentSession,
  "databaseId" | "id" | "section" | "courseId" | "academicTermId"
>

export function academicTermIdFromUnknown(value: unknown): number | undefined {
  if (value == null || value === "") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export function enrollmentAcademicTermId(
  enrollment:
    | {
        academicTermId?: number | null
        academic_term_id?: number | null
      }
    | null
    | undefined,
): number | undefined {
  return academicTermIdFromUnknown(enrollment?.academicTermId ?? enrollment?.academic_term_id)
}

/** Course / section / Fall-term fields production uses after the enrollment restructure. */
export function appendStudentContentParams(
  params: URLSearchParams,
  session: StudentContentSession,
): URLSearchParams {
  if (session.databaseId && !params.has("studentDatabaseId")) {
    params.set("studentDatabaseId", session.databaseId)
  }
  if (session.databaseId && !params.has("studentId")) {
    params.set("studentId", session.databaseId)
  }
  if (session.section?.trim() && !params.has("session")) {
    params.set("session", session.section.trim())
  }
  if (session.courseId != null && Number.isFinite(session.courseId) && !params.has("courseId")) {
    params.set("courseId", String(session.courseId))
  }
  const termId = academicTermIdFromUnknown(session.academicTermId)
  if (termId != null && !params.has("academic_term_id")) {
    params.set("academic_term_id", String(termId))
  }
  return params
}

export function studentContentQuery(
  session: StudentContentSession,
  extra?: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams()
  appendStudentContentParams(params, session)
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value != null && String(value).trim() !== "") params.set(key, String(value))
  }
  return params.toString()
}

export function studentContentPath(
  session: StudentContentSession,
  path: string,
  extra?: Record<string, string | number | undefined>,
): string {
  const qs = studentContentQuery(session, extra)
  if (!qs) return path
  return path.includes("?") ? `${path}&${qs}` : `${path}?${qs}`
}

/** Production student web: `GET /api/projects/list?session=SECTION` with cookies — no studentId claim. */
export function studentProjectsListPath(session: StudentContentSession): string {
  return `/api/projects/list?session=${encodeURIComponent(session.section.trim())}`
}

/** JSON body fields production uses to resolve Fall 2026 course / section / term. */
export function studentContentFields(
  session: StudentContentSession,
): Record<string, string | number> {
  const fields: Record<string, string | number> = {}
  const databaseId = Number(session.databaseId)
  if (Number.isFinite(databaseId) && databaseId > 0) {
    fields.studentId = databaseId
    fields.studentDatabaseId = databaseId
  }
  if (session.section?.trim()) {
    fields.session = session.section.trim()
  }
  if (session.courseId != null && Number.isFinite(session.courseId)) {
    fields.courseId = session.courseId
  }
  const termId = academicTermIdFromUnknown(session.academicTermId)
  if (termId != null) {
    fields.academic_term_id = termId
    fields.academicTermId = termId
  }
  return fields
}
