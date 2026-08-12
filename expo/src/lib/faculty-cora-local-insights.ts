import type { InstructorScope } from "./instructor-content-api"
import { instructorApi, type InstructorDashboardCharts } from "./instructor-api"
import type { FacultyCoraInsight } from "./faculty-cora-api"

export const FACULTY_CORA_WELCOME_INSIGHT: FacultyCoraInsight = {
  id: "welcome",
  title: "Teaching copilot ready",
  body: "Ask Cora to create assessments, improve quizzes, or analyze results. Insights will appear as your course accumulates activity.",
  severity: "success",
  capabilityId: "assistant",
}

function chartInsights(charts: InstructorDashboardCharts | null): FacultyCoraInsight[] {
  if (!charts) return []
  const insights: FacultyCoraInsight[] = []

  const trend = charts.scoreTrend ?? []
  if (trend.length >= 2) {
    const first = trend[0]?.avgScore ?? 0
    const last = trend[trend.length - 1]?.avgScore ?? 0
    const delta = last - first
    if (delta <= -5) {
      insights.push({
        id: "score-dip",
        title: "Scores trending down",
        body: `Average scores dropped about ${Math.abs(Math.round(delta))} points recently. Ask Cora what to focus on this week.`,
        severity: "warning",
        capabilityId: "insights",
      })
    }
  }

  const busiest = [...(charts.assessmentBreakdown ?? [])].sort((a, b) => b.value - a.value)[0]
  if (busiest && busiest.value >= 5) {
    insights.push({
      id: "busy-assessment-type",
      title: `${busiest.name} activity spike`,
      body: `${busiest.value} recent attempts on ${busiest.name.toLowerCase()} assessments. Review results for struggling topics.`,
      severity: "info",
      capabilityId: "insights",
    })
  }

  return insights
}

export async function buildLocalFacultyCoraInsights(scope: InstructorScope): Promise<FacultyCoraInsight[]> {
  const insights: FacultyCoraInsight[] = []

  try {
    const [stats, charts] = await Promise.all([
      instructorApi.getDashboardStats(scope),
      instructorApi.getDashboardCharts(scope).catch(() => null),
    ])

    insights.push(...chartInsights(charts))

    if (stats.pendingIssues > 0) {
      insights.push({
        id: "open-issues",
        title: "Open assessment issues",
        body: `${stats.pendingIssues} open issue${stats.pendingIssues === 1 ? "" : "s"} need review. Cora can help explain patterns or draft fixes.`,
        severity: "warning",
        capabilityId: "analyze",
      })
    }

    if (stats.recentSubmissions24h > 0) {
      insights.push({
        id: "recent-submissions",
        title: "Recent quiz activity",
        body: `${stats.recentSubmissions24h} submission${stats.recentSubmissions24h === 1 ? "" : "s"} in the last 24 hours across ${stats.totalStudents} students.`,
        severity: "info",
        capabilityId: "insights",
      })
    }

    if (stats.upcomingAssessments > 0) {
      insights.push({
        id: "upcoming-assessments",
        title: "Upcoming assessments",
        body: `${stats.upcomingAssessments} assessment${stats.upcomingAssessments === 1 ? "" : "s"} scheduled soon. Ask Cora to draft announcements or review materials.`,
        severity: "info",
        capabilityId: "automate",
      })
    }
  } catch {
    // Dashboard stats unavailable — fall through to welcome only.
  }

  if (insights.length === 0) {
    insights.push(FACULTY_CORA_WELCOME_INSIGHT)
  }

  return insights
}
