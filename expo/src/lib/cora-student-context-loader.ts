import { studentApi, type AssessmentHistoryItem, type QuizItem } from "./student-api"
import { fetchStudentNotifications } from "./student-notifications"
import { aiTutorApi } from "./ai-tutor-api"
import type { StudentSession } from "./session"
import type { StudentAssessmentRow, StudentContextPayload } from "./student-context-api"

function isCompletedQuiz(quiz: QuizItem): boolean {
  return quiz.completed === true || quiz.attempted === true || (quiz.attempts_used ?? 0) > 0
}

function quizScore(quiz: QuizItem): number | null {
  const raw = quiz.display_percentage ?? quiz.best_score ?? quiz.score
  if (raw == null || Number.isNaN(Number(raw))) return null
  return Number(raw)
}

function historyBestScore(item: AssessmentHistoryItem): number | null {
  if (item.best_score != null && !Number.isNaN(item.best_score)) return item.best_score
  const attempts = item.attempts ?? []
  const percentages = attempts
    .map((a) => a.percentage)
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
  if (percentages.length === 0) return null
  return Math.max(...percentages)
}

function historyCompletedAt(item: AssessmentHistoryItem): string | null {
  if (item.completed_at) return item.completed_at
  const attempts = item.attempts ?? []
  const latest = attempts
    .filter((a) => a.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0]
  return latest?.completed_at ?? null
}

function toAssessmentRow(
  quiz: QuizItem,
  status: string,
  history?: AssessmentHistoryItem,
): StudentAssessmentRow {
  const score = quizScore(quiz) ?? (history ? historyBestScore(history) : null)
  return {
    id: String(quiz.id),
    title: quiz.title,
    type: quiz.assessment_type ?? quiz.quiz_type ?? "quiz",
    dueDate: quiz.available_until ?? null,
    status,
    score,
    bestScore: history?.best_score ?? quiz.best_score ?? score,
    completedAt: historyCompletedAt(history ?? ({} as AssessmentHistoryItem)) ?? null,
  }
}

function partitionAssessments(quizzes: QuizItem[]): {
  upcoming: StudentAssessmentRow[]
  missed: StudentAssessmentRow[]
} {
  const now = Date.now()
  const upcoming: StudentAssessmentRow[] = []
  const missed: StudentAssessmentRow[] = []
  const seen = new Set<number>()

  for (const quiz of quizzes) {
    if (!quiz.is_active || seen.has(quiz.id)) continue
    seen.add(quiz.id)

    const dueMs = quiz.available_until ? new Date(quiz.available_until).getTime() : NaN
    const completed = isCompletedQuiz(quiz)

    if (Number.isFinite(dueMs) && dueMs < now && !completed) {
      missed.push(toAssessmentRow(quiz, "past_due"))
      continue
    }

    if (!completed || quiz.can_retake) {
      upcoming.push(toAssessmentRow(quiz, completed ? "completed_open" : "open"))
    }
  }

  upcoming.sort((a, b) => {
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
    return aTime - bTime
  })

  missed.sort((a, b) => {
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0
    return bTime - aTime
  })

  return { upcoming, missed }
}

function buildAssessmentResults(
  quizzes: QuizItem[],
  history: AssessmentHistoryItem[],
): StudentAssessmentRow[] {
  const historyById = new Map(history.map((item) => [item.id, item]))
  const seen = new Set<number>()
  const results: StudentAssessmentRow[] = []

  for (const quiz of quizzes) {
    if (seen.has(quiz.id)) continue
    seen.add(quiz.id)

    const historyItem = historyById.get(quiz.id)
    const completed = isCompletedQuiz(quiz) || !!historyItem
    if (!completed) continue

    results.push(toAssessmentRow(quiz, "completed", historyItem))
  }

  for (const item of history) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    results.push({
      id: String(item.id),
      title: item.title,
      type: item.assessment_type ?? "quiz",
      dueDate: null,
      status: "completed",
      score: historyBestScore(item),
      bestScore: item.best_score ?? historyBestScore(item),
      completedAt: historyCompletedAt(item),
    })
  }

  return results.sort((a, b) => {
    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0
    return bTime - aTime
  })
}

function mergeUniqueAssessments(
  primary: StudentAssessmentRow[],
  fallback: StudentAssessmentRow[] | undefined,
): StudentAssessmentRow[] {
  if (primary.length > 0) return primary
  return fallback ?? []
}

/** Loads full CourseCollab context for Cora from multiple platform APIs. */
export async function loadCoraStudentContext(session: StudentSession): Promise<StudentContextPayload> {
  const start = new Date()
  start.setDate(start.getDate() - 30)
  const end = new Date()
  end.setDate(end.getDate() + 90)

  const [
    baseContext,
    calendarRes,
    quizRes,
    homeworkRes,
    midtermRes,
    finalRes,
    gradesRes,
    historyRes,
    notificationsRes,
  ] = await Promise.all([
    aiTutorApi.getStudentContext(session).catch(() => ({} as StudentContextPayload)),
    studentApi.getCalendarEvents(session, { startDate: start, endDate: end }).catch(() => ({ events: [] })),
    studentApi.getQuizzes(session, "quiz").catch(() => ({ quizzes: [] as QuizItem[] })),
    studentApi.getQuizzes(session, "homework").catch(() => ({ quizzes: [] as QuizItem[] })),
    studentApi.getQuizzes(session, "mid_semester").catch(() => ({ quizzes: [] as QuizItem[] })),
    studentApi.getFinals(session).catch(() => ({ finals: [] as QuizItem[] })),
    studentApi.getGrades(session).catch(() => null),
    studentApi.getAssessmentHistory(session).catch(() => ({ history: [], assessmentHistory: [] })),
    fetchStudentNotifications(session).catch(() => null),
  ])

  const allQuizzes = [
    ...(quizRes.quizzes ?? []),
    ...(homeworkRes.quizzes ?? []),
    ...(midtermRes.quizzes ?? []),
    ...(finalRes.finals ?? []),
  ]

  const history = historyRes.history ?? historyRes.assessmentHistory ?? []
  const { upcoming, missed } = partitionAssessments(allQuizzes)
  const assessmentResults = buildAssessmentResults(allQuizzes, history)

  const calendarEvents = (calendarRes.events ?? []).map((event) => ({
    id: String(event.id ?? event.title),
    title: String(event.title ?? "Event"),
    start: String(event.start_time ?? event.start ?? ""),
    eventType: event.event_type ? String(event.event_type) : null,
  }))

  const notifications = (notificationsRes?.notifications ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    isRead: n.is_read,
    createdAt: n.created_at,
  }))

  const clientGrades =
    gradesRes?.grade
      ? [
          {
            session: session.section,
            totalScore: gradesRes.grade.total_score != null ? Number(gradesRes.grade.total_score) : null,
            quizScore: gradesRes.grade.quiz_score != null ? Number(gradesRes.grade.quiz_score) : null,
            homeworkScore: gradesRes.grade.homework_score != null ? Number(gradesRes.grade.homework_score) : null,
            midtermScore: gradesRes.grade.midterm_score != null ? Number(gradesRes.grade.midterm_score) : null,
            finalScore: gradesRes.grade.final_score != null ? Number(gradesRes.grade.final_score) : null,
            attendanceScore: gradesRes.grade.attendance_score != null ? Number(gradesRes.grade.attendance_score) : null,
            engagementCredits:
              gradesRes.grade.engagement_credits != null ? Number(gradesRes.grade.engagement_credits) : null,
          },
        ]
      : undefined

  const gradesPayload = clientGrades ?? baseContext.grades

  const knowledgeGraph = {
    updatedAt: new Date().toISOString(),
    topics: (baseContext.topicMastery ?? []).map((t) => ({
      id: t.topic,
      label: t.topic,
      status: t.status ?? "neutral",
      mastery: t.mastery,
    })),
    assessments: [...upcoming, ...missed],
    calendar: calendarEvents.length > 0 ? calendarEvents : (baseContext.calendarEvents ?? []),
    lectures: baseContext.knowledgeGraph?.lectures ?? [],
    notifications,
    summary: `Calendar: ${calendarEvents.length} events | Upcoming: ${upcoming.length} | Missed: ${missed.length} | Completed w/ scores: ${assessmentResults.length}`,
  }

  return {
    ...baseContext,
    account: baseContext.account ?? {
      studentDbId: Number(session.databaseId),
      section: session.section,
      courseCode: session.courseCode,
    },
    calendarEvents:
      calendarEvents.length > 0 ? calendarEvents : (baseContext.calendarEvents ?? knowledgeGraph.calendar),
    upcomingAssessments: mergeUniqueAssessments(upcoming, baseContext.upcomingAssessments),
    missedDeadlines: mergeUniqueAssessments(missed, baseContext.missedDeadlines),
    assessmentResults,
    grades: gradesPayload,
    knowledgeGraph: baseContext.knowledgeGraph
      ? {
          ...baseContext.knowledgeGraph,
          calendar: knowledgeGraph.calendar,
          assessments: knowledgeGraph.assessments,
          notifications,
          summary: knowledgeGraph.summary,
        }
      : knowledgeGraph,
    syncedAt: new Date().toISOString(),
  }
}
