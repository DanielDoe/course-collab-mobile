import type { InstructorScope } from "./instructor-content-api"
import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import type { FacultyCoraChatResponse } from "./faculty-cora-api"
import {
  instructorApi,
  type InstructorAssessmentResult,
  type InstructorDashboardCharts,
  type InstructorLecture,
  type InstructorQuiz,
} from "./instructor-api"
import { buildFacultyCoraTeachingContext } from "./faculty-cora-teaching-context"
import {
  matchesAny,
  matchesPrompt,
  moduleAction,
  openQuizCreateAction,
} from "./faculty-cora-offline-shared"

export type FacultyCoraAssistantContext = {
  teaching: Awaited<ReturnType<typeof buildFacultyCoraTeachingContext>>
  quizzes: InstructorQuiz[]
  midtermQuizzes: InstructorQuiz[]
  lectures: InstructorLecture[]
  results: InstructorAssessmentResult[]
  charts: InstructorDashboardCharts | null
  syncedAt: string
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function formatPercent(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${Math.round(value)}%`
}

function parseQuizNumber(message: string): number | null {
  const match = message.match(/quiz\s+(\d+)/i)
  return match ? Number.parseInt(match[1], 10) : null
}

function findQuizByNumber(quizzes: InstructorQuiz[], number: number): InstructorQuiz | undefined {
  return quizzes.find((quiz) => new RegExp(`\\bquiz\\s*#?\\s*${number}\\b`, "i").test(quiz.title))
}

function draftStudentEmailReply(topic: string): string {
  return [
    "Hi [Student name],",
    "",
    `Thanks for reaching out about **${topic}**.`,
    "",
    "Here's how I'd approach the problem:",
    "- Review the related lecture notes and worked examples",
    "- Try the linked practice set before the deadline",
    "- Come to office hours if you're still stuck after one honest attempt",
    "",
    "Best,",
    "[Your name]",
  ].join("\n")
}

export async function buildFacultyCoraAssistantContext(scope: InstructorScope): Promise<FacultyCoraAssistantContext> {
  const [teaching, quizzes, midtermQuizzes, lectures, results, charts] = await Promise.all([
    buildFacultyCoraTeachingContext(scope),
    instructorApi.getQuizzes(scope, "quiz").catch(() => [] as InstructorQuiz[]),
    instructorApi.getQuizzes(scope, "mid_semester").catch(() => [] as InstructorQuiz[]),
    instructorApi.getLectures(scope).catch(() => [] as InstructorLecture[]),
    instructorApi.getAssessmentResults(scope, { limit: 200 }).catch(() => [] as InstructorAssessmentResult[]),
    instructorApi.getDashboardCharts(scope).catch(() => null),
  ])

  return {
    teaching,
    quizzes,
    midtermQuizzes,
    lectures,
    results,
    charts,
    syncedAt: new Date().toISOString(),
  }
}

function helpBuildQuizReply(ctx: FacultyCoraAssistantContext, message: string): FacultyCoraChatResponse {
  const quizNum = parseQuizNumber(message) ?? 3
  const existing = findQuizByNumber(ctx.quizzes, quizNum)
  const lines = [`**Help building Quiz ${quizNum}**`, ""]

  if (existing) {
    lines.push(
      `Found **${existing.title}** with **${existing.question_count ?? "?"}** questions and **${existing.total_attempts ?? 0}** attempt${existing.total_attempts === 1 ? "" : "s"}.`,
      "",
      "**Next steps**",
      "- Pull fresh items from **Question Bank**",
      "- Balance difficulty across topics you've covered recently",
      "- Set availability windows before publishing",
    )
  } else {
    lines.push(
      `No quiz titled **Quiz ${quizNum}** yet — I'll open a create flow with that title prefilled.`,
      "",
      "Start from bank topics you've taught in the last two lecture weeks.",
    )
  }

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "quizzes",
    actions: [
      openQuizCreateAction("Create Quiz from Cora", {
        title: existing?.title ?? `Quiz ${quizNum}`,
        description: message,
        assessmentType: "quiz",
      }),
      moduleAction("question-bank", "Question Bank"),
      moduleAction("quizzes", "Manage Quizzes"),
    ],
  }
}

function helpStudentEmailReply(): FacultyCoraChatResponse {
  const draft = draftStudentEmailReply("your question")
  return {
    reply: [
      "**Draft reply for a student email**",
      "",
      draft,
      "",
      "Open **Messages** to paste and personalize before sending.",
    ].join("\n"),
    offline: true,
    suggestedModuleId: "messages",
    actions: [
      moduleAction("messages", "Messages"),
      moduleAction("student-support", "Student Support"),
      moduleAction("office-hours", "Office Hours"),
    ],
  }
}

function organizeLecturesReply(ctx: FacultyCoraAssistantContext): FacultyCoraChatResponse {
  const lectures = [...ctx.lectures].sort((a, b) => a.week - b.week || a.title.localeCompare(b.title))
  const lines = ["**Organize lectures by topic**", ""]

  if (lectures.length > 0) {
    const byWeek = new Map<number, InstructorLecture[]>()
    for (const lecture of lectures) {
      const bucket = byWeek.get(lecture.week) ?? []
      bucket.push(lecture)
      byWeek.set(lecture.week, bucket)
    }
    for (const [week, rows] of [...byWeek.entries()].sort((a, b) => a[0] - b[0]).slice(0, 8)) {
      lines.push(`**Week ${week}**`)
      for (const lecture of rows) {
        lines.push(`- ${lecture.title}${lecture.is_published ? "" : " (draft)"}`)
      }
    }
    lines.push("", "Consider grouping unpublished lectures before the next assessment deadline.")
  } else {
    lines.push("No lectures found. Add weekly materials first, then ask Cora to suggest topic groupings.")
  }

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "lectures",
    actions: [
      moduleAction("lectures", "Manage Lectures"),
      moduleAction("course-notes", "Course Notes"),
      moduleAction("syllabus", "Open Syllabus"),
    ],
  }
}

function analyzeMidtermGradesReply(ctx: FacultyCoraAssistantContext, message: string): FacultyCoraChatResponse {
  const midterm = ctx.midtermQuizzes[0]
  const midtermResults = ctx.results.filter(
    (row) =>
      row.assessment_type === "mid_semester" ||
      /mid/i.test(row.assessment_title ?? row.quiz_title ?? ""),
  )
  const completed = midtermResults.filter((row) => !row.is_in_progress)
  const avg =
    completed.length > 0
      ? completed.reduce((sum, row) => sum + Number(row.percentage ?? row.score ?? 0), 0) / completed.length
      : null
  const low = completed.filter((row) => Number(row.percentage ?? row.score ?? 100) < 60)

  const lines = ["**Midterm grade analysis**", ""]

  if (midterm || completed.length > 0) {
    if (midterm) lines.push(`Assessment: **${midterm.title}**`)
    lines.push(`- Graded attempts: **${completed.length}**`)
    lines.push(`- Class average: **${formatPercent(avg)}**`)
    lines.push(`- Below 60%: **${low.length}**`)
    if (low.length > 0) {
      lines.push("", "**Students needing follow-up**")
      for (const row of low.slice(0, 5)) {
        lines.push(`- ${row.student_name} — ${formatPercent(row.percentage ?? row.score)}`)
      }
    }
  } else {
    lines.push("No midterm results found yet. Once attempts are graded, I can summarize averages and outliers.")
  }

  const trend = ctx.charts?.scoreTrend ?? []
  if (trend.length >= 2) {
    const delta = Math.round((trend[trend.length - 1]?.avgScore ?? 0) - (trend[0]?.avgScore ?? 0))
    if (delta !== 0) {
      lines.push("", `Overall course average shifted **${delta > 0 ? "+" : ""}${delta}** points over recent weeks.`)
    }
  }

  lines.push("", "Open **Manage Results** for item analysis or switch to **Analyze** for deeper patterns.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "results",
    actions: [
      moduleAction("results", "Manage Results"),
      moduleAction("mid-semester-exams", "Mid-Semester Exams"),
      moduleAction("student-progress", "Student Progress"),
      moduleAction("reports", "Manage Reports"),
    ],
  }
}

function genericAssistantReply(ctx?: FacultyCoraAssistantContext): FacultyCoraChatResponse {
  const stats = ctx?.teaching.stats
  return {
    reply: [
      "**Course assistant**",
      "",
      stats
        ? `You're managing **${stats.totalStudents}** students with **${stats.activeQuizzes}** active assessments.`
        : "Ask anything about building, grading, organizing, or analyzing your course.",
      "",
      "Try:",
      "- Help me build Quiz 3",
      "- Help answer this student email",
      "- Help organize lectures by topic",
      "- Help analyze grades from the midterm",
    ].join("\n"),
    offline: true,
    actions: [
      moduleAction("quizzes", "Manage Quizzes"),
      moduleAction("messages", "Messages"),
      moduleAction("lectures", "Manage Lectures"),
      moduleAction("results", "Manage Results"),
    ],
  }
}

export async function buildFacultyCoraAssistantOfflineChatReply(
  scope: InstructorScope,
  payload: {
    message: string
    capabilityId?: FacultyCoraCapabilityId
  },
): Promise<FacultyCoraChatResponse> {
  let ctx: FacultyCoraAssistantContext | undefined
  try {
    ctx = await buildFacultyCoraAssistantContext(scope)
  } catch {
    if (!payload.message.trim()) {
      return genericAssistantReply()
    }
  }

  if (!payload.capabilityId || payload.capabilityId === "assistant") {
    const message = payload.message

    if (
      matchesPrompt(message, ["help me build quiz 3"]) ||
      matchesAny(message, ["help me build quiz", "build quiz"])
    ) {
      return helpBuildQuizReply(ctx ?? (await buildFacultyCoraAssistantContext(scope)), message)
    }

    if (
      matchesPrompt(message, ["help answer this student email"]) ||
      matchesAny(message, ["student email", "answer this email"])
    ) {
      return helpStudentEmailReply()
    }

    if (
      matchesPrompt(message, ["help organize lectures by topic"]) ||
      matchesAny(message, ["organize lectures", "lectures by topic"])
    ) {
      return organizeLecturesReply(ctx ?? (await buildFacultyCoraAssistantContext(scope)))
    }

    if (
      matchesPrompt(message, ["help analyze grades from the midterm"]) ||
      matchesAny(message, ["analyze grades from the midterm", "midterm grades"])
    ) {
      return analyzeMidtermGradesReply(ctx ?? (await buildFacultyCoraAssistantContext(scope)), message)
    }

    return genericAssistantReply(ctx)
  }

  return genericAssistantReply(ctx)
}
