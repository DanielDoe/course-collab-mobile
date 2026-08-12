import type { InstructorIssue, InstructorQuiz, InstructorRecentActivity, InstructorSession } from "./instructor-api"

export type AssessmentType = "quiz" | "homework" | "mid_semester" | "final"

export type AssessmentStatusFilter = "ALL" | "live" | "closed"

export type IssueStatusFilter = "open" | "closed"

export type ActivityStatusFilter = "ALL" | "submitted" | "in_progress" | "saved_for_later"

export type AssessmentModuleSegment = "manage" | "issues" | "deleted"

export type AssessmentTypeConfig = {
  label: string
  shortLabel: string
  webSegment: string
  icon: "clipboard-outline" | "book-outline" | "document-text-outline" | "school-outline"
}

export const ASSESSMENT_TYPE_CONFIG: Record<AssessmentType, AssessmentTypeConfig> = {
  quiz: {
    label: "Quizzes",
    shortLabel: "Quiz",
    webSegment: "quizzes",
    icon: "clipboard-outline"},
  homework: {
    label: "Homework",
    shortLabel: "Homework",
    webSegment: "homework",
    icon: "book-outline"},
  mid_semester: {
    label: "Mid-Semester",
    shortLabel: "Mid-Sem",
    webSegment: "mid-semester",
    icon: "document-text-outline"},
  final: {
    label: "Final Exams",
    shortLabel: "Final",
    webSegment: "finals",
    icon: "school-outline"}}

export function assessmentWebPath(type: AssessmentType): string {
  return `/faculty/dashboard/assessments/${ASSESSMENT_TYPE_CONFIG[type].webSegment}`
}

export function assessmentPreviewWebPath(type: AssessmentType, quizId: number): string {
  return `${assessmentWebPath(type)}/${quizId}/preview`
}

export function assessmentEditWebPath(type: AssessmentType, quizId: number): string {
  return `${assessmentWebPath(type)}/${quizId}/edit`
}

export function assessmentResultsWebPath(quizId: number): string {
  return `/faculty/dashboard/results?quizId=${quizId}`
}

export function issuesWebPath(type: AssessmentType = "quiz"): string {
  return `/faculty/dashboard/assessments/${ASSESSMENT_TYPE_CONFIG[type].webSegment}/issues`
}

export function deletedWebPath(type: AssessmentType = "quiz"): string {
  return `/faculty/dashboard/assessments/${ASSESSMENT_TYPE_CONFIG[type].webSegment}/deleted`
}

/** @deprecated Use issuesWebPath(type) */
export function issuesWebPathLegacy(): string {
  return issuesWebPath("quiz")
}

export function formatAssessmentWindow(from?: string | null, until?: string | null): string | null {
  if (!from && !until) return null
  const parts: string[] = []
  if (from) parts.push(`From ${formatShortDate(from)}`)
  if (until) parts.push(`Until ${formatShortDate(until)}`)
  return parts.join(" · ")
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"})
}

export function countLiveSections(quiz: InstructorQuiz, sessions: InstructorSession[]): number {
  return sessions.filter((s) => Boolean(quiz.session_access?.[s.code])).length
}

export function computeAssessmentStats(quizzes: InstructorQuiz[], sessions: InstructorSession[]) {
  const total = quizzes.length
  const live = quizzes.filter((q) => q.is_active).length
  const closed = total - live
  const attempts = quizzes.reduce((sum, q) => sum + (q.total_attempts ?? 0), 0)
  const questions = quizzes.reduce((sum, q) => sum + (q.question_count ?? 0), 0)
  const sectionsLive = quizzes.reduce((sum, q) => sum + countLiveSections(q, sessions), 0)
  return { total, live, closed, attempts, questions, sectionsLive }
}

export function filterAssessments(
  quizzes: InstructorQuiz[],
  sessions: InstructorSession[],
  status: AssessmentStatusFilter,
  sectionCode: string,
  search: string,
): InstructorQuiz[] {
  const q = search.trim().toLowerCase()
  return quizzes.filter((quiz) => {
    if (status === "live" && !quiz.is_active) return false
    if (status === "closed" && quiz.is_active) return false
    if (sectionCode !== "ALL") {
      if (!quiz.session_access?.[sectionCode]) return false
    }
    if (!q) return true
    return quiz.title.toLowerCase().includes(q)
  })
}

export function statusFilterCounts(quizzes: InstructorQuiz[]) {
  return {
    ALL: quizzes.length,
    live: quizzes.filter((q) => q.is_active).length,
    closed: quizzes.filter((q) => !q.is_active).length}
}

export function groupAssessmentsByStatus(quizzes: InstructorQuiz[]) {
  const live: InstructorQuiz[] = []
  const closed: InstructorQuiz[] = []
  for (const quiz of quizzes) {
    if (quiz.is_active) live.push(quiz)
    else closed.push(quiz)
  }
  return { live, closed }
}

export function computeIssueStats(issues: InstructorIssue[]) {
  const open = issues.filter((i) => i.status === "open").length
  const closed = issues.filter((i) => i.status === "closed").length
  const withComments = issues.filter((i) => (i.comment_count ?? 0) > 0).length
  return { total: issues.length, open, closed, withComments }
}

export function filterIssues(
  issues: InstructorIssue[],
  status: IssueStatusFilter,
  search: string,
): InstructorIssue[] {
  const q = search.trim().toLowerCase()
  return issues.filter((issue) => {
    if (issue.status !== status) return false
    if (!q) return true
    const hay = [issue.quiz_title, issue.student_name, issue.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return hay.includes(q)
  })
}

export function activityStatusLabel(status?: string): string {
  switch (status) {
    case "submitted":
      return "Submitted"
    case "in_progress":
      return "In progress"
    case "saved_for_later":
      return "Saved"
    default:
      return status ?? "Activity"
  }
}

export function activityStatusTone(status?: string): "live" | "warning" | "neutral" | "success" {
  switch (status) {
    case "submitted":
      return "live"
    case "in_progress":
      return "neutral"
    case "saved_for_later":
      return "warning"
    default:
      return "neutral"
  }
}

export function assessmentTypeLabel(type?: string): string {
  switch (type) {
    case "homework":
      return "Homework"
    case "mid_semester":
      return "Mid-Semester"
    case "final":
      return "Final"
    case "quiz":
    default:
      return "Quiz"
  }
}

export function computeActivityStats(activity: InstructorRecentActivity[]) {
  const submitted = activity.filter((a) => a.status === "submitted").length
  const inProgress = activity.filter((a) => a.status === "in_progress").length
  const saved = activity.filter((a) => a.status === "saved_for_later").length
  const scored = activity.filter((a) => a.percentage != null).length
  return { total: activity.length, submitted, inProgress, saved, scored }
}

export function filterRecentActivity(
  activity: InstructorRecentActivity[],
  status: ActivityStatusFilter,
  search: string,
): InstructorRecentActivity[] {
  const q = search.trim().toLowerCase()
  return activity.filter((item) => {
    if (status !== "ALL" && item.status !== status) return false
    if (!q) return true
    const hay = [item.title, item.message, item.student_name].filter(Boolean).join(" ").toLowerCase()
    return hay.includes(q)
  })
}

export function activityFilterCounts(activity: InstructorRecentActivity[]) {
  return {
    ALL: activity.length,
    submitted: activity.filter((a) => a.status === "submitted").length,
    in_progress: activity.filter((a) => a.status === "in_progress").length,
    saved_for_later: activity.filter((a) => a.status === "saved_for_later").length}
}
