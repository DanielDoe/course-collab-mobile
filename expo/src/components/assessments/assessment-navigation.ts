import { useRouter } from "expo-router"
import { navigationKeyFromHref, shouldAcceptNavigation } from "../../lib/motion"
import { resolveCompletedHistoryAttemptId } from "../../lib/assessment-history-map"
import { assessmentReportHref, assessmentReportRouteParams } from "../../lib/assessment-report-href"
import { assessmentTakeHref } from "../../lib/route-params"
import type { AssessmentListKind } from "./assessment-config"
import type { AssessmentTakeAction } from "../../constants/module-web-paths"

export type ParsedAssessmentResultsPath = {
  attemptId: number
  assessmentType?: string
}

/** Parse `/student/results/:attemptId` from a web path or full URL. */
export function parseAssessmentResultsWebPath(input: string): ParsedAssessmentResultsPath | null {
  const raw = input.trim()
  if (!raw) return null

  let path = raw
  try {
    if (/^https?:\/\//i.test(raw)) {
      path = new URL(raw).pathname + (new URL(raw).search || "")
    }
  } catch {
    /* use raw path */
  }

  const pathOnly = path.split("?")[0] ?? path
  const match = pathOnly.match(/\/student\/results\/(\d+)/i)
  if (!match) return null

  const attemptId = Number(match[1])
  if (!Number.isFinite(attemptId)) return null

  let assessmentType: string | undefined
  const query = path.includes("?") ? path.slice(path.indexOf("?") + 1) : ""
  if (query) {
    const type = new URLSearchParams(query).get("type")
    if (type?.trim()) assessmentType = type.trim()
  }

  return { attemptId, assessmentType }
}

/** Redirect immersive web results to the native report screen. Returns true when handled. */
export function tryOpenNativeAssessmentResultsFromUrl(
  router: ReturnType<typeof useRouter>,
  url: string,
): boolean {
  const parsed = parseAssessmentResultsWebPath(url)
  if (!parsed) return false

  router.replace(
    assessmentReportHref(parsed.attemptId, parsed.assessmentType) as never,
  )
  return true
}

function resolveAssessmentType(
  kind: AssessmentListKind | string,
  itemAssessmentType?: string,
): string {
  if (kind === "mid_semester") return "mid_semester"
  if (kind === "final") return "final"
  if (kind === "homework") return "homework"
  return itemAssessmentType ?? "quiz"
}

export function assessmentModuleRoute(assessmentType: string): string {
  const t = assessmentType.toLowerCase()
  if (t === "final" || t === "finals") return "/module/final-exams"
  if (t === "mid_semester" || t === "midterm" || t === "mid-semester") {
    return "/module/mid-semester-exams"
  }
  if (t === "homework") return "/module/homework"
  return "/module/quizzes"
}

export function assessmentModuleHrefForKind(kind: AssessmentListKind): string {
  if (kind === "final") return "/module/final-exams"
  if (kind === "mid_semester") return "/module/mid-semester-exams"
  if (kind === "homework") return "/module/homework"
  return "/module/quizzes"
}

/** Leave the quiz taker — falls back when there is no back stack (e.g. deep link). */
export function exitAssessmentQuiz(
  router: ReturnType<typeof useRouter>,
  options?: { quizId?: number; assessmentType?: string },
) {
  if (router.canGoBack()) {
    router.back()
    return
  }

  if (options?.quizId != null && Number.isFinite(options.quizId)) {
    router.replace({
      pathname: "/assessment/[id]",
      params: {
        id: String(options.quizId),
        ...(options.assessmentType ? { type: options.assessmentType } : {}),
      },
    } as never)
    return
  }

  router.replace(assessmentModuleRoute(options?.assessmentType ?? "quiz") as never)
}

export function openAssessmentDetail(
  router: ReturnType<typeof useRouter>,
  kind: AssessmentListKind | string,
  quizId: number,
  itemAssessmentType?: string,
) {
  const type = resolveAssessmentType(kind, itemAssessmentType)
  const dest = {
    pathname: "/assessment/[id]",
    params: { id: String(quizId), type },
  }
  if (!shouldAcceptNavigation(navigationKeyFromHref(dest))) return
  router.push(dest as never)
}

export function openAssessmentTake(
  router: ReturnType<typeof useRouter>,
  assessmentType: string,
  quizId: number,
  action: AssessmentTakeAction = "start",
) {
  const dest = assessmentTakeHref(quizId, assessmentType, action)
  if (!shouldAcceptNavigation(navigationKeyFromHref(dest))) return
  router.push(dest as never)
}

export { assessmentReportHref } from "../../lib/assessment-report-href"

export function openAssessmentResults(
  router: ReturnType<typeof useRouter>,
  attemptId: number,
  assessmentType?: string,
  from?: string,
) {
  const dest = assessmentReportRouteParams(attemptId, assessmentType, from)
  if (!shouldAcceptNavigation(assessmentReportHref(attemptId, assessmentType, from))) return
  router.push(dest as never)
}

/** @deprecated Use openAssessmentDetail from list cards; take opens from detail actions. */
export function openAssessmentItem(
  router: ReturnType<typeof useRouter>,
  kind: AssessmentListKind | string,
  quizId: number,
  itemAssessmentType?: string,
) {
  openAssessmentDetail(router, kind, quizId, itemAssessmentType)
}

export function openHistoryItem(
  router: ReturnType<typeof useRouter>,
  item: {
    id: number
    assessment_type: string
    status?: string
    attempts?: { id: number; completed_at?: string | null; is_completed?: boolean; percentage?: number }[]
  },
) {
  const completedAttemptId = resolveCompletedHistoryAttemptId(item)
  if (completedAttemptId != null) {
    openAssessmentResults(router, completedAttemptId, item.assessment_type, "quiz-history")
    return
  }

  const attempts = item.attempts ?? []
  const status = (item.status ?? "").toLowerCase()
  const inProgress =
    status.includes("progress") ||
    status === "saved_for_later" ||
    attempts.some((a) => !a.is_completed && !a.completed_at)

  openAssessmentTake(
    router,
    item.assessment_type,
    item.id,
    inProgress ? "continue" : "start",
  )
}
