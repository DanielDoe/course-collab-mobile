import type { AppThemeTokens } from "../constants/app-themes"

export type GradeWeights = {
  quiz_weight?: number
  homework_weight?: number
  midterm_weight?: number
  final_weight?: number
  attendance_weight?: number
  project_weight?: number
  classroom_weight?: number
  engagement_weight?: number
}

export type StudentGradeRecord = {
  quiz_score?: number | string
  homework_score?: number | string
  midterm_score?: number | string
  final_score?: number | string
  attendance_score?: number | string
  project_score?: number | string
  classroom_score?: number | string
  engagement_credits?: number | string
  quiz_contribution?: number | string
  homework_contribution?: number | string
  midterm_contribution?: number | string
  final_contribution?: number | string
  attendance_contribution?: number | string
  project_contribution?: number | string
  classroom_contribution?: number | string
  engagement_contribution?: number | string
  total_score?: number | string
  letter_grade?: string | null
  notes?: string | null
  is_locked?: boolean
}

export type GradeCategoryStatus = {
  quiz?: "scored" | "pending"
  homework?: "scored" | "pending"
  midterm?: "scored" | "pending"
  final?: "scored" | "pending"
  attendance?: "scored" | "pending"
  project?: "scored" | "pending"
  classroom?: "scored" | "pending"
  engagement?: "scored" | "pending"
}

export type ProvisionalGrade = {
  totalScore?: number
  letterGrade?: string | null
  gradeIsProvisional?: boolean
  pendingCategories?: string[]
  categoryStatus?: GradeCategoryStatus
}

export type ClassAverages = {
  avg_quiz?: number | string
  avg_homework?: number | string
  avg_midterm?: number | string
  avg_final?: number | string
  avg_attendance?: number | string
  avg_project?: number | string
  avg_classroom?: number | string
  avg_engagement?: number | string
  avg_total?: number | string
}

export type StudentGradesResponse = {
  grade?: StudentGradeRecord
  weights?: GradeWeights
  classAverages?: ClassAverages
  provisional?: ProvisionalGrade
}

export type GradeCategoryKey =
  | "quiz"
  | "homework"
  | "midterm"
  | "final"
  | "attendance"
  | "project"
  | "classroom"
  | "engagement"

export type GradeCategoryView = {
  key: GradeCategoryKey
  label: string
  icon: string
  score: number
  weight: number
  contribution: number
  classAverage: number
  pending: boolean
  isEngagement: boolean
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseFloat(value)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

export function resolveGradeDisplay(data: StudentGradesResponse) {
  const grade = data.grade ?? {}
  const provisional = data.provisional

  const totalFromGrade = toNumber(grade.total_score)
  const totalScore =
    provisional?.totalScore != null && Number.isFinite(provisional.totalScore)
      ? provisional.totalScore
      : totalFromGrade
  const letterFromGrade = grade.letter_grade ?? null
  const letterGrade = provisional?.letterGrade ?? letterFromGrade
  const gradeIsProvisional = provisional?.gradeIsProvisional === true
  const pendingCategories = provisional?.pendingCategories ?? []
  const categoryStatus = provisional?.categoryStatus

  return {
    totalScore,
    letterGrade,
    letterLabel: gradeIsProvisional ? "In progress" : letterGrade ?? "—",
    gradeIsProvisional,
    pendingCategories,
    categoryStatus}
}

function isPending(status: GradeCategoryStatus | undefined, key: GradeCategoryKey): boolean {
  return status?.[key] === "pending"
}

export function buildGradeCategories(data: StudentGradesResponse): GradeCategoryView[] {
  const grade = data.grade ?? {}
  const weights = data.weights ?? {}
  const averages = data.classAverages ?? {}
  const status = data.provisional?.categoryStatus

  const defs: Array<{
    key: GradeCategoryKey
    label: string
    icon: string
    scoreKey: keyof StudentGradeRecord
    contributionKey: keyof StudentGradeRecord
    weightKey: keyof GradeWeights
    avgKey: keyof ClassAverages
    isEngagement?: boolean
  }> = [
    { key: "quiz", label: "Quizzes", icon: "clipboard-outline", scoreKey: "quiz_score", contributionKey: "quiz_contribution", weightKey: "quiz_weight", avgKey: "avg_quiz" },
    { key: "homework", label: "Homework", icon: "book-outline", scoreKey: "homework_score", contributionKey: "homework_contribution", weightKey: "homework_weight", avgKey: "avg_homework" },
    { key: "midterm", label: "Mid-Semester", icon: "document-text-outline", scoreKey: "midterm_score", contributionKey: "midterm_contribution", weightKey: "midterm_weight", avgKey: "avg_midterm" },
    { key: "final", label: "Final Exam", icon: "school-outline", scoreKey: "final_score", contributionKey: "final_contribution", weightKey: "final_weight", avgKey: "avg_final" },
    { key: "project", label: "Projects", icon: "folder-outline", scoreKey: "project_score", contributionKey: "project_contribution", weightKey: "project_weight", avgKey: "avg_project" },
    { key: "attendance", label: "Attendance", icon: "people-outline", scoreKey: "attendance_score", contributionKey: "attendance_contribution", weightKey: "attendance_weight", avgKey: "avg_attendance" },
    { key: "classroom", label: "Classroom", icon: "easel-outline", scoreKey: "classroom_score", contributionKey: "classroom_contribution", weightKey: "classroom_weight", avgKey: "avg_classroom" },
    { key: "engagement", label: "Engagement", icon: "sparkles-outline", scoreKey: "engagement_credits", contributionKey: "engagement_contribution", weightKey: "engagement_weight", avgKey: "avg_engagement", isEngagement: true },
  ]

  return defs.map((def) => ({
    key: def.key,
    label: def.label,
    icon: def.icon,
    score: toNumber(grade[def.scoreKey]),
    weight: toNumber(weights[def.weightKey]),
    contribution: toNumber(grade[def.contributionKey]),
    classAverage: toNumber(averages[def.avgKey]),
    pending: isPending(status, def.key),
    isEngagement: def.isEngagement === true}))
}

export function formatCategoryScore(category: GradeCategoryView): string {
  if (category.pending) return "Pending"
  if (category.isEngagement) return `${Math.min(100, Math.round(category.score))} cr`
  return `${Math.round(category.score * 10) / 10}%`
}

import { gradePerformanceColor } from "./grades-theme"

export function gradeColorForTokens(score: number, _tokens?: AppThemeTokens): string {
  return gradePerformanceColor(score)
}

export function gradeColor(score: number): string {
  return gradeColorForTokens(score)
}

export function compareToClass(score: number, classAverage: number): "above" | "below" | "even" | "none" {
  if (classAverage <= 0) return "none"
  const diff = score - classAverage
  if (Math.abs(diff) < 0.5) return "even"
  return diff > 0 ? "above" : "below"
}
