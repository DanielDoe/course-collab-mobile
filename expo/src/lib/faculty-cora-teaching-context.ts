import type { InstructorScope } from "./instructor-content-api"
import {
  instructorApi,
  type InstructorAssessmentResult,
  type InstructorDashboardCharts,
  type InstructorDashboardStats,
  type InstructorRecentActivity,
  type PracticeStudentProgress,
} from "./instructor-api"
import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import type { FacultyCoraChatResponse } from "./faculty-cora-api"
import { matchesPrompt, moduleAction } from "./faculty-cora-offline-shared"

export type FacultyCoraTeachingContext = {
  stats: InstructorDashboardStats | null
  charts: InstructorDashboardCharts | null
  recentActivity: InstructorRecentActivity[]
  flaggedResults: InstructorAssessmentResult[]
  lowScoreResults: InstructorAssessmentResult[]
  strugglingStudents: PracticeStudentProgress[]
  aiTutorUsage: Array<{ label: string; count: number }>
  syncedAt: string
}

function formatPercent(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${Math.round(value)}%`
}

function focusThisWeekReply(ctx: FacultyCoraTeachingContext): FacultyCoraChatResponse {
  const { stats, recentActivity, flaggedResults, strugglingStudents } = ctx
  const lines: string[] = ["**This week's focus**", ""]

  if (stats) {
    lines.push(
      `Your course has **${stats.totalStudents}** students, **${stats.activeQuizzes}** active assessments, and **${stats.recentSubmissions24h}** submissions in the last 24 hours.`,
    )
    if (stats.pendingIssues > 0) {
      lines.push(
        `- **${stats.pendingIssues}** open assessment issue${stats.pendingIssues === 1 ? "" : "s"} need review.`,
      )
    }
    if (stats.upcomingAssessments > 0) {
      lines.push(
        `- **${stats.upcomingAssessments}** assessment${stats.upcomingAssessments === 1 ? "" : "s"} coming up soon — confirm materials and announcements.`,
      )
    }
  }

  if (flaggedResults.length > 0) {
    lines.push(
      `- **${flaggedResults.length}** flagged result${flaggedResults.length === 1 ? "" : "s"} may need a closer look in Manage Results.`,
    )
  }

  if (strugglingStudents.length > 0) {
    const names = strugglingStudents
      .slice(0, 3)
      .map((s) => s.student_name ?? s.full_name ?? "Student")
      .join(", ")
    lines.push(`- Practice data suggests **${strugglingStudents.length}** student${strugglingStudents.length === 1 ? "" : "s"} with low engagement${names ? ` (e.g. ${names})` : ""}.`)
  }

  if (recentActivity.length > 0) {
    const latest = recentActivity[0]
    lines.push(
      "",
      `Latest activity: **${latest.title}**${latest.student_name ? ` — ${latest.student_name}` : ""}.`,
    )
  }

  if (lines.length <= 2) {
    lines.push(
      "No urgent signals yet. Review dashboard KPIs and recent submissions to spot trends early.",
    )
  }

  lines.push("", "Open **Dashboard** or **Recent Activity** for live details.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "dashboard",
    actions: [
      moduleAction("dashboard", "Open Dashboard"),
      moduleAction("recent-activity", "Recent Activity"),
      moduleAction("student-progress", "Class Analytics"),
    ],
  }
}

function assessmentsNeedAttentionReply(ctx: FacultyCoraTeachingContext): FacultyCoraChatResponse {
  const { stats, flaggedResults, lowScoreResults } = ctx
  const lines: string[] = ["**Assessments that need attention**", ""]

  if (stats?.pendingIssues) {
    lines.push(`- **${stats.pendingIssues}** open submission issue${stats.pendingIssues === 1 ? "" : "s"}.`)
  }

  if (flaggedResults.length > 0) {
    lines.push("", "**Flagged attempts**")
    for (const row of flaggedResults.slice(0, 5)) {
      const title = row.assessment_title ?? row.quiz_title ?? "Assessment"
      lines.push(
        `- ${title} — ${row.student_name} (${formatPercent(row.percentage ?? row.score)})`,
      )
    }
  }

  if (lowScoreResults.length > 0) {
    lines.push("", "**Low scores (< 60%)**")
    for (const row of lowScoreResults.slice(0, 5)) {
      const title = row.assessment_title ?? row.quiz_title ?? "Assessment"
      lines.push(
        `- ${title} — ${row.student_name} (${formatPercent(row.percentage ?? row.score)})`,
      )
    }
  }

  if (flaggedResults.length === 0 && lowScoreResults.length === 0 && !stats?.pendingIssues) {
    lines.push("No flagged or critically low scores in recent results. Keep monitoring upcoming due dates.")
  }

  lines.push("", "Use **Manage Results** to review attempts and finalize grades.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "results",
    actions: [
      moduleAction("results", "Manage Results"),
      moduleAction("quizzes", "Manage Quizzes"),
      moduleAction("submission-issues", "Submission Issues"),
    ],
  }
}

function coraUsageTrendsReply(ctx: FacultyCoraTeachingContext): FacultyCoraChatResponse {
  const { aiTutorUsage, stats } = ctx
  const lines: string[] = ["**Student Cora usage trends**", ""]

  if (aiTutorUsage.length > 0) {
    lines.push("From course evaluation feedback:")
    const sorted = [...aiTutorUsage].sort((a, b) => b.count - a.count)
    for (const row of sorted.slice(0, 6)) {
      lines.push(`- **${row.label}**: ${row.count} response${row.count === 1 ? "" : "s"}`)
    }
    lines.push("", "Students who use Cora heavily often benefit from targeted review sessions on those topics.")
  } else {
    lines.push(
      "Detailed per-student Cora session analytics aren't available in this build yet.",
      "",
      `You can still monitor engagement through **${stats?.recentSubmissions24h ?? 0}** recent submissions and practice progress in **Class Analytics**.`,
      "",
      "Once the Cora analytics route is live, this answer will include session counts, top tools, and struggling topics.",
    )
  }

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "student-progress",
    actions: [
      moduleAction("student-progress", "Class Analytics"),
      moduleAction("reports", "Manage Reports"),
      moduleAction("course-evaluations", "Course Evaluations"),
    ],
  }
}

function contentGapsReply(ctx: FacultyCoraTeachingContext): FacultyCoraChatResponse {
  const { charts, strugglingStudents, lowScoreResults } = ctx
  const lines: string[] = ["**Content gaps to consider**", ""]

  const weakAssessments = (charts?.assessmentBreakdown ?? [])
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)

  if (weakAssessments.length > 0) {
    lines.push("Assessment types with the most activity:")
    for (const item of weakAssessments) {
      lines.push(`- **${item.name}**: ${item.value} attempt${item.value === 1 ? "" : "s"}`)
    }
    lines.push("")
  }

  const scoreTrend = charts?.scoreTrend ?? []
  const recentWeeks = scoreTrend.slice(-3)
  if (recentWeeks.length >= 2) {
    const first = recentWeeks[0]?.avgScore ?? 0
    const last = recentWeeks[recentWeeks.length - 1]?.avgScore ?? 0
    const delta = last - first
    if (delta < -5) {
      lines.push(
        `Average scores dipped about **${Math.abs(Math.round(delta))} points** over recent weeks — consider a review lecture or practice set.`,
      )
    } else if (delta > 5) {
      lines.push(`Scores improved about **${Math.round(delta)} points** recently — note what's working for future modules.`)
    }
  }

  if (lowScoreResults.length > 0) {
    const byTitle = new Map<string, number>()
    for (const row of lowScoreResults) {
      const title = row.assessment_title ?? row.quiz_title ?? "Assessment"
      byTitle.set(title, (byTitle.get(title) ?? 0) + 1)
    }
    const hotspots = [...byTitle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    if (hotspots.length > 0) {
      lines.push("", "**Topics with repeated low scores**")
      for (const [title, count] of hotspots) {
        lines.push(`- ${title} (${count} low attempt${count === 1 ? "" : "s"})`)
      }
    }
  }

  if (strugglingStudents.length > 0) {
    lines.push(
      "",
      `**${strugglingStudents.length}** student${strugglingStudents.length === 1 ? "" : "s"} show low practice completion — flashcards or targeted homework may help.`,
    )
  }

  if (lines.length <= 2) {
    lines.push(
      "Not enough performance data yet. Add practice topics, quizzes, or lecture materials, then check back for gap analysis.",
    )
  }

  lines.push("", "Review **Lectures**, **Practice**, and **Question Bank** to fill gaps.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "lectures",
    actions: [
      moduleAction("lectures", "Manage Lectures"),
      moduleAction("practice", "Manage Practice"),
      moduleAction("question-bank", "Question Bank"),
    ],
  }
}

function genericOfflineReply(capabilityId?: FacultyCoraCapabilityId): FacultyCoraChatResponse {
  if (capabilityId === "insights") {
    return {
      reply:
        "I couldn't load course analytics right now. Try again shortly, or open Dashboard and Class Analytics for the latest numbers.",
      offline: true,
      actions: [
        moduleAction("dashboard", "Open Dashboard"),
        moduleAction("student-progress", "Class Analytics"),
      ],
    }
  }

  return {
    reply:
      "Cora chat is not connected to the server yet for this build. You can still open Question Bank, Quizzes, and other modules from the capability cards below.",
    offline: true,
    actions: [],
  }
}

export async function buildFacultyCoraTeachingContext(
  scope: InstructorScope,
): Promise<FacultyCoraTeachingContext> {
  const [stats, charts, recentActivity, results, students, evalAnalytics] = await Promise.all([
    instructorApi.getDashboardStats(scope).catch(() => null),
    instructorApi.getDashboardCharts(scope).catch(() => null),
    instructorApi.getRecentActivity(scope).catch(() => [] as InstructorRecentActivity[]),
    instructorApi.getAssessmentResults(scope, { limit: 80 }).catch(() => [] as InstructorAssessmentResult[]),
    instructorApi.getPracticeStudentProgress(scope).catch(() => [] as PracticeStudentProgress[]),
    instructorApi.getCourseEvaluationAnalytics(scope).catch(() => null),
  ])

  const flaggedResults = results.filter((row) => row.is_flagged)
  const lowScoreResults = results.filter((row) => {
    const pct = row.percentage ?? row.score
    return pct != null && pct < 60 && !row.is_in_progress
  })

  const strugglingStudents = students
    .filter((row) => (row.avg_score ?? 100) < 60 && (row.total_attempts ?? 0) > 0)
    .slice(0, 8)

  return {
    stats,
    charts,
    recentActivity: recentActivity.slice(0, 8),
    flaggedResults,
    lowScoreResults,
    strugglingStudents,
    aiTutorUsage: evalAnalytics?.aiTutorUsageCounts ?? [],
    syncedAt: new Date().toISOString(),
  }
}

export async function buildFacultyCoraInsightsOfflineChatReply(
  scope: InstructorScope,
  payload: {
    message: string
    capabilityId?: FacultyCoraCapabilityId
  },
): Promise<FacultyCoraChatResponse> {
  const capabilityId = payload.capabilityId

  if (capabilityId !== "insights") {
    return genericOfflineReply(capabilityId)
  }

  let ctx: FacultyCoraTeachingContext
  try {
    ctx = await buildFacultyCoraTeachingContext(scope)
  } catch {
    return genericOfflineReply("insights")
  }

  const message = payload.message

  if (
    matchesPrompt(message, [
      "what should i focus on this week",
      "focus this week",
      "priorities this week",
    ])
  ) {
    return focusThisWeekReply(ctx)
  }

  if (
    matchesPrompt(message, [
      "which assessments need attention",
      "assessments need attention",
      "assessments to review",
    ])
  ) {
    return assessmentsNeedAttentionReply(ctx)
  }

  if (
    matchesPrompt(message, [
      "summarize student cora usage trends",
      "student cora usage",
      "cora usage trends",
    ])
  ) {
    return coraUsageTrendsReply(ctx)
  }

  if (
    matchesPrompt(message, [
      "what content gaps should i fill",
      "content gaps",
      "topics struggling",
    ])
  ) {
    return contentGapsReply(ctx)
  }

  return focusThisWeekReply(ctx)
}
