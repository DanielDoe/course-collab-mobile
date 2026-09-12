import type { AssessmentHistoryAttempt, AssessmentHistoryItem } from "./student-api"

export type QuizHistoryAttemptRaw = {
  attempt_id?: number
  attempt_number?: number
  score?: number
  total_questions?: number
  correct_answers?: number
  percentage?: number
  started_at?: string | null
  completed_at?: string | null
  is_final_grade?: boolean
}

export type QuizHistoryItemRaw = {
  quiz_id?: number
  quiz_title?: string
  retake_enabled?: boolean
  retake_limit?: number
  retake_policy?: string
  attempts?: QuizHistoryAttemptRaw[]
}

/** Same title cues as configForAssessmentType — quiz-history has no assessment_type. */
export function inferAssessmentTypeFromTitle(title: string | undefined): string {
  const normalized = (title ?? "").toLowerCase()
  if (normalized.includes("homework")) return "homework"
  if (normalized.includes("final")) return "final"
  if (normalized.includes("mid")) return "mid_semester"
  return "quiz"
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function normalizeQuizHistoryList(raw: unknown): QuizHistoryItemRaw[] {
  if (Array.isArray(raw)) return raw as QuizHistoryItemRaw[]
  const obj = asRecord(raw)
  if (!obj) return []
  if (Array.isArray(obj.quizHistory)) return obj.quizHistory as QuizHistoryItemRaw[]
  if (Array.isArray(obj.history)) return obj.history as QuizHistoryItemRaw[]
  return []
}

function attemptIdFromRaw(raw: QuizHistoryAttemptRaw | Record<string, unknown>): number | null {
  const record = raw as Record<string, unknown>
  const id = Number(record.attempt_id ?? record.attemptId ?? record.id)
  return Number.isFinite(id) && id > 0 ? id : null
}

function mapAttempt(raw: QuizHistoryAttemptRaw): AssessmentHistoryAttempt | null {
  const id = attemptIdFromRaw(raw)
  if (id == null) return null
  const completedAt =
    typeof raw.completed_at === "string" && raw.completed_at.trim() ? raw.completed_at : null
  return {
    id,
    completed_at: completedAt,
    is_completed: Boolean(completedAt),
    percentage: typeof raw.percentage === "number" && !Number.isNaN(raw.percentage) ? raw.percentage : undefined,
    score: typeof raw.score === "number" && !Number.isNaN(raw.score) ? raw.score : undefined,
  }
}

function latestCompletedAt(attempts: AssessmentHistoryAttempt[]): string | undefined {
  const dated = attempts
    .map((attempt) => attempt.completed_at)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
  if (dated.length === 0) return undefined
  return dated.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
}

function bestScore(attempts: AssessmentHistoryAttempt[]): number | undefined {
  const percentages = attempts
    .map((attempt) => attempt.percentage)
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value))
  if (percentages.length === 0) return undefined
  return Math.max(...percentages)
}

function historyStatus(attempts: AssessmentHistoryAttempt[]): string {
  if (attempts.some((attempt) => Boolean(attempt.completed_at))) return "completed"
  if (attempts.length > 0) return "in_progress"
  return "pending"
}

function mapQuizHistoryItem(raw: QuizHistoryItemRaw): AssessmentHistoryItem | null {
  const id = Number(raw.quiz_id)
  if (!Number.isFinite(id)) return null
  const title = typeof raw.quiz_title === "string" ? raw.quiz_title : ""
  const attempts = (raw.attempts ?? []).map(mapAttempt).filter((row): row is AssessmentHistoryAttempt => row != null)
  return {
    id,
    title,
    assessment_type: inferAssessmentTypeFromTitle(title),
    attempts,
    best_score: bestScore(attempts),
    completed_at: latestCompletedAt(attempts),
    status: historyStatus(attempts),
  }
}

/** Latest completed attempt id on a History row (handles attempt_id / id). */
export function resolveCompletedHistoryAttemptId(item: {
  attempts?: Array<{
    id?: number
    attempt_id?: number
    attemptId?: number
    completed_at?: string | null
    is_completed?: boolean
  }>
}): number | null {
  const attempts = item.attempts ?? []
  const completed = attempts
    .map((attempt) => ({
      id: attemptIdFromRaw(attempt),
      completedAt: attempt.completed_at,
      isCompleted: attempt.is_completed === true || Boolean(attempt.completed_at),
    }))
    .filter((attempt): attempt is { id: number; completedAt?: string | null; isCompleted: boolean } => {
      return attempt.id != null && attempt.isCompleted
    })
    .sort((a, b) => {
      const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0
      const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0
      return tb - ta
    })
  return completed[0]?.id ?? null
}

/** Map GET /api/student/quiz-history rows onto AssessmentHistoryItem. */
export function quizHistoryToAssessmentItems(raw: unknown): AssessmentHistoryItem[] {
  return normalizeQuizHistoryList(raw)
    .map(mapQuizHistoryItem)
    .filter((item): item is AssessmentHistoryItem => item != null)
}

function mergeAttempts(
  primary: AssessmentHistoryAttempt[] | undefined,
  extra: AssessmentHistoryAttempt[] | undefined,
): AssessmentHistoryAttempt[] | undefined {
  if (!extra?.length) return primary
  if (!primary?.length) return extra
  const byId = new Map<number, AssessmentHistoryAttempt>()
  for (const attempt of primary) byId.set(attempt.id, attempt)
  for (const attempt of extra) {
    const existing = byId.get(attempt.id)
    if (!existing) {
      byId.set(attempt.id, attempt)
      continue
    }
    byId.set(attempt.id, {
      ...existing,
      completed_at: existing.completed_at ?? attempt.completed_at,
      is_completed: existing.is_completed || attempt.is_completed,
      percentage: existing.percentage ?? attempt.percentage,
      score: existing.score ?? attempt.score,
    })
  }
  return Array.from(byId.values())
}

/** Overlay optional assessment-history rows onto quiz-history (quiz-history wins on conflicts). */
export function mergeAssessmentHistoryById(
  quizMapped: AssessmentHistoryItem[],
  assessmentRows: AssessmentHistoryItem[],
): AssessmentHistoryItem[] {
  const byId = new Map<number, AssessmentHistoryItem>()
  for (const item of quizMapped) byId.set(item.id, item)
  for (const extra of assessmentRows) {
    if (!Number.isFinite(extra.id)) continue
    const existing = byId.get(extra.id)
    if (!existing) {
      byId.set(extra.id, extra)
      continue
    }
    byId.set(extra.id, {
      ...existing,
      title: existing.title || extra.title,
      assessment_type: existing.assessment_type || extra.assessment_type,
      best_score: existing.best_score ?? extra.best_score,
      completed_at: existing.completed_at ?? extra.completed_at,
      status: existing.status ?? extra.status,
      attempts: mergeAttempts(existing.attempts, extra.attempts),
    })
  }
  return Array.from(byId.values())
}
