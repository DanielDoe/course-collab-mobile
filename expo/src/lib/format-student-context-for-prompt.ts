import type { StudentContextPayload } from "./student-context-api"

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

/** Formats CourseCollab student snapshot for Cora prompts (mobile-side injection). */
export function formatStudentContextForPrompt(ctx: StudentContextPayload): string {
  const lines: string[] = [
    "[CourseCollab platform data — live read-only snapshot from CourseCollab APIs. Use this data directly to answer. Do NOT ask the student to paste grade exports or assessment lists when data appears below.]",
    "",
    "**STUDENT LEARNING PROFILE:**",
  ]

  const account = ctx.account
  if (account) {
    lines.push(
      `- Student: ${account.fullName ?? "Unknown"} (${account.studentCode ?? account.studentDbId})`,
      `- Course: ${account.courseCode ?? "—"}${account.courseTitle ? ` — ${account.courseTitle}` : ""}`,
      `- Section: ${account.section ?? "—"}`,
    )
  }

  if (ctx.membership) {
    lines.push(`- Membership: ${ctx.membership.tier} (${ctx.membership.aiTutorCredits} Cora credits)`)
  }

  if (ctx.strugglingTopics?.length) {
    lines.push(`- Struggling topics: ${ctx.strugglingTopics.slice(0, 8).join(", ")}`)
  }
  if (ctx.strengths?.length) {
    lines.push(`- Strengths: ${ctx.strengths.slice(0, 8).join(", ")}`)
  }

  const summary = ctx.summary ?? {}
  if (num(summary.avgQuizScore) > 0) {
    lines.push(`- Quizzes: ${num(summary.avgQuizScore).toFixed(1)}% avg (${summary.totalQuizAttempts ?? 0} attempts)`)
  }
  if (num(summary.avgHomeworkScore) > 0) {
    lines.push(`- Homework: ${num(summary.avgHomeworkScore).toFixed(1)}% avg (${summary.totalHomeworkAttempts ?? 0} attempts)`)
  }
  if (num(summary.avgPracticeScore) > 0) {
    lines.push(`- Practice Hub: ${num(summary.avgPracticeScore).toFixed(1)}% avg (${summary.totalPracticeAttempts ?? 0} attempts)`)
  }

  if (ctx.grades?.length) {
    lines.push("- **Gradebook (category averages):**")
    for (const g of ctx.grades.slice(0, 2)) {
      lines.push(
        `  • Session ${g.session ?? "—"}: total ${g.totalScore ?? "—"}% | quiz ${g.quizScore ?? "—"} | hw ${g.homeworkScore ?? "—"} | midterm ${g.midtermScore ?? "—"} | final ${g.finalScore ?? "—"}`,
      )
    }
  }

  const results = ctx.assessmentResults ?? []
  lines.push("", "**ASSESSMENT RESULTS (per-item scores from CourseCollab):**")
  if (results.length === 0) {
    lines.push("- No completed assessments with scores on record")
  } else {
    const homework = results.filter((r) => /homework|hw/i.test(r.type) || /homework|hw/i.test(r.title))
    const quizzes = results.filter((r) => /quiz/i.test(r.type) || /quiz/i.test(r.title))
    const other = results.filter((r) => !homework.includes(r) && !quizzes.includes(r))

    const printGroup = (label: string, items: typeof results) => {
      if (items.length === 0) return
      lines.push(`- ${label}:`)
      items.slice(0, 25).forEach((a) => {
        const score =
          a.score != null ? `${Math.round(a.score * 10) / 10}%` : a.bestScore != null ? `${a.bestScore}%` : "—"
        lines.push(`  • ${a.title}: ${score}${a.completedAt ? ` (${a.completedAt.slice(0, 10)})` : ""}`)
      })
    }

    printGroup("Homework", homework)
    printGroup("Quizzes", quizzes)
    printGroup("Other assessments", other)
  }

  const breakdown = ctx.liveGradeBreakdown ?? []
  if (breakdown.length > 0) {
    lines.push("", "**LIVE GRADE LOOKUP (queried for this message):**")
    breakdown.slice(0, 40).forEach((row) => {
      lines.push(
        `  • [${row.category}] ${row.title}: ${row.score ?? "—"}${row.status ? ` (${row.status})` : ""}`,
      )
    })
  }

  const calendar = ctx.calendarEvents ?? ctx.knowledgeGraph?.calendar ?? []
  lines.push("", "**CALENDAR EVENTS (CourseCollab):**")
  if (calendar.length === 0) {
    lines.push("- None on record in the next 90 days")
  } else {
    calendar.slice(0, 20).forEach((event) => {
      lines.push(`- ${formatDate(event.start)} — ${event.title}${event.eventType ? ` (${event.eventType})` : ""}`)
    })
  }

  const upcoming = ctx.upcomingAssessments ?? ctx.knowledgeGraph?.assessments?.filter((a) => a.status !== "past_due") ?? []
  lines.push("", "**UPCOMING ASSESSMENTS:**")
  if (upcoming.length === 0) {
    lines.push("- None on record")
  } else {
    upcoming.slice(0, 15).forEach((a) => {
      lines.push(`- ${a.title} (${a.type}) — due ${formatDate(a.dueDate)}`)
    })
  }

  const missed = ctx.missedDeadlines ?? ctx.knowledgeGraph?.assessments?.filter((a) => a.status === "past_due") ?? []
  lines.push("", "**MISSED DEADLINES:**")
  if (missed.length === 0) {
    lines.push("- None on record")
  } else {
    missed.slice(0, 10).forEach((a) => {
      lines.push(`- ${a.title} (${a.type}) — was due ${formatDate(a.dueDate)}`)
    })
  }

  const notifications = ctx.knowledgeGraph?.notifications ?? []
  if (notifications.length > 0) {
    lines.push("", "**RECENT NOTIFICATIONS / ALERTS:**")
    notifications.slice(0, 10).forEach((n) => {
      lines.push(`- ${n.isRead ? "[read]" : "[UNREAD]"} ${n.title} (${formatDate(n.createdAt)})`)
    })
  }

  if (ctx.announcements?.length) {
    lines.push("", "**RECENT ANNOUNCEMENTS:**")
    ctx.announcements.slice(0, 5).forEach((a) => {
      lines.push(`- ${a.title}${a.createdAt ? ` (${a.createdAt.slice(0, 10)})` : ""}`)
    })
  }

  if (ctx.knowledgeGraph?.summary) {
    lines.push("", ctx.knowledgeGraph.summary)
  }

  lines.push("", `Data synced: ${ctx.syncedAt ?? new Date().toISOString()}${ctx.liveLookupAt ? ` | Live lookup: ${ctx.liveLookupAt}` : ""}`)
  return lines.join("\n")
}
