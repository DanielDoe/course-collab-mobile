import type { InstructorAssessmentResult } from "./instructor-api"

export type ResultsTab = "all" | "quiz" | "homework" | "mid_semester" | "final" | "flagged"

export function resultsTabLabel(tab: ResultsTab): string {
  switch (tab) {
    case "all":
      return "All"
    case "quiz":
      return "Quizzes"
    case "homework":
      return "Homework"
    case "mid_semester":
      return "Mid-Sem"
    case "final":
      return "Finals"
    case "flagged":
      return "Flagged"
  }
}

export function assessmentTypeLabel(type?: string): string {
  const t = (type ?? "").toLowerCase()
  if (t === "homework") return "Homework"
  if (t === "mid_semester" || t === "midsem") return "Mid-Semester"
  if (t === "final") return "Final"
  if (t === "quiz") return "Quiz"
  return type?.replace(/_/g, " ") ?? "Assessment"
}

export function filterResults(
  rows: InstructorAssessmentResult[],
  tab: ResultsTab,
  query: string,
): InstructorAssessmentResult[] {
  let filtered = rows
  if (tab === "flagged") {
    filtered = filtered.filter((r) => r.is_flagged)
  } else if (tab !== "all") {
    filtered = filtered.filter((r) => (r.assessment_type ?? "").toLowerCase() === tab)
  }

  const q = query.trim().toLowerCase()
  if (!q) return filtered
  return filtered.filter(
    (r) =>
      r.student_name.toLowerCase().includes(q) ||
      r.student_id.toLowerCase().includes(q) ||
      (r.assessment_title ?? r.quiz_title ?? "").toLowerCase().includes(q) ||
      (r.section ?? "").toLowerCase().includes(q),
  )
}

export function countResultsByTab(rows: InstructorAssessmentResult[]): Record<ResultsTab, number> {
  return {
    all: rows.length,
    quiz: rows.filter((r) => r.assessment_type === "quiz").length,
    homework: rows.filter((r) => r.assessment_type === "homework").length,
    mid_semester: rows.filter((r) => r.assessment_type === "mid_semester").length,
    final: rows.filter((r) => r.assessment_type === "final").length,
    flagged: rows.filter((r) => r.is_flagged).length}
}

export function computeResultsOverview(rows: InstructorAssessmentResult[]) {
  const finalized = rows.filter((r) => !r.is_in_progress)
  const percentages = finalized
    .map((r) => (typeof r.percentage === "number" ? r.percentage : Number(r.score)))
    .filter((n) => Number.isFinite(n))
  const avg =
    percentages.length > 0
      ? percentages.reduce((sum, n) => sum + n, 0) / percentages.length
      : 0
  const uniqueStudents = new Set(finalized.map((r) => r.student_id)).size
  const points = finalized
    .map((r) => (typeof r.score === "number" ? r.score : 0))
    .reduce((sum, n) => sum + n, 0)

  return {
    averageScore: avg,
    uniqueStudents,
    pointsScored: points,
    totalResults: rows.length}
}

export function formatResultScore(result: InstructorAssessmentResult): string {
  const pct =
    typeof result.percentage === "number"
      ? result.percentage
      : typeof result.score === "number"
        ? result.score
        : null
  return pct != null ? `${Math.round(pct * 10) / 10}%` : "—"
}
