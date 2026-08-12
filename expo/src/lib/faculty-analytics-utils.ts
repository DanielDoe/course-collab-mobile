import type {
  AttendanceStudentSummary,
  InstructorProgressReviewRow,
  PracticeStudentProgress} from "./instructor-api"
import type { ProgressReviewPeriod } from "./progress-review-utils"

export type StudentProgressTab = "overview" | "students" | "at_risk"

export {
  INSTRUCTOR_REPORT_TEMPLATES as INSTRUCTOR_REPORT_TYPES,
  reportTypeLabel,
  type InstructorReportTemplateId as InstructorReportTypeId,
  type ReportTemplateConfig} from "./instructor-reports-utils"

export function filterPracticeProgress(
  rows: PracticeStudentProgress[],
  query: string,
  section: string,
): PracticeStudentProgress[] {
  const q = query.trim().toLowerCase()
  return rows.filter((row) => {
    const sectionCode = row.student_section ?? row.session ?? ""
    if (section !== "ALL" && sectionCode !== section) return false
    if (!q) return true
    const hay = [row.student_name, row.full_name, row.student_number, sectionCode]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return hay.includes(q)
  })
}

export function filterProgressReviews(
  rows: InstructorProgressReviewRow[],
  query: string,
): InstructorProgressReviewRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) =>
    [row.fullName, row.email, row.section, row.reviewPeriod].filter(Boolean).join(" ").toLowerCase().includes(q),
  )
}

export type AtRiskStudentRow = {
  id: string
  name: string
  section?: string
  reason: string
  detail?: string
  tone: "warning" | "danger"
}

export function buildAtRiskRows(
  attendanceFlagged: AttendanceStudentSummary[] | undefined,
  attendanceChronic: AttendanceStudentSummary[] | undefined,
  lowPractice: PracticeStudentProgress[],
): AtRiskStudentRow[] {
  const rows: AtRiskStudentRow[] = []
  const seen = new Set<string>()

  for (const student of attendanceFlagged ?? []) {
    const key = String(student.student_id ?? student.id ?? student.full_name)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      id: key,
      name: student.full_name ?? "Student",
      reason: "Attendance flag",
      detail:
        student.attendance_percentage != null
          ? `${Math.round(student.attendance_percentage)}% attendance`
          : undefined,
      tone: "danger"})
  }

  for (const student of attendanceChronic ?? []) {
    const key = String(student.student_id ?? student.id ?? student.full_name)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      id: key,
      name: student.full_name ?? "Student",
      reason: "Chronic absence",
      detail: student.absent_count != null ? `${student.absent_count} absences` : undefined,
      tone: "danger"})
  }

  for (const student of lowPractice) {
    const key = String(student.student_id)
    if (seen.has(key)) continue
    seen.add(key)
    const score = student.avg_score ?? 0
    rows.push({
      id: key,
      name: student.student_name ?? student.full_name ?? "Student",
      section: student.student_section ?? student.session,
      reason: "Low practice score",
      detail: `${Math.round(score)}% average · ${student.total_attempts ?? 0} attempts`,
      tone: "warning"})
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export function filterAtRiskRows(rows: AtRiskStudentRow[], query: string): AtRiskStudentRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) =>
    [row.name, row.section, row.reason, row.detail].filter(Boolean).join(" ").toLowerCase().includes(q),
  )
}
