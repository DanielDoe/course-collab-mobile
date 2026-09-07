import { ApiError, studentApi, studentAuthenticatedRequest } from "./student-api"
import {
  enrollmentFromOption,
  enrollmentFromStudentSession,
  mergeStudentEnrollments,
  parseStudentEnrollmentsPayload,
  studentRowIdFromBindResponse,
  type StudentEnrollment,
} from "./student-enrollment"
import {
  peekStashedStudentEnrollments,
  stashStudentEnrollments,
} from "./student-enrollments-cache"
import type { StudentSession } from "./session"
import type { EnrollmentOption } from "./api"

export async function fetchStudentEnrollments(session: StudentSession): Promise<StudentEnrollment[]> {
  const sessionRows = enrollmentFromStudentSession(session)
  const cached = peekStashedStudentEnrollments() ?? []
  const fetched = await loadEnrollmentsFromApi(session)
  const merged = mergeStudentEnrollments(
    fetched,
    cached,
    sessionRows ? [sessionRows] : [],
  )
  if (merged.length > 0) {
    stashStudentEnrollments(merged)
  }
  return merged
}

async function loadEnrollmentsFromApi(session: StudentSession): Promise<StudentEnrollment[]> {
  try {
    const payload = await studentApi.getEnrollments(session)
    const parsed = parseStudentEnrollmentsPayload(payload)
    if (parsed.length > 0) return parsed
  } catch {
    /* production may not deploy /api/student/enrollments yet — fall back below */
  }

  try {
    const info = await studentAuthenticatedRequest<unknown>(
      session,
      `/api/student/info?student_id=${encodeURIComponent(session.id)}`,
    )
    const parsed = parseStudentEnrollmentsPayload(info)
    if (parsed.length > 0) return parsed
  } catch {
    /* info may omit enrollments */
  }

  return []
}

export type StudentActiveEnrollmentBind = {
  status: "bound" | "client-scoped"
  studentRowId?: string
}

export async function bindStudentActiveEnrollment(
  session: StudentSession,
  enrollment: StudentEnrollment,
): Promise<StudentActiveEnrollmentBind> {
  try {
    const payload = await studentApi.setActiveEnrollment(session, enrollment)
    return {
      status: "bound",
      studentRowId: studentRowIdFromBindResponse(payload) ?? (enrollment.studentRowId != null ? String(enrollment.studentRowId) : undefined),
    }
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw error
    }
    return { status: "client-scoped" }
  }
}

export function enrollmentsFromLoginOptions(
  options: EnrollmentOption[] | undefined,
  fallback?: Pick<EnrollmentOption, "section" | "courseId" | "courseCode" | "courseTitle" | "sessionId" | "studentRowId">,
): StudentEnrollment[] {
  const sectionFallback = fallback?.section?.trim() ?? ""
  const rows = (options ?? []).map((option) =>
    enrollmentFromOption({
      ...option,
      section: option.section?.trim() || sectionFallback,
      courseCode: option.courseCode ?? fallback?.courseCode,
      courseTitle: option.courseTitle ?? fallback?.courseTitle,
      sessionId: option.sessionId ?? fallback?.sessionId,
      studentRowId: option.studentRowId ?? fallback?.studentRowId,
    }),
  )
  const selected = fallback
    ? enrollmentFromOption({
        courseId: fallback.courseId!,
        courseCode: fallback.courseCode,
        courseTitle: fallback.courseTitle,
        section: sectionFallback,
        sessionId: fallback.sessionId,
        studentRowId: fallback.studentRowId,
      })
    : null
  return mergeStudentEnrollments(
    rows.filter((row): row is StudentEnrollment => row != null),
    selected ? [selected] : [],
  )
}
