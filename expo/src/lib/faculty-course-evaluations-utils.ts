import { SURVEY_OTHER_OPTION } from "../constants/course-evaluation-survey"
import type {
  FacultyCourseEvaluationAnalytics,
  FacultyCourseEvaluationRow,
} from "./instructor-api"

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round((nums.reduce((sum, n) => sum + n, 0) / nums.length) * 10) / 10
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1
}

function topCounts(map: Record<string, number>, limit = 8) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([feature, count]) => ({ feature, count }))
}

export function computeFacultyCourseEvaluationAnalytics(
  rows: FacultyCourseEvaluationRow[],
): FacultyCourseEvaluationAnalytics {
  const totals = { all: rows.length, pending: 0, approved: 0, rejected: 0 }
  const overallScores: number[] = []
  const platformScores: number[] = []
  const clarityScores: number[] = []
  const npsScores: number[] = []
  const favoriteMap: Record<string, number> = {}
  const improveMap: Record<string, number> = {}
  const workloadMap: Record<string, number> = {}
  const aiTutorMap: Record<string, number> = {}
  const passGoalMap: Record<string, number> = {}
  let passGoalMismatchCount = 0
  let promoters = 0
  let passives = 0
  let detractors = 0

  for (const row of rows) {
    const status = String(row.status ?? "").toLowerCase()
    if (status === "pending") totals.pending++
    else if (status === "approved") totals.approved++
    else if (status === "rejected") totals.rejected++

    if (row.course_rating != null) overallScores.push(Number(row.course_rating))
    if (row.platform_helpfulness != null) platformScores.push(Number(row.platform_helpfulness))
    if (row.instructor_clarity != null) clarityScores.push(Number(row.instructor_clarity))

    if (row.nps_score != null) {
      const n = Number(row.nps_score)
      npsScores.push(n)
      if (n >= 9) promoters++
      else if (n >= 7) passives++
      else detractors++
    }

    for (const feature of row.favorite_features ?? []) {
      if (feature) bump(favoriteMap, feature)
    }

    if (row.feature_to_improve) {
      const label =
        row.feature_to_improve === SURVEY_OTHER_OPTION && row.feature_to_improve_other?.trim()
          ? `Other — ${row.feature_to_improve_other.trim()}`
          : row.feature_to_improve
      bump(improveMap, label)
    }

    if (row.workload) bump(workloadMap, row.workload)
    if (row.ai_tutor_usage) bump(aiTutorMap, row.ai_tutor_usage)

    if (row.self_assessed_letter_grade) {
      bump(passGoalMap, row.self_assessed_letter_grade)
      if (
        row.actual_letter_grade &&
        row.self_assessed_letter_grade.trim().toUpperCase() !== row.actual_letter_grade.trim().toUpperCase()
      ) {
        passGoalMismatchCount++
      }
    }
  }

  const reviewed = totals.approved + totals.rejected
  const npsResponses = npsScores.length

  return {
    totals,
    averages: {
      overallExperience: avg(overallScores),
      platformHelpfulness: avg(platformScores),
      instructorClarity: avg(clarityScores),
      nps: avg(npsScores),
    },
    nps: {
      responses: npsResponses,
      score:
        npsResponses > 0
          ? Math.round((promoters / npsResponses - detractors / npsResponses) * 100)
          : null,
      promoters,
      passives,
      detractors,
    },
    favoriteFeatureCounts: topCounts(favoriteMap),
    improveFeatureCounts: topCounts(improveMap),
    workloadCounts: topCounts(workloadMap, 10).map(({ feature, count }) => ({ label: feature, count })),
    aiTutorUsageCounts: topCounts(aiTutorMap, 10).map(({ feature, count }) => ({
      label: feature,
      count,
    })),
    passGoalCounts: topCounts(passGoalMap, 10).map(({ feature, count }) => ({
      grade: feature,
      count,
    })),
    passGoalMismatchCount,
    approvalRate: reviewed > 0 ? Math.round((totals.approved / reviewed) * 100) : null,
  }
}
