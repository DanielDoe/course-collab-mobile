import type { Ionicons } from "@expo/vector-icons"
import type {
  ClassroomPointRow,
  ClassroomPointsSummaryRow,
  InstructorAssessmentResult,
  InstructorIssue,
  InstructorPasswordResetRequest,
  InstructorRecentActivity,
  InstructorRecommendationRequest,
  InstructorStudent,
  OfficeHourRequest} from "./instructor-api"
import { assessmentTypeLabel } from "./faculty-results-utils"
import { formatStudentRegisteredDate } from "./faculty-students-utils"

export type StudentProfileActivity = {
  id: string
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  tone: "teal" | "blue" | "amber" | "violet" | "rose" | "slate"
  at?: string
}

export type StudentTypeBreakdown = {
  label: string
  count: number
  color: string
}

export type StudentProfileSnapshot = {
  engagementScore: number
  engagementLabel: string
  engagementHint: string
  avgScore: number | null
  assessmentCount: number
  flaggedCount: number
  inProgressCount: number
  classroomPoints: number
  classroomAwards: number
  platformAttempts: number
  officeHourCount: number
  openIssues: number
  recommendations: number
  passwordResets: number
  lastActiveAt: string | null
  memberSince: string
  typeBreakdown: StudentTypeBreakdown[]
  timeline: StudentProfileActivity[]
}

const TYPE_COLORS: Record<string, string> = {
  quiz: "#0d9488",
  homework: "#2563eb",
  mid_semester: "#7c3aed",
  final: "#d97706",
  other: "#64748b"}

function nameMatches(student: InstructorStudent, name?: string): boolean {
  if (!name) return false
  return name.trim().toLowerCase() === student.full_name.trim().toLowerCase()
}

function studentMatchesResult(student: InstructorStudent, row: InstructorAssessmentResult): boolean {
  if (row.student_id && row.student_id === student.student_id) return true
  return nameMatches(student, row.student_name)
}

export function filterResultsForStudent(
  student: InstructorStudent,
  rows: InstructorAssessmentResult[],
): InstructorAssessmentResult[] {
  return rows.filter((row) => studentMatchesResult(student, row))
}

export function filterActivityForStudent(
  student: InstructorStudent,
  rows: InstructorRecentActivity[],
): InstructorRecentActivity[] {
  return rows.filter((row) => nameMatches(student, row.student_name))
}

export function filterActivityForStudentName(
  studentName: string | undefined,
  rows: InstructorRecentActivity[],
): InstructorRecentActivity[] {
  if (!studentName?.trim()) return []
  return rows.filter((row) => nameMatches({ full_name: studentName } as InstructorStudent, row.student_name))
}

export function findClassroomSummaryForStudent(
  student: InstructorStudent,
  rows: ClassroomPointsSummaryRow[],
): ClassroomPointsSummaryRow | undefined {
  return rows.find(
    (row) =>
      row.student_id === student.id ||
      row.student_number === student.student_id ||
      nameMatches(student, row.full_name),
  )
}

export function filterClassroomPointsForStudent(
  student: InstructorStudent,
  rows: ClassroomPointRow[],
): ClassroomPointRow[] {
  return rows.filter(
    (row) =>
      row.student_id === student.id ||
      row.student_number === student.student_id ||
      nameMatches(student, row.student_name),
  )
}

export function filterOfficeHoursForStudent(
  student: InstructorStudent,
  rows: OfficeHourRequest[],
): OfficeHourRequest[] {
  return rows.filter(
    (row) =>
      nameMatches(student, row.full_name) ||
      (row.student_code != null && row.student_code === student.student_id),
  )
}

export function filterIssuesForStudent(student: InstructorStudent, rows: InstructorIssue[]): InstructorIssue[] {
  return rows.filter((row) => nameMatches(student, row.student_name))
}

export function filterRecommendationsForStudent(
  student: InstructorStudent,
  rows: InstructorRecommendationRequest[],
): InstructorRecommendationRequest[] {
  return rows.filter(
    (row) =>
      row.student_id === student.id ||
      (row.student_external_id != null && row.student_external_id === student.student_id) ||
      nameMatches(student, row.student_name),
  )
}

export function filterPasswordResetsForStudent(
  student: InstructorStudent,
  rows: InstructorPasswordResetRequest[],
): InstructorPasswordResetRequest[] {
  return rows.filter(
    (row) =>
      row.student_id === student.id ||
      (row.student_number != null && row.student_number === student.student_id) ||
      nameMatches(student, row.full_name),
  )
}

function parseScore(row: InstructorAssessmentResult): number | null {
  if (row.percentage != null && Number.isFinite(row.percentage)) return row.percentage
  if (row.score != null && Number.isFinite(row.score)) return row.score
  return null
}

function engagementTier(score: number): { label: string; hint: string } {
  if (score >= 76) return { label: "Star performer", hint: "Consistent submissions and strong platform presence." }
  if (score >= 51) return { label: "Active learner", hint: "Regularly engaging with assessments and course tools." }
  if (score >= 26) return { label: "Steady progress", hint: "Showing up — a nudge could unlock more activity." }
  return { label: "Getting started", hint: "Early in their journey — great time to check in." }
}

function computeEngagementScore(input: {
  platformAttempts: number
  assessmentCount: number
  avgScore: number | null
  classroomPoints: number
  lastActiveAt: string | null
}): number {
  const attemptPts = Math.min(input.platformAttempts, 20) / 20
  const submissionPts = Math.min(input.assessmentCount, 12) / 12
  const scorePts = input.avgScore != null ? Math.min(Math.max(input.avgScore, 0), 100) / 100 : 0.35
  const pointsPts = Math.min(Number(input.classroomPoints), 60) / 60
  const recencyPts = (() => {
    if (!input.lastActiveAt) return 0.2
    const days = (Date.now() - new Date(input.lastActiveAt).getTime()) / 86400000
    if (days <= 3) return 1
    if (days <= 7) return 0.75
    if (days <= 14) return 0.5
    if (days <= 30) return 0.3
    return 0.15
  })()

  return Math.round(
    (attemptPts * 22 + submissionPts * 24 + scorePts * 24 + pointsPts * 15 + recencyPts * 15) * 100,
  ) / 100
}

function buildTimeline(input: {
  student: InstructorStudent
  results: InstructorAssessmentResult[]
  activity: InstructorRecentActivity[]
  points: ClassroomPointRow[]
  officeHours: OfficeHourRequest[]
  issues: InstructorIssue[]
}): StudentProfileActivity[] {
  const items: StudentProfileActivity[] = []

  for (const row of input.results.slice(0, 8)) {
    const title = row.assessment_title ?? row.quiz_title ?? "Assessment"
    const score = parseScore(row)
    items.push({
      id: `result-${row.attempt_id}`,
      title,
      subtitle:
        score != null
          ? `${assessmentTypeLabel(row.assessment_type)} · ${Math.round(score)}%`
          : assessmentTypeLabel(row.assessment_type),
      icon: row.is_flagged ? "flag-outline" : "clipboard-outline",
      tone: row.is_flagged ? "rose" : "teal",
      at: row.completed_at ?? row.started_at})
  }

  for (const row of input.activity.slice(0, 6)) {
    items.push({
      id: `activity-${row.id}`,
      title: row.title,
      subtitle: row.message,
      icon: "pulse-outline",
      tone: "blue",
      at: row.created_at})
  }

  for (const row of input.points.slice(0, 5)) {
    items.push({
      id: `points-${row.id}`,
      title: `+${row.points} classroom pts`,
      subtitle: row.reason,
      icon: "trophy-outline",
      tone: "amber",
      at: row.awarded_at ?? row.created_at})
  }

  for (const row of input.officeHours.slice(0, 3)) {
    items.push({
      id: `oh-${row.id}`,
      title: row.topic,
      subtitle: `Office hours · ${row.status}`,
      icon: "time-outline",
      tone: "violet",
      at: row.created_at})
  }

  for (const row of input.issues.slice(0, 3)) {
    items.push({
      id: `issue-${row.id}`,
      title: row.quiz_title ?? "Submission issue",
      subtitle: row.description,
      icon: "alert-circle-outline",
      tone: "rose",
      at: row.created_at})
  }

  return items
    .sort((a, b) => {
      const ta = a.at ? new Date(a.at).getTime() : 0
      const tb = b.at ? new Date(b.at).getTime() : 0
      return tb - ta
    })
    .slice(0, 10)
}

export function buildStudentProfileSnapshot(input: {
  student: InstructorStudent
  results: InstructorAssessmentResult[]
  activity: InstructorRecentActivity[]
  summary: ClassroomPointsSummaryRow[]
  points: ClassroomPointRow[]
  officeHours: OfficeHourRequest[]
  issues: InstructorIssue[]
  recommendations: InstructorRecommendationRequest[]
  passwordResets: InstructorPasswordResetRequest[]
}): StudentProfileSnapshot {
  const { student } = input
  const results = filterResultsForStudent(student, input.results)
  const activity = filterActivityForStudent(student, input.activity)
  const summary = findClassroomSummaryForStudent(student, input.summary)
  const points = filterClassroomPointsForStudent(student, input.points)
  const officeHours = filterOfficeHoursForStudent(student, input.officeHours)
  const issues = filterIssuesForStudent(student, input.issues)
  const recommendations = filterRecommendationsForStudent(student, input.recommendations)
  const passwordResets = filterPasswordResetsForStudent(student, input.passwordResets)

  const scored = results.map(parseScore).filter((v): v is number => v != null)
  const avgScore =
    scored.length > 0 ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : null

  const typeCounts = new Map<string, number>()
  for (const row of results) {
    const key = (row.assessment_type ?? "other").toLowerCase()
    typeCounts.set(key, (typeCounts.get(key) ?? 0) + 1)
  }
  const typeBreakdown: StudentTypeBreakdown[] = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      label: assessmentTypeLabel(key),
      count,
      color: TYPE_COLORS[key] ?? TYPE_COLORS.other}))

  const timeline = buildTimeline({ student, results, activity, points, officeHours, issues })
  const lastActiveAt =
    timeline[0]?.at ??
    results[0]?.completed_at ??
    results[0]?.started_at ??
    activity[0]?.created_at ??
    null

  const engagementScore = computeEngagementScore({
    platformAttempts: student.quiz_attempts ?? 0,
    assessmentCount: results.length,
    avgScore,
    classroomPoints: Number(summary?.total_points ?? 0),
    lastActiveAt})
  const tier = engagementTier(engagementScore)

  return {
    engagementScore,
    engagementLabel: tier.label,
    engagementHint: tier.hint,
    avgScore,
    assessmentCount: results.length,
    flaggedCount: results.filter((r) => r.is_flagged).length,
    inProgressCount: results.filter((r) => r.is_in_progress).length,
    classroomPoints: Number(summary?.total_points ?? 0),
    classroomAwards: Number(summary?.award_count ?? points.length),
    platformAttempts: student.quiz_attempts ?? 0,
    officeHourCount: officeHours.length,
    openIssues: issues.filter((i) => i.status === "open").length,
    recommendations: recommendations.length,
    passwordResets: passwordResets.length,
    lastActiveAt,
    memberSince: formatStudentRegisteredDate(student.created_at) || "—",
    typeBreakdown,
    timeline}
}
