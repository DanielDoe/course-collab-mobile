import { ApiError } from "./api"
import { mfaTrustRequestHeadersForInstructor } from "./mfa-device-trust"
import { getStoredSession, type FacultySession } from "./session"
import { mergeCookieHeaders, studentHttpCookieHeader } from "./student-http-cookies"
import { headersHaveStudentSessionProof, STUDENT_REFRESH_HEADER } from "./student-session-proof"

export type FacultyApiScope = {
  instructorId: number
  courseId?: number
  sessionId?: number | null
  sessionCode?: string | null
  academicTermId?: number | null
  universityId?: number | null
}

function refreshTokenFromCookieHeader(cookie: string | undefined): string | undefined {
  if (!cookie) return undefined
  const match = cookie.match(/(?:^|;\s*)cc_refresh=([^;]+)/i)
  const token = match?.[1]?.trim()
  return token || undefined
}

/** Mirrors web `buildInstructorApiHeaders` — course, section, term, and campus scope. */
export async function buildFacultyApiHeaders(
  scope: FacultyApiScope,
  init?: {
    requireAuthHeader?: boolean
    omitCourseId?: boolean
    headers?: Record<string, string>
  },
): Promise<Record<string, string>> {
  const stored = await getStoredSession()
  const faculty = stored?.portal === "faculty" ? (stored as FacultySession) : undefined

  const universityId =
    scope.universityId != null && Number.isFinite(scope.universityId)
      ? Math.trunc(scope.universityId)
      : faculty?.selectedUniversityId != null && Number.isFinite(faculty.selectedUniversityId)
        ? Math.trunc(faculty.selectedUniversityId)
        : null

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-instructor-id": String(scope.instructorId),
    ...(init?.headers),
  }

  if (scope.courseId != null && !init?.omitCourseId) {
    headers["x-course-id"] = String(scope.courseId)
  }
  if (scope.sessionId != null && Number.isFinite(scope.sessionId)) {
    headers["x-session-id"] = String(scope.sessionId)
  }
  if (scope.academicTermId != null && Number.isFinite(scope.academicTermId)) {
    headers["x-academic-term-id"] = String(scope.academicTermId)
  }
  if (universityId != null) {
    headers["x-university-id"] = String(universityId)
  }
  if (init?.requireAuthHeader) {
    headers.Authorization = "instructor"
  }

  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForInstructor(faculty)
  Object.assign(headers, mergeCookieHeaders(trust.Cookie, jarCookie))
  const refresh =
    refreshTokenFromCookieHeader(jarCookie) ?? refreshTokenFromCookieHeader(trust.Cookie)
  if (refresh) headers[STUDENT_REFRESH_HEADER] = refresh
  if (!headersHaveStudentSessionProof(headers)) {
    throw new ApiError("Instructor authentication required", 401)
  }

  return headers
}
