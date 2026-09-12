import { inferAssessmentTypeFromTitle } from "./assessment-history-map"
import { assessmentReportHref } from "./assessment-report-href"
import type {
  GradeTrendPoint,
  PerformanceComparison,
  PerformanceInsight,
  StudentDashboardStats,
} from "../types/dashboard"

export type StudentActivityKind = "quiz" | "homework" | "exam" | "practice" | "codebench"

export type StudentActivityEvent = {
  id: string
  kind: StudentActivityKind
  title: string
  detail: string
  at: string
  score?: number | null
  href?: string
}

export type PracticeTopicInsight = {
  topic: string
  accuracy: number
  completed: number
  questionCount: number
}

export type StudentAnalyticsSnapshot = {
  stats: StudentDashboardStats
  trend: GradeTrendPoint[]
  comparison: PerformanceComparison[]
  insights: PerformanceInsight[]
  topics: PracticeTopicInsight[]
  focusTopic: string | null
  strongestTopic: string | null
  practiceNext: string | null
  activity: StudentActivityEvent[]
  practiceSessions: number
  codebenchXp: number
  codebenchSubmissions: number
  codebenchStreakDays: number
  codebenchCalendar: Record<string, boolean>
}

export type QuizHistoryRow = {
  quiz_id?: number
  quiz_title?: string
  attempts?: { attempt_id?: number; percentage?: number; completed_at?: string | null }[]
}

export type HomeworkHistoryRow = {
  id?: number
  title?: string
  status?: string
  attempts?: { id?: number; percentage?: number; completed_at?: string | null }[]
}

export type PracticeTopicInput = {
  name: string
  accuracy: number
  completed: number
  questionCount: number
}

export type PracticeSessionInput = {
  id?: number
  topic: string
  score: number
  created_at: string
}

export type CodebenchSubmissionInput = {
  pointsAwarded: number
  submittedAt?: string
}

function asPercent(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const scaled = value > 0 && value <= 1 ? value * 100 : value
  return Math.round(scaled * 10) / 10
}

function kindFromAssessmentTitle(title: string): StudentActivityKind {
  const type = inferAssessmentTypeFromTitle(title)
  if (type === "homework") return "homework"
  if (type === "final" || type === "mid_semester") return "exam"
  return "quiz"
}

function scoreLabel(score: number | null | undefined): string {
  const pct = asPercent(score ?? null)
  return pct == null ? "Completed" : `${pct}%`
}

function isoOrNull(value?: string | null): string | null {
  if (!value?.trim()) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

export function buildPracticeTopicInsights(topics: PracticeTopicInput[]): {
  topics: PracticeTopicInsight[]
  focusTopic: string | null
  strongestTopic: string | null
  practiceNext: string | null
} {
  const practiced = topics
    .map((row) => ({
      topic: row.name.trim(),
      accuracy: asPercent(row.accuracy) ?? 0,
      completed: Number(row.completed ?? 0),
      questionCount: Number(row.questionCount ?? 0),
    }))
    .filter((row) => row.topic && row.completed > 0)
    .sort((a, b) => a.accuracy - b.accuracy)

  const focus = practiced[0] ?? null
  const strongest = [...practiced].sort((a, b) => b.accuracy - a.accuracy)[0] ?? null
  const remaining = practiced.find((row) => row.questionCount > row.completed) ?? focus

  return {
    topics: practiced,
    focusTopic: focus && focus.accuracy < 80 ? focus.topic : null,
    strongestTopic: strongest && strongest.accuracy >= 70 ? strongest.topic : null,
    practiceNext: remaining?.topic ?? null,
  }
}

export function buildStudentActivityLog(input: {
  quizzes?: QuizHistoryRow[] | null
  homework?: HomeworkHistoryRow[] | null
  practice?: PracticeSessionInput[] | null
  codebench?: CodebenchSubmissionInput[] | null
}): StudentActivityEvent[] {
  const events: StudentActivityEvent[] = []

  for (const quiz of input.quizzes ?? []) {
    const title = quiz.quiz_title?.trim() || "Quiz"
    const kind = kindFromAssessmentTitle(title)
    for (const attempt of quiz.attempts ?? []) {
      const at = isoOrNull(attempt.completed_at)
      if (!at) continue
      const attemptId = Number(attempt.attempt_id)
      const score = asPercent(attempt.percentage)
      events.push({
        id: `quiz-${attempt.attempt_id ?? `${quiz.quiz_id ?? title}-${at}`}`,
        kind,
        title,
        detail: scoreLabel(score),
        at,
        score,
        href:
          Number.isFinite(attemptId) && attemptId > 0
            ? assessmentReportHref(attemptId, inferAssessmentTypeFromTitle(title), "quiz-history")
            : "/module/quiz-history",
      })
    }
  }

  for (const homework of input.homework ?? []) {
    const title = homework.title?.trim() || "Homework"
    for (const attempt of homework.attempts ?? []) {
      const at = isoOrNull(attempt.completed_at)
      if (!at) continue
      const attemptId = Number(attempt.id)
      const score = asPercent(attempt.percentage)
      events.push({
        id: `hw-${attempt.id ?? `${homework.id ?? title}-${at}`}`,
        kind: "homework",
        title,
        detail: scoreLabel(score),
        at,
        score,
        href:
          Number.isFinite(attemptId) && attemptId > 0
            ? assessmentReportHref(attemptId, "homework", "quiz-history")
            : "/module/homework",
      })
    }
  }

  for (const session of input.practice ?? []) {
    const at = isoOrNull(session.created_at)
    if (!at) continue
    const score = asPercent(session.score)
    events.push({
      id: `practice-${session.id ?? `${session.topic}-${at}`}`,
      kind: "practice",
      title: session.topic?.trim() || "Practice",
      detail: score == null ? "Practice session" : `${score}% on this session`,
      at,
      score,
      href: "/module/practice",
    })
  }

  for (const [index, row] of (input.codebench ?? []).entries()) {
    const at = isoOrNull(row.submittedAt)
    if (!at) continue
    events.push({
      id: `code-${at}-${index}`,
      kind: "codebench",
      title: "CodeBench submission",
      detail: row.pointsAwarded > 0 ? `+${row.pointsAwarded} XP` : "Submitted code",
      at,
      href: "/codebench/ide",
    })
  }

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 40)
}

export function calendarFromSubmissions(rows: CodebenchSubmissionInput[]): Record<string, boolean> {
  const days: Record<string, boolean> = {}
  for (const row of rows) {
    const at = isoOrNull(row.submittedAt)
    if (!at) continue
    days[at.slice(0, 10)] = true
  }
  return days
}

export function formatActivityWhen(iso: string): string {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return ""
  return new Date(time).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
