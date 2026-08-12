import type { InstructorScope } from "./instructor-content-api"
import { instructorFlashcardsApi } from "./instructor-content-api"
import {
  facultyCoraApi,
  type FacultyCoraAutomationJob,
  type FacultyCoraChatResponse,
} from "./faculty-cora-api"
import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import {
  instructorApi,
  type InstructorAnnouncement,
  type InstructorLecture,
  type InstructorQuiz,
  type OfficeHourRequest,
  type PracticeTopic,
} from "./instructor-api"
import {
  buildAnnouncementDraft,
  parseHomeworkLabel,
} from "./faculty-cora-create-offline"
import {
  matchesAny,
  matchesPrompt,
  moduleAction,
  scheduleAutomationAction,
} from "./faculty-cora-offline-shared"

export type FacultyCoraAutomateContext = {
  announcements: InstructorAnnouncement[]
  quizzes: InstructorQuiz[]
  homework: InstructorQuiz[]
  lectures: InstructorLecture[]
  officeHours: OfficeHourRequest[]
  practiceTopics: PracticeTopic[]
  automationJobs: FacultyCoraAutomationJob[]
  syncedAt: string
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function isToday(value: string): boolean {
  try {
    const date = new Date(value)
    const now = new Date()
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    )
  } catch {
    return false
  }
}

function upcomingWeekLabels(count: number): string[] {
  const labels: string[] = []
  const now = new Date()
  for (let index = 0; index < count; index += 1) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + index * 7)
    labels.push(
      weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    )
  }
  return labels
}

export async function buildFacultyCoraAutomateContext(scope: InstructorScope): Promise<FacultyCoraAutomateContext> {
  const [announcements, quizzes, homework, lectures, officeHours, practiceTopics, automationJobs] =
    await Promise.all([
      instructorApi.getAnnouncements(scope).catch(() => [] as InstructorAnnouncement[]),
      instructorApi.getQuizzes(scope, "quiz").catch(() => [] as InstructorQuiz[]),
      instructorApi.getQuizzes(scope, "homework").catch(() => [] as InstructorQuiz[]),
      instructorApi.getLectures(scope).catch(() => [] as InstructorLecture[]),
      instructorApi.getOfficeHours(scope).catch(() => [] as OfficeHourRequest[]),
      instructorApi.getPracticeTopics(scope).then((response) => response.topics ?? []).catch(() => [] as PracticeTopic[]),
      facultyCoraApi.listAutomations(scope).catch(() => ({ jobs: [] as FacultyCoraAutomationJob[] })),
    ])

  return {
    announcements,
    quizzes,
    homework,
    lectures,
    officeHours,
    practiceTopics,
    automationJobs: automationJobs.jobs ?? [],
    syncedAt: new Date().toISOString(),
  }
}

function weeklyAnnouncementsReply(ctx: FacultyCoraAutomateContext, message: string): FacultyCoraChatResponse {
  const homeworkLabel = parseHomeworkLabel(message)
  const draft = buildAnnouncementDraft(homeworkLabel)
  const weeks = upcomingWeekLabels(4)
  const assessmentSources = [...ctx.homework, ...ctx.quizzes].slice(0, 4)

  const lines = ["**Weekly announcement plan (next 4 weeks)**", ""]

  for (const [index, weekLabel] of weeks.entries()) {
    const assessment = assessmentSources[index]
    const focus = assessment?.title ?? homeworkLabel ?? `Week ${index + 1} update`
    lines.push(`- **${weekLabel}** — reminder for **${focus}**`)
  }

  if (ctx.automationJobs.length > 0) {
    const pending = ctx.automationJobs.filter((job) => job.status === "pending" || job.status === "running")
    if (pending.length > 0) {
      lines.push("", `You already have **${pending.length}** scheduled automation${pending.length === 1 ? "" : "s"}.`)
    }
  }

  lines.push(
    "",
    "**Suggested workflow**",
    "1. Schedule a weekly announcement automation.",
    "2. Review the first draft in Announcements before students see it.",
    "3. Adjust topics each week based on quiz and homework due dates.",
  )

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "announcements",
    actions: [
      scheduleAutomationAction("Schedule weekly announcements", {
        jobType: "weekly_announcement",
        topic: homeworkLabel,
        notes: "Plan weekly course announcements for the next month.",
        runInHours: 24,
      }),
      moduleAction("announcements", "Open announcement draft", {
        pendingKind: "announcement_draft",
        title: draft.title,
        content: draft.content,
      }),
      moduleAction("homework", "Manage Homework"),
    ],
  }
}

function practiceAfterQuizReply(ctx: FacultyCoraAutomateContext): FacultyCoraChatResponse {
  const quizRows = ctx.quizzes.slice(0, 6)
  const lines = ["**Practice after each quiz**", ""]

  if (quizRows.length > 0) {
    lines.push("Pair each quiz with a practice topic refresh:")
    for (const quiz of quizRows) {
      const topic = stripHtml(quiz.title).replace(/\bquiz\b/i, "").trim() || quiz.title
      const practiceTopic = ctx.practiceTopics.find((row) =>
        row.name.toLowerCase().includes(topic.toLowerCase().slice(0, 12)),
      )
      lines.push(
        `- **${quiz.title}** → practice topic **${practiceTopic?.name ?? topic}** (${practiceTopic?.question_count ?? 0} questions available)`,
      )
    }
  } else {
    lines.push("No quizzes found yet. Create quizzes first, then automate post-quiz practice refresh.")
  }

  lines.push(
    "",
    "Use **Manage Practice** to enable topics after each quiz closes, or schedule flashcard generation after lectures.",
  )

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "practice",
    actions: [
      scheduleAutomationAction("Schedule post-quiz practice", {
        jobType: "post_lecture_flashcards",
        topic: quizRows[0]?.title ?? "Quiz review",
        notes: "Generate practice refresh after each quiz this term.",
        runInHours: 2,
      }),
      moduleAction("practice", "Manage Practice"),
      moduleAction("flashcards", "Flashcards"),
      moduleAction("quizzes", "Manage Quizzes"),
    ],
  }
}

function preFinalChecklistReply(ctx: FacultyCoraAutomateContext): FacultyCoraChatResponse {
  const recentLectures = [...ctx.lectures].sort((a, b) => b.week - a.week).slice(0, 4)
  const lines = ["**Pre-final review checklist**", ""]

  lines.push("**Materials to verify**")
  if (recentLectures.length > 0) {
    for (const lecture of recentLectures) {
      lines.push(`- [ ] **${lecture.title}** (Week ${lecture.week}) — slides and key objectives`)
    }
  } else {
    lines.push("- [ ] Publish or refresh final review lectures")
  }

  if (ctx.practiceTopics.length > 0) {
    const weakTopics = ctx.practiceTopics
      .filter((topic) => topic.question_count > 0)
      .slice(0, 4)
    if (weakTopics.length > 0) {
      lines.push("", "**Practice topics to unlock**")
      for (const topic of weakTopics) {
        lines.push(`- [ ] **${topic.name}** (${topic.question_count} questions)`)
      }
    }
  }

  if (ctx.homework.length > 0) {
    lines.push("", "**Assessments to spot-check**")
    for (const row of ctx.homework.slice(0, 3)) {
      lines.push(`- [ ] **${row.title}** — confirm answer keys and rubrics`)
    }
  }

  lines.push(
    "",
    "**Communication**",
    "- [ ] Draft a final review announcement",
    "- [ ] Share office hours for last-minute questions",
    "- [ ] Post a course-notes summary or flashcard deck",
  )

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "course-notes",
    actions: [
      moduleAction("course-notes", "Course Notes"),
      moduleAction("flashcards", "Flashcards"),
      moduleAction("practice", "Manage Practice"),
      moduleAction("announcements", "Announcements"),
    ],
  }
}

function officeHoursSummaryReply(ctx: FacultyCoraAutomateContext): FacultyCoraChatResponse {
  const todayRequests = ctx.officeHours.filter(
    (row) => isToday(row.created_at) || (row.scheduled_date ? isToday(row.scheduled_date) : false),
  )
  const recentRequests = todayRequests.length > 0 ? todayRequests : ctx.officeHours.slice(0, 6)
  const lines = ["**Today's office hours summary**", ""]

  if (recentRequests.length > 0) {
    lines.push(`**${recentRequests.length}** request${recentRequests.length === 1 ? "" : "s"} to review:`)
    for (const row of recentRequests.slice(0, 5)) {
      lines.push(
        `- **${row.full_name}** — ${row.topic}${row.status ? ` (${row.status})` : ""}`,
      )
      if (row.description?.trim()) {
        lines.push(`  ${stripHtml(row.description).slice(0, 120)}${row.description.length > 120 ? "…" : ""}`)
      }
    }

    const topics = new Map<string, number>()
    for (const row of recentRequests) {
      const key = row.topic.trim() || "General"
      topics.set(key, (topics.get(key) ?? 0) + 1)
    }
    const recurring = [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    if (recurring.length > 0) {
      lines.push("", "**Recurring themes**")
      for (const [topic, count] of recurring) {
        lines.push(`- ${topic} (${count} student${count === 1 ? "" : "s"})`)
      }
    }
  } else {
    lines.push(
      "No office hour requests logged for today.",
      "",
      "When students book time, Cora can summarize topics here and suggest follow-up announcements or practice sets.",
    )
  }

  lines.push("", "Follow up in **Office Hours** or **Messages** if action is needed.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "office-hours",
    actions: [
      moduleAction("office-hours", "Office Hours"),
      moduleAction("messages", "Messages"),
      moduleAction("announcements", "Announcements"),
    ],
  }
}

function genericAutomateReply(): FacultyCoraChatResponse {
  return {
    reply: [
      "**Automate repetitive teaching work**",
      "",
      "I can help plan:",
      "",
      "- Weekly announcement schedules",
      "- Post-quiz practice refresh",
      "- Pre-final review checklists",
      "- Office hours summaries",
      "",
      "Pick a starter prompt or describe what you'd like to automate.",
    ].join("\n"),
    offline: true,
    actions: [
      moduleAction("announcements", "Announcements"),
      moduleAction("practice", "Manage Practice"),
      moduleAction("office-hours", "Office Hours"),
    ],
  }
}

export async function buildFacultyCoraAutomateOfflineChatReply(
  scope: InstructorScope,
  payload: {
    message: string
    capabilityId?: FacultyCoraCapabilityId
  },
): Promise<FacultyCoraChatResponse> {
  if (payload.capabilityId !== "automate") {
    return genericAutomateReply()
  }

  let ctx: FacultyCoraAutomateContext
  try {
    ctx = await buildFacultyCoraAutomateContext(scope)
  } catch {
    return {
      reply:
        "I couldn't load course automation context right now. Open **Announcements** or **Manage Practice** to continue manually.",
      offline: true,
      actions: [
        moduleAction("announcements", "Announcements"),
        moduleAction("practice", "Manage Practice"),
      ],
    }
  }

  const message = payload.message

  if (
    matchesPrompt(message, ["plan weekly announcements for the next month"]) ||
    matchesAny(message, ["weekly announcements", "announcement plan"])
  ) {
    return weeklyAnnouncementsReply(ctx, message)
  }

  if (
    matchesPrompt(message, ["generate practice after each quiz this term"]) ||
    matchesAny(message, ["practice after each quiz", "post-quiz practice"])
  ) {
    return practiceAfterQuizReply(ctx)
  }

  if (
    matchesPrompt(message, ["draft a pre-final review checklist"]) ||
    matchesAny(message, ["pre-final", "final review checklist"])
  ) {
    return preFinalChecklistReply(ctx)
  }

  if (
    matchesPrompt(message, ["summarize today's office hours"]) ||
    matchesAny(message, ["office hours summary", "summarize office hours"])
  ) {
    return officeHoursSummaryReply(ctx)
  }

  return weeklyAnnouncementsReply(ctx, message)
}
