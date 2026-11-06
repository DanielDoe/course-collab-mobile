import { attendanceDisplayPercent } from "./attendance-leaderboard-scope"
import type {
  AttendanceStudentSummary,
  InstructorProgressReviewRow,
  PracticeStudentProgress} from "./instructor-api"
import type { ProgressReviewPeriod } from "./progress-review-utils"

export type StudentProgressTab = "overview" | "students" | "at_risk" | "cora_insights"

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

export type AtRiskKind = "attendance_flag" | "chronic_absence" | "low_practice"

export type AtRiskStudentRow = {
  id: string
  name: string
  section?: string
  reason: string
  detail?: string
  tone: "warning" | "danger"
  kind: AtRiskKind
  studentDbId?: number
  practiceStudent?: PracticeStudentProgress
  attendance?: AttendanceStudentSummary
}

export function atRiskSignalsForStudent(
  rows: AtRiskStudentRow[],
  selected: AtRiskStudentRow | null,
): AtRiskStudentRow[] {
  if (!selected) return []
  return rows.filter((row) => row.id === selected.id)
}

export function buildAtRiskRows(
  attendanceFlagged: AttendanceStudentSummary[] | undefined,
  attendanceChronic: AttendanceStudentSummary[] | undefined,
  lowPractice: PracticeStudentProgress[],
): AtRiskStudentRow[] {
  const rows: AtRiskStudentRow[] = []
  const seen = new Set<string>()

  for (const student of attendanceFlagged ?? []) {
    const dbId = Number(student.id)
    const key = Number.isFinite(dbId) ? String(dbId) : String(student.student_id ?? student.full_name)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      id: key,
      name: student.full_name ?? "Student",
      reason: "Attendance flag",
      detail:
        student.attendance_percentage != null
          ? `${attendanceDisplayPercent(student.attendance_percentage)}% attendance`
          : undefined,
      tone: "danger",
      kind: "attendance_flag",
      studentDbId: Number.isFinite(dbId) ? dbId : undefined,
      attendance: student,
    })
  }

  for (const student of attendanceChronic ?? []) {
    const dbId = Number(student.id)
    const key = Number.isFinite(dbId) ? String(dbId) : String(student.student_id ?? student.full_name)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      id: key,
      name: student.full_name ?? "Student",
      reason: "Chronic absence",
      detail: student.absent_count != null ? `${student.absent_count} absences` : undefined,
      tone: "danger",
      kind: "chronic_absence",
      studentDbId: Number.isFinite(dbId) ? dbId : undefined,
      attendance: student,
    })
  }

  for (const student of lowPractice) {
    const dbId = Number(student.student_id)
    const key = Number.isFinite(dbId) ? String(dbId) : String(student.student_name ?? student.full_name ?? "unknown")
    if (seen.has(key)) continue
    seen.add(key)
    const score = student.avg_score ?? 0
    rows.push({
      id: key,
      name: student.student_name ?? student.full_name ?? "Student",
      section: student.student_section ?? student.session,
      reason: "Low practice score",
      detail: `${Math.round(score)}% average · ${student.total_attempts ?? 0} attempts`,
      tone: "warning",
      kind: "low_practice",
      studentDbId: Number.isFinite(dbId) ? dbId : undefined,
      practiceStudent: student,
    })
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

export type PracticeScoreBand = {
  label: string
  count: number
}

/** Bucket enrolled students by practice hub average score — unique to Student Progress. */
export function buildPracticeScoreDistribution(students: PracticeStudentProgress[]): PracticeScoreBand[] {
  const buckets = [
    { label: "No practice", count: 0 },
    { label: "<60%", count: 0 },
    { label: "60–69%", count: 0 },
    { label: "70–79%", count: 0 },
    { label: "80%+", count: 0 },
  ]

  for (const student of students) {
    const attempts = student.total_attempts ?? 0
    if (attempts <= 0) {
      buckets[0].count += 1
      continue
    }
    const score = student.avg_score ?? 0
    if (score < 60) buckets[1].count += 1
    else if (score < 70) buckets[2].count += 1
    else if (score < 80) buckets[3].count += 1
    else buckets[4].count += 1
  }

  return buckets
}

export function hasPracticeScoreDistributionData(bands: PracticeScoreBand[]): boolean {
  return bands.some((band) => band.count > 0)
}
