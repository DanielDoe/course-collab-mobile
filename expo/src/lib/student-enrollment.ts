import type { EnrollmentOption } from "./api"
import { enrollmentAcademicTermId } from "./student-content-context"
import type { StudentSession } from "./session"

export type StudentEnrollmentStatus = "active" | "completed" | "archived" | "inactive"

export type StudentEnrollment = {
  courseId: number
  courseCode: string
  courseTitle: string
  section: string
  sectionId?: number | null
  academicTermId?: number
  academicTermLabel?: string
  instructorName?: string
  studentRowId?: number | null
  status: StudentEnrollmentStatus
  pickerKey: string
}

export type StudentCoursePatch = {
  courseId?: number
  courseCode?: string
  courseTitle?: string
  section: string
  academicTermId?: number
  databaseId?: string
}

const ACTIVE_STATUSES = new Set<StudentEnrollmentStatus>(["active"])

export function studentEnrollmentPickerKey(courseId: number, section?: string | null): string {
  const normalizedSection = section?.trim()
  return normalizedSection ? `course-${courseId}-section-${normalizedSection}` : `course-${courseId}`
}

export function studentEnrollmentScopeKey(enrollment: Pick<StudentEnrollment, "courseId" | "section"> | null | undefined): string {
  if (!enrollment?.courseId) return "none"
  return studentEnrollmentPickerKey(enrollment.courseId, enrollment.section)
}

function asFiniteId(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null
}

function asTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function parseEnrollmentStatus(value: unknown, explicitActive?: unknown): StudentEnrollmentStatus {
  if (explicitActive === false) return "inactive"
  const raw = asTrimmed(value).toLowerCase()
  if (raw === "completed" || raw === "complete") return "completed"
  if (raw === "archived" || raw === "inactive" || raw === "dropped" || raw === "withdrawn") {
    return raw === "archived" ? "archived" : "inactive"
  }
  return "active"
}

export function normalizeStudentEnrollment(raw: unknown): StudentEnrollment | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const courseId = asFiniteId(row.courseId ?? row.course_id ?? row.id)
  if (courseId == null) return null

  const courseCode = asTrimmed(row.courseCode ?? row.course_code ?? row.code)
  const courseTitle = asTrimmed(row.courseTitle ?? row.course_title ?? row.title ?? row.name)
  const section = asTrimmed(
    row.section ?? row.session ?? row.session_code ?? row.sectionCode ?? row.section_code,
  )
  const academicTermId = enrollmentAcademicTermId({
    academicTermId: asFiniteId(row.academicTermId) ?? undefined,
    academic_term_id: asFiniteId(row.academic_term_id) ?? undefined,
  })
  const academicTermLabel = asTrimmed(
    row.academicTermLabel ??
      row.academic_term_label ??
      row.termLabel ??
      row.term_label ??
      row.semester ??
      row.academicTerm ??
      row.academic_term,
  )
  const sectionId = asFiniteId(row.sectionId ?? row.section_id ?? row.sessionId ?? row.session_id)
  const studentRowId = asFiniteId(row.studentRowId ?? row.student_row_id ?? row.databaseId)
  const instructorName = asTrimmed(
    row.instructorName ?? row.instructor_name ?? row.facultyName ?? row.faculty_name,
  )

  return {
    courseId,
    courseCode,
    courseTitle,
    section,
    sectionId,
    academicTermId,
    academicTermLabel: academicTermLabel || undefined,
    instructorName: instructorName || undefined,
    studentRowId,
    status: parseEnrollmentStatus(row.status ?? row.enrollmentStatus ?? row.enrollment_status, row.is_active ?? row.active),
    pickerKey: studentEnrollmentPickerKey(courseId, section),
  }
}

export function enrollmentFromOption(option: EnrollmentOption): StudentEnrollment | null {
  return normalizeStudentEnrollment(option)
}

export function enrollmentFromStudentSession(session: StudentSession): StudentEnrollment | null {
  if (session.courseId == null || !Number.isFinite(session.courseId) || session.courseId <= 0) {
    return null
  }
  return {
    courseId: Math.trunc(session.courseId),
    courseCode: session.courseCode?.trim() ?? "",
    courseTitle: session.courseTitle?.trim() ?? "",
    section: session.section?.trim() ?? "",
    academicTermId: session.academicTermId,
    status: "active",
    pickerKey: studentEnrollmentPickerKey(session.courseId, session.section),
  }
}

export function parseStudentEnrollmentsPayload(payload: unknown): StudentEnrollment[] {
  const rows = extractEnrollmentRows(payload)
  const seen = new Set<string>()
  const enrollments: StudentEnrollment[] = []
  for (const row of rows) {
    const enrollment = normalizeStudentEnrollment(row)
    if (!enrollment || seen.has(enrollment.pickerKey)) continue
    seen.add(enrollment.pickerKey)
    enrollments.push(enrollment)
  }
  return enrollments
}

/** Dedupe enrollments — later lists win on matching picker keys. */
export function mergeStudentEnrollments(...lists: Array<readonly StudentEnrollment[]>): StudentEnrollment[] {
  const byKey = new Map<string, StudentEnrollment>()
  for (const list of lists) {
    for (const row of list) {
      if (!row?.courseId) continue
      byKey.set(row.pickerKey, row)
    }
  }
  return [...byKey.values()]
}

function extractEnrollmentRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []
  const record = payload as Record<string, unknown>
  for (const key of ["enrollments", "courses", "offerings", "data"]) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }
  if (record.student && typeof record.student === "object") {
    const student = record.student as Record<string, unknown>
    if (Array.isArray(student.enrollments)) return student.enrollments
  }
  return []
}

export function isActiveStudentEnrollment(enrollment: StudentEnrollment): boolean {
  return ACTIVE_STATUSES.has(enrollment.status)
}

export function studentActiveEnrollments(enrollments: StudentEnrollment[]): StudentEnrollment[] {
  return enrollments.filter(isActiveStudentEnrollment)
}

export function studentEnrollmentMatches(
  selected: Pick<StudentEnrollment, "courseId" | "section" | "pickerKey"> | null | undefined,
  candidate: StudentEnrollment,
): boolean {
  if (!selected) return false
  if (selected.pickerKey && candidate.pickerKey) return selected.pickerKey === candidate.pickerKey
  if (selected.courseId !== candidate.courseId) return false
  const selectedSection = selected.section?.trim() ?? ""
  const candidateSection = candidate.section?.trim() ?? ""
  if (!selectedSection || !candidateSection) return selected.courseId === candidate.courseId
  return selectedSection === candidateSection
}

export function findEnrolledCourse(
  enrollments: StudentEnrollment[],
  courseId: number,
  section?: string | null,
): StudentEnrollment | null {
  if (!Number.isFinite(courseId) || courseId <= 0) return null
  const matches = enrollments.filter((enrollment) => enrollment.courseId === courseId)
  if (matches.length === 0) return null
  const normalized = section?.trim()
  if (normalized) {
    return matches.find((enrollment) => enrollment.section.trim() === normalized) ?? null
  }
  return matches.length === 1 ? matches[0]! : matches.find(isActiveStudentEnrollment) ?? matches[0]!
}

/**
 * Restore the last selected course only when the student is still enrolled.
 * Prefers an active-term / active-status row over archived leftovers.
 */
export function resolveStoredStudentEnrollment(
  enrollments: StudentEnrollment[],
  storedCourseId: number | null | undefined,
  storedSection?: string | null,
  sessionFallback?: StudentSession | null,
): StudentEnrollment | null {
  const active = studentActiveEnrollments(enrollments)
  const pool = active.length > 0 ? active : enrollments

  if (storedCourseId != null) {
    const stored = findEnrolledCourse(pool, storedCourseId, storedSection)
    if (stored) return stored
  }

  if (sessionFallback?.courseId != null) {
    const fromSession =
      findEnrolledCourse(pool, sessionFallback.courseId, sessionFallback.section) ??
      findEnrolledCourse(enrollments, sessionFallback.courseId, sessionFallback.section)
    if (fromSession) return fromSession
  }

  if (pool.length === 1) return pool[0]!
  return pool[0] ?? null
}

export function studentRowIdFromBindResponse(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const record = payload as Record<string, unknown>
  const student = record.student && typeof record.student === "object" ? (record.student as Record<string, unknown>) : null
  const fromStudent = Number(student?.id)
  if (Number.isFinite(fromStudent) && fromStudent > 0) return String(Math.trunc(fromStudent))
  const active = record.activeEnrollment && typeof record.activeEnrollment === "object"
    ? (record.activeEnrollment as Record<string, unknown>)
    : null
  const fromActive = Number(active?.studentRowId ?? active?.student_row_id)
  if (Number.isFinite(fromActive) && fromActive > 0) return String(Math.trunc(fromActive))
  return undefined
}

export function studentEnrollmentSessionPatch(
  enrollment: StudentEnrollment,
  preserve?: Pick<StudentSession, "section">,
): StudentCoursePatch {
  const section = enrollment.section.trim() || preserve?.section?.trim() || ""
  return {
    courseId: enrollment.courseId,
    courseCode: enrollment.courseCode || undefined,
    courseTitle: enrollment.courseTitle || undefined,
    section,
    academicTermId: enrollment.academicTermId,
  }
}

export function studentEnrollmentCodeLabel(enrollment: StudentEnrollment | null | undefined): string {
  if (!enrollment) return "Select course"
  return enrollment.courseCode.trim() || `Course ${enrollment.courseId}`
}

export function studentEnrollmentTitleLabel(enrollment: StudentEnrollment | null | undefined): string {
  return enrollment?.courseTitle.trim() || ""
}

/** One-line hero label: "ECE2202 · Circuit Analysis" — code only when title is missing or repeats it. */
export function studentEnrollmentHeadline(code?: string | null, title?: string | null): string {
  const courseCode = code?.trim() ?? ""
  const courseTitle = title?.trim() ?? ""
  if (courseCode && courseTitle) {
    const compact = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    const codeKey = compact(courseCode)
    const titleKey = compact(courseTitle)
    if (codeKey === titleKey) return courseCode
    if (titleKey.startsWith(codeKey)) return courseTitle
    return `${courseCode} · ${courseTitle}`
  }
  return courseCode || courseTitle
}

export function studentEnrollmentMetaLabel(enrollment: StudentEnrollment | null | undefined): string {
  if (!enrollment) return ""
  const section = enrollment.section.trim()
  const term = enrollment.academicTermLabel?.trim()
  if (section && term) return `${section} • ${term}`
  return section || term || ""
}

export function studentEnrollmentPickerLabel(enrollment: StudentEnrollment): string {
  const code = studentEnrollmentCodeLabel(enrollment)
  const section = enrollment.section.trim()
  return section ? `${code} • ${section}` : code
}

export function preferLocalStudentEnrollmentOnRefresh(
  current: Pick<StudentSession, "courseId" | "courseCode" | "courseTitle" | "section" | "academicTermId">,
  server: {
    courseId?: number
    courseCode?: string
    courseTitle?: string
    section?: string
    academicTermId?: number | null
    academic_term_id?: number | null
  } | null | undefined,
): StudentCoursePatch {
  const serverCourseId = server?.courseId
  const localCourseId = current.courseId
  if (
    localCourseId != null &&
    Number.isFinite(localCourseId) &&
    serverCourseId != null &&
    Number.isFinite(serverCourseId) &&
    Math.trunc(serverCourseId) !== Math.trunc(localCourseId)
  ) {
    return {
      courseId: current.courseId,
      courseCode: current.courseCode,
      courseTitle: current.courseTitle,
      section: current.section,
      academicTermId: current.academicTermId,
    }
  }

  return {
    courseId: serverCourseId ?? current.courseId,
    courseCode: server?.courseCode ?? current.courseCode,
    courseTitle: server?.courseTitle ?? current.courseTitle,
    section: server?.section?.trim() || current.section,
    academicTermId: enrollmentAcademicTermId(server) ?? current.academicTermId,
  }
}
