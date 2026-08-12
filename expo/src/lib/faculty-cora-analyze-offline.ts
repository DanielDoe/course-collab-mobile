import type { InstructorScope } from "./instructor-content-api"
import {
  instructorApi,
  type InstructorAssessmentResult,
  type InstructorBankQuestion,
  type InstructorDashboardCharts,
  type InstructorDashboardStats,
  type InstructorQuiz,
  type PracticeStudentProgress,
} from "./instructor-api"
import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import type { FacultyCoraChatResponse } from "./faculty-cora-api"
import { matchesAny, matchesPrompt, moduleAction } from "./faculty-cora-offline-shared"

export type FacultyCoraAnalyzeContext = {
  stats: InstructorDashboardStats | null
  charts: InstructorDashboardCharts | null
  results: InstructorAssessmentResult[]
  practiceStudents: PracticeStudentProgress[]
  bankQuestions: InstructorBankQuestion[]
  homeworkQuizzes: InstructorQuiz[]
  quizzes: InstructorQuiz[]
  syncedAt: string
}

type TopicMissCount = { topic: string; misses: number; detail?: string }

type DuplicateGroup = { key: string; count: number; ids: number[]; preview: string }

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function formatPercent(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${Math.round(value)}%`
}

function parseHomeworkNumber(message: string): number | null {
  const match = message.match(/homework\s+(\d+)/i)
  return match ? Number.parseInt(match[1], 10) : null
}

function parseQuizNumber(message: string): number | null {
  const match = message.match(/quiz\s+(\d+)/i)
  return match ? Number.parseInt(match[1], 10) : null
}

function findHomeworkQuiz(quizzes: InstructorQuiz[], number: number): InstructorQuiz | undefined {
  const patterns = [
    new RegExp(`\\bhomework\\s*#?\\s*${number}\\b`, "i"),
    new RegExp(`\\bhw\\s*#?\\s*${number}\\b`, "i"),
    new RegExp(`\\bh\\s*${number}\\b`, "i"),
  ]
  return quizzes.find((quiz) => patterns.some((pattern) => pattern.test(quiz.title)))
}

function findQuizByNumber(quizzes: InstructorQuiz[], number: number): InstructorQuiz | undefined {
  return quizzes.find((quiz) => new RegExp(`\\bquiz\\s*#?\\s*${number}\\b`, "i").test(quiz.title))
}

function normalizeQuestionKey(text: string): string {
  return stripHtml(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 180)
}

function findDuplicateQuestionGroups(questions: InstructorBankQuestion[]): DuplicateGroup[] {
  const buckets = new Map<string, DuplicateGroup>()
  for (const question of questions) {
    const key = normalizeQuestionKey(question.question_text)
    if (key.length < 24) continue
    const existing = buckets.get(key)
    if (existing) {
      existing.count += 1
      existing.ids.push(question.id)
    } else {
      buckets.set(key, {
        key,
        count: 1,
        ids: [question.id],
        preview: stripHtml(question.question_text).slice(0, 120),
      })
    }
  }
  return [...buckets.values()]
    .filter((group) => group.count > 1)
    .sort((a, b) => b.count - a.count)
}

function aggregateMissedTopics(ctx: FacultyCoraAnalyzeContext): TopicMissCount[] {
  const counts = new Map<string, TopicMissCount>()

  for (const row of ctx.results) {
    const pct = row.percentage ?? row.score
    if (pct == null || pct >= 60 || row.is_in_progress) continue
    const topic = row.assessment_title ?? row.quiz_title ?? "Unknown assessment"
    const existing = counts.get(topic) ?? { topic, misses: 0 }
    existing.misses += 1
    counts.set(topic, existing)
  }

  for (const student of ctx.practiceStudents) {
    if ((student.avg_score ?? 100) >= 60) continue
    for (const topic of student.topics_practiced ?? []) {
      const label = topic.trim()
      if (!label) continue
      const existing = counts.get(label) ?? { topic: label, misses: 0, detail: "Low practice accuracy" }
      existing.misses += 1
      counts.set(label, existing)
    }
  }

  for (const item of ctx.charts?.assessmentBreakdown ?? []) {
    if (item.value <= 0) continue
    const existing = counts.get(item.name)
    if (!existing) {
      counts.set(item.name, { topic: item.name, misses: item.value, detail: "High attempt volume" })
    }
  }

  return [...counts.values()].sort((a, b) => b.misses - a.misses).slice(0, 8)
}

function homeworkResultsSummary(
  quiz: InstructorQuiz | undefined,
  results: InstructorAssessmentResult[],
): { avg: number | null; attempts: number; lowScores: number } {
  if (!quiz) return { avg: null, attempts: 0, lowScores: 0 }
  const rows = results.filter(
    (row) =>
      row.assessment_id === quiz.id ||
      row.quiz_title === quiz.title ||
      row.assessment_title === quiz.title,
  )
  const scored = rows.filter((row) => !row.is_in_progress && (row.percentage ?? row.score) != null)
  const avg =
    scored.length > 0
      ? scored.reduce((sum, row) => sum + Number(row.percentage ?? row.score ?? 0), 0) / scored.length
      : null
  const lowScores = scored.filter((row) => Number(row.percentage ?? row.score ?? 100) < 60).length
  return { avg, attempts: rows.length, lowScores }
}

export async function buildFacultyCoraAnalyzeContext(scope: InstructorScope): Promise<FacultyCoraAnalyzeContext> {
  const [stats, charts, results, practiceStudents, bankQuestions, homeworkQuizzes, quizzes] = await Promise.all([
    instructorApi.getDashboardStats(scope).catch(() => null),
    instructorApi.getDashboardCharts(scope).catch(() => null),
    instructorApi.getAssessmentResults(scope, { limit: 400 }).catch(() => [] as InstructorAssessmentResult[]),
    instructorApi.getPracticeStudentProgress(scope).catch(() => [] as PracticeStudentProgress[]),
    instructorApi.getQuestionBank(scope).catch(() => [] as InstructorBankQuestion[]),
    instructorApi.getQuizzes(scope, "homework").catch(() => [] as InstructorQuiz[]),
    instructorApi.getQuizzes(scope, "quiz").catch(() => [] as InstructorQuiz[]),
  ])

  return {
    stats,
    charts,
    results,
    practiceStudents,
    bankQuestions,
    homeworkQuizzes,
    quizzes,
    syncedAt: new Date().toISOString(),
  }
}

function missedTopicsReply(ctx: FacultyCoraAnalyzeContext): FacultyCoraChatResponse {
  const hotspots = aggregateMissedTopics(ctx)
  const lines = ["**Topics students miss most**", ""]

  if (hotspots.length > 0) {
    for (const row of hotspots.slice(0, 6)) {
      lines.push(
        `- **${row.topic}** — ${row.misses} signal${row.misses === 1 ? "" : "s"}${row.detail ? ` (${row.detail})` : ""}`,
      )
    }
  } else {
    lines.push("Not enough graded or practice data yet to rank missed topics. Check back after more submissions.")
  }

  const trend = ctx.charts?.scoreTrend ?? []
  if (trend.length >= 2) {
    const first = trend[0]?.avgScore ?? 0
    const last = trend[trend.length - 1]?.avgScore ?? 0
    const delta = Math.round(last - first)
    if (delta !== 0) {
      lines.push("", `Course average moved **${delta > 0 ? "+" : ""}${delta}** points over recent weeks.`)
    }
  }

  lines.push("", "Drill into **Student Progress** and **Manage Results** for item-level detail.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "student-progress",
    actions: [
      moduleAction("student-progress", "Student Progress"),
      moduleAction("results", "Manage Results"),
      moduleAction("practice", "Manage Practice"),
    ],
  }
}

function compareHomeworkReply(ctx: FacultyCoraAnalyzeContext, message: string): FacultyCoraChatResponse {
  const leftNum = parseHomeworkNumber(message) ?? 3
  const rightNum = message.toLowerCase().includes("homework 4") ? 4 : leftNum + 1
  const hwA = findHomeworkQuiz(ctx.homeworkQuizzes, leftNum)
  const hwB = findHomeworkQuiz(ctx.homeworkQuizzes, rightNum)
  const summaryA = homeworkResultsSummary(hwA, ctx.results)
  const summaryB = homeworkResultsSummary(hwB, ctx.results)

  const lines = [`**Homework ${leftNum} vs Homework ${rightNum}**`, ""]

  if (hwA) {
    lines.push(
      `- **${hwA.title}**: avg ${formatPercent(summaryA.avg)}, ${summaryA.attempts} attempt${summaryA.attempts === 1 ? "" : "s"}, ${summaryA.lowScores} below 60%`,
    )
  } else {
    lines.push(`- **Homework ${leftNum}** — not found in this course.`)
  }

  if (hwB) {
    lines.push(
      `- **${hwB.title}**: avg ${formatPercent(summaryB.avg)}, ${summaryB.attempts} attempt${summaryB.attempts === 1 ? "" : "s"}, ${summaryB.lowScores} below 60%`,
    )
  } else {
    lines.push(`- **Homework ${rightNum}** — not found in this course.`)
  }

  if (summaryA.avg != null && summaryB.avg != null) {
    const delta = Math.round(summaryB.avg - summaryA.avg)
    if (Math.abs(delta) >= 3) {
      lines.push(
        "",
        delta > 0
          ? `Homework ${rightNum} scored about **${delta} points higher** on average — review what changed (length, topics, or timing).`
          : `Homework ${rightNum} scored about **${Math.abs(delta)} points lower** — consider whether new topics need more scaffolding.`,
      )
    } else {
      lines.push("", "Average scores are similar — difficulty may be consistent between these assignments.")
    }
  }

  lines.push("", "Open **Manage Homework** or **Manage Results** to compare item-level performance.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "homework",
    actions: [
      moduleAction("homework", "Manage Homework"),
      moduleAction("results", "Manage Results"),
      moduleAction("reports", "Manage Reports"),
    ],
  }
}

function duplicateQuestionsReply(ctx: FacultyCoraAnalyzeContext): FacultyCoraChatResponse {
  const groups = findDuplicateQuestionGroups(ctx.bankQuestions)
  const lines = ["**Duplicate question scan**", ""]

  if (groups.length > 0) {
    lines.push(`Found **${groups.length}** near-duplicate group${groups.length === 1 ? "" : "s"} in your bank:`)
    for (const group of groups.slice(0, 5)) {
      lines.push(
        `- ${group.count} items (IDs ${group.ids.slice(0, 4).join(", ")}${group.ids.length > 4 ? "…" : ""}) — "${group.preview}${group.preview.length >= 120 ? "…" : ""}"`,
      )
    }
    lines.push("", "Review duplicates before building new assessments to avoid repeated stems.")
  } else if (ctx.bankQuestions.length > 0) {
    lines.push(
      `Scanned **${ctx.bankQuestions.length}** bank items — no strong duplicate stems detected with current heuristics.`,
    )
  } else {
    lines.push("Your question bank is empty or unavailable. Add items first, then rerun this analysis.")
  }

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "question-bank",
    actions: [
      moduleAction("question-bank", "Question Bank"),
      moduleAction("quizzes", "Manage Quizzes"),
    ],
  }
}

function quizItemAnalysisReply(ctx: FacultyCoraAnalyzeContext, message: string): FacultyCoraChatResponse {
  const quizNum = parseQuizNumber(message) ?? 2
  const quiz = findQuizByNumber(ctx.quizzes, quizNum)
  const lines = [`**Quiz ${quizNum} item analysis**`, ""]

  if (!quiz) {
    lines.push(`Could not find an assessment matching **Quiz ${quizNum}** in this course.`)
    lines.push("", "Try opening **Manage Quizzes** to confirm the exact title.")
    return {
      reply: lines.join("\n"),
      offline: true,
      contextSyncedAt: ctx.syncedAt,
      suggestedModuleId: "quizzes",
      actions: [moduleAction("quizzes", "Manage Quizzes"), moduleAction("results", "Manage Results")],
    }
  }

  const rows = ctx.results.filter(
    (row) =>
      row.assessment_id === quiz.id ||
      row.quiz_title === quiz.title ||
      row.assessment_title === quiz.title,
  )
  const completed = rows.filter((row) => !row.is_in_progress)
  const avg =
    completed.length > 0
      ? completed.reduce((sum, row) => sum + Number(row.percentage ?? row.score ?? 0), 0) / completed.length
      : null
  const low = completed.filter((row) => Number(row.percentage ?? row.score ?? 100) < 60)
  const flagged = completed.filter((row) => row.is_flagged)

  lines.push(`**${quiz.title}** — ${quiz.question_count ?? "?"} questions, ${completed.length} graded attempts.`)
  lines.push(`- Class average: **${formatPercent(avg)}**`)
  lines.push(`- Low scores (< 60%): **${low.length}**`)
  lines.push(`- Flagged attempts: **${flagged.length}**`)

  if (low.length > 0) {
    lines.push("", "**Hardest attempts**")
    for (const row of low.slice(0, 5)) {
      lines.push(
        `- ${row.student_name} — ${formatPercent(row.percentage ?? row.score)}${row.attempt_number ? ` (attempt ${row.attempt_number})` : ""}`,
      )
    }
  }

  if (ctx.stats?.pendingIssues) {
    lines.push("", `${ctx.stats.pendingIssues} open issue${ctx.stats.pendingIssues === 1 ? "" : "s"} may relate to grading — check Submission Issues.`)
  }

  lines.push("", "Open **Manage Results** for full item-level discrimination and review.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "results",
    actions: [
      moduleAction("results", "Manage Results"),
      moduleAction("quizzes", "Manage Quizzes"),
      moduleAction("reports", "Manage Reports"),
    ],
  }
}

function genericAnalyzeReply(): FacultyCoraChatResponse {
  return {
    reply: [
      "**Course analysis**",
      "",
      "I can summarize patterns from your assessments, practice, attendance, and question bank:",
      "",
      "- Topics students miss most",
      "- Homework difficulty comparisons",
      "- Duplicate bank items",
      "- Quiz item-level performance",
      "",
      "Pick a starter prompt or ask a specific analysis question.",
    ].join("\n"),
    offline: true,
    actions: [
      moduleAction("results", "Manage Results"),
      moduleAction("student-progress", "Student Progress"),
      moduleAction("question-bank", "Question Bank"),
      moduleAction("reports", "Manage Reports"),
    ],
  }
}

export async function buildFacultyCoraAnalyzeOfflineChatReply(
  scope: InstructorScope,
  payload: {
    message: string
    capabilityId?: FacultyCoraCapabilityId
  },
): Promise<FacultyCoraChatResponse> {
  if (payload.capabilityId !== "analyze") {
    return genericAnalyzeReply()
  }

  let ctx: FacultyCoraAnalyzeContext
  try {
    ctx = await buildFacultyCoraAnalyzeContext(scope)
  } catch {
    return {
      reply:
        "I couldn't load course analytics right now. Open **Manage Results** or **Student Progress** for the latest data.",
      offline: true,
      actions: [
        moduleAction("results", "Manage Results"),
        moduleAction("student-progress", "Student Progress"),
      ],
    }
  }

  const message = payload.message

  if (
    matchesPrompt(message, ["which topics are students missing most"]) ||
    matchesAny(message, ["missing most", "miss most", "struggling topics"])
  ) {
    return missedTopicsReply(ctx)
  }

  if (
    matchesPrompt(message, ["compare homework 3 vs homework 4 difficulty"]) ||
    matchesAny(message, ["compare homework", "homework 3 vs", "vs homework 4"])
  ) {
    return compareHomeworkReply(ctx, message)
  }

  if (
    matchesPrompt(message, ["find duplicate questions in my bank"]) ||
    matchesAny(message, ["duplicate", "duplicates in my bank"])
  ) {
    return duplicateQuestionsReply(ctx)
  }

  if (
    matchesPrompt(message, ["summarize quiz 2 item analysis"]) ||
    matchesAny(message, ["item analysis", "quiz 2"])
  ) {
    return quizItemAnalysisReply(ctx, message)
  }

  return missedTopicsReply(ctx)
}
