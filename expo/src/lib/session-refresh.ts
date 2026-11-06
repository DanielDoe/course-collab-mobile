import { API_BASE_URL } from "../constants"
import { persistHttpCookiesFromResponse } from "./student-http-cookies"
import {
  getStoredRefreshToken,
  persistRefreshToken,
  REFRESH_TOKEN_HEADER,
} from "./refresh-token-store"
import { getStoredSession, saveSession, type AppSession, type SignInPayload } from "./session"
import { preferLocalStudentEnrollmentOnRefresh } from "./student-enrollment"
import { studentDatabaseIdFromLoginRecord } from "./student-content-context"

const MIN_REFRESH_GAP_MS = 15_000

let inflight: Promise<AppSession | null> | null = null
let lastAttemptAt = 0

type RefreshPayload = {
  refreshed?: boolean
  userType?: string
  rememberMe?: boolean
  sessionExpiresIn?: number
  student?: {
    id?: number
    student_id?: string
    full_name?: string
    email?: string
    section?: string
  }
  enrollment?: {
    courseId?: number
    courseCode?: string
    courseTitle?: string
    section?: string
    academicTermId?: number | null
    academic_term_id?: number | null
  }
  university?: {
    id?: number
    name?: string
    short_name?: string
  }
  instructor?: {
    id?: number
    username?: string
    name?: string
    email?: string
    role?: string
  }
}

function payloadToSignIn(
  current: AppSession | null,
  data: RefreshPayload,
): SignInPayload | null {
  if (data.userType === "instructor" && data.instructor?.id) {
    const instructor = data.instructor
    return {
      portal: "faculty",
      id: Number(instructor.id),
      username: String(instructor.username ?? ""),
      name: String(instructor.name ?? instructor.username ?? ""),
      email: instructor.email,
      role: instructor.role,
      authIdentifier: current?.portal === "faculty" ? current.authIdentifier : instructor.username,
      universityId: current?.portal === "faculty" ? current.universityId : undefined,
      universityName: current?.portal === "faculty" ? current.universityName : undefined,
      universityShortName: current?.portal === "faculty" ? current.universityShortName : undefined,
      rememberMe: Boolean(data.rememberMe),
      sessionExpiresIn: data.sessionExpiresIn,
    }
  }

  if (data.userType !== "student" || !data.student?.id) return null
  const student = data.student
  const enrollment = data.enrollment
  const university = data.university
  const rememberMe = Boolean(data.rememberMe)
  const sessionExpiresIn = data.sessionExpiresIn

  if (current?.portal === "guest") {
    return {
      ...current,
      name: String(student.full_name ?? current.name),
      databaseId: studentDatabaseIdFromLoginRecord(student) ?? "",
      rememberMe,
      sessionExpiresIn,
    }
  }
  if (current?.portal === "summer") {
    return {
      ...current,
      name: String(student.full_name ?? current.name),
      databaseId: studentDatabaseIdFromLoginRecord(student) ?? "",
      rememberMe,
      sessionExpiresIn,
    }
  }

  const currentStudent = current?.portal === "student" ? current : null
  const course = preferLocalStudentEnrollmentOnRefresh(
    {
      courseId: currentStudent?.courseId,
      courseCode: currentStudent?.courseCode,
      courseTitle: currentStudent?.courseTitle,
      section: currentStudent?.section ?? String(enrollment?.section ?? student.section ?? ""),
      academicTermId: currentStudent?.academicTermId,
    },
    enrollment,
  )

  return {
    portal: "student",
    id: String(student.student_id ?? currentStudent?.id ?? ""),
    name: String(student.full_name ?? ""),
    section: course.section || String(student.section ?? currentStudent?.section ?? ""),
    databaseId: studentDatabaseIdFromLoginRecord(student) ?? "",
    email: student.email ?? currentStudent?.email,
    authIdentifier: currentStudent?.authIdentifier,
    courseId: course.courseId,
    courseCode: course.courseCode,
    courseTitle: course.courseTitle,
    academicTermId: course.academicTermId,
    universityId: university?.id,
    universityName: university?.name,
    universityShortName: university?.short_name,
    rememberMe,
    sessionExpiresIn,
  }
}

/** Refresh the server session and rewrite the local SecureStore session. */
export async function refreshServerSession(): Promise<AppSession | null> {
  const { hasExplicitSignOut } = await import("./signed-out-flag")
  if (await hasExplicitSignOut()) return null
  if (inflight) return inflight
  const now = Date.now()
  if (now - lastAttemptAt < MIN_REFRESH_GAP_MS) {
    return getStoredSession()
  }
  lastAttemptAt = now

  inflight = (async () => {
    try {
      if (await hasExplicitSignOut()) return null
      const token = await getStoredRefreshToken()
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      }
      if (token) headers[REFRESH_TOKEN_HEADER] = token

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers,
      })
      await persistHttpCookiesFromResponse(`${API_BASE_URL}/api/auth/refresh`, response.headers)

      if (!response.ok) return null
      const data = (await response.json()) as RefreshPayload
      const current = await getStoredSession()
      const next = payloadToSignIn(current, data)
      if (!next) return null
      const saved = await saveSession(next)
      const rotated = response.headers.get(REFRESH_TOKEN_HEADER)
      if (rotated) await persistRefreshToken(rotated)
      return saved
    } catch {
      return null
    } finally {
      inflight = null
    }
  })()

  return inflight
}
