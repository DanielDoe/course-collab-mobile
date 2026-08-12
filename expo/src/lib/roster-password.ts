/** Default roster passwords by course — mirrors v0-coursecollabv3/lib/student-roster-default-password.ts */
export const STUDENT_ROSTER_DEFAULT_PASSWORD = "ELEG2026!" as const
export const STUDENT_ROSTER_DEFAULT_PASSWORD_ECE2202 = "ECE2202!" as const

const BY_COURSE_CODE: Record<string, string> = {
  ECE2202: STUDENT_ROSTER_DEFAULT_PASSWORD_ECE2202,
  ELEG1301: STUDENT_ROSTER_DEFAULT_PASSWORD,
  ELEG1304: STUDENT_ROSTER_DEFAULT_PASSWORD,
  LEGACY: STUDENT_ROSTER_DEFAULT_PASSWORD}

export function normalizeCourseCodeForDefaultPassword(courseCode: string | null | undefined): string {
  return String(courseCode ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
}

export function getStudentRosterDefaultPassword(courseCode: string | null | undefined): string {
  const key = normalizeCourseCodeForDefaultPassword(courseCode)
  if (key && BY_COURSE_CODE[key]) return BY_COURSE_CODE[key]
  return STUDENT_ROSTER_DEFAULT_PASSWORD
}

export function formatCourseDefaultPasswordHint(
  courseCode: string | null | undefined,
  courseTitle?: string | null,
): string {
  const title = String(courseTitle ?? "").trim()
  const code = String(courseCode ?? "").trim()
  if (title && code && title.toUpperCase() !== code.toUpperCase()) return `${title} (${code})`
  return title || code || "your course"
}
