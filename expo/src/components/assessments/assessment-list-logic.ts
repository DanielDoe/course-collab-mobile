import { ApiError, studentApi, type QuizItem } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import type { AssessmentListKind } from "./assessment-config"
import { getAssessmentListMeta, isInProgressAttempt } from "./assessment-detail-logic"

/** Match web QuizList — finals/midterms use the unified quizzes API where applicable. */
export async function fetchAssessmentsForKind(
  session: StudentSession,
  kind: AssessmentListKind | string,
): Promise<QuizItem[]> {
  if (kind === "mid_semester") {
    const data = await studentApi.getMidSemesters(session)
    return data.midSemesters ?? data.exams ?? []
  }

  const apiType = kind === "final" ? "final" : kind === "homework" ? "homework" : kind
  const data = await studentApi.getQuizzes(session, apiType)
  return data.quizzes ?? []
}

export function quizItemDisplayScore(item: QuizItem): number | null {
  if (item.best_score != null && !Number.isNaN(item.best_score)) return item.best_score
  if (item.display_percentage != null && !Number.isNaN(item.display_percentage)) {
    return item.display_percentage
  }
  if (
    item.score != null &&
    item.total_questions != null &&
    item.total_questions > 0 &&
    !Number.isNaN(item.score)
  ) {
    return Math.round((item.score / item.total_questions) * 100)
  }
  return null
}

export function quizItemIsDone(item: QuizItem): boolean {
  return getAssessmentListMeta(item).isDone
}

export function quizItemListStatus(item: QuizItem): {
  label: string
  pillTone: "success" | "neutral" | "live"
} {
  const { statusLabel, pillTone } = getAssessmentListMeta(item)
  return { label: statusLabel, pillTone }
}

/** Score for list cards — hide partial 0% while an attempt is still open. */
export function quizItemCardScore(item: QuizItem): number | null {
  if (isInProgressAttempt(item)) return null
  return quizItemDisplayScore(item)
}

export async function fetchAssessmentById(
  session: StudentSession,
  kind: AssessmentListKind | string,
  id: number,
): Promise<QuizItem | null> {
  try {
    const items = await fetchAssessmentsForKind(session, kind)
    return items.find((q) => q.id === id) ?? null
  } catch (err) {
    if (err instanceof ApiError) throw err
    return null
  }
}
