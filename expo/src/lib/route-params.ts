/** First value when Expo Router passes a dynamic param as string | string[]. */
export function firstRouteParam(value: string | string[] | undefined | null): string | undefined {
  if (value == null) return undefined
  if (Array.isArray(value)) return value.find((part) => String(part).trim()) ?? value[0]
  return value
}

/** Parse a numeric route id; returns null when missing or not a finite number. */
export function parseRouteNumericId(value: string | string[] | undefined | null): number | null {
  const parts = Array.isArray(value) ? value : value != null ? [value] : []
  for (const item of parts) {
    const raw = String(item ?? "").trim()
    if (!raw) continue
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function parseAssessmentTakeAction(
  value: string | string[] | undefined | null,
): "continue" | "retake" | "start" {
  const raw = firstRouteParam(value)
  if (raw === "continue" || raw === "retake" || raw === "start") return raw
  return "start"
}

/** True for the live take route and the legacy `/assessment/take` collision path. */
export function isAssessmentTakePath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname
  return /^\/take(\/|$)/i.test(path) || /\/assessment\/take(\/|$)/i.test(path)
}

export function assessmentTakeQuizIdFromPath(pathname: string): number | null {
  const path = pathname.split("?")[0] ?? pathname
  const match = path.match(/\/(?:assessment\/)?take\/([^/]+)/i)
  return match ? parseRouteNumericId(match[1]) : null
}

/**
 * Take lives at `/take/:id`, not `/assessment/take/:id`.
 * The latter collides with `assessment/[id]` (`id="take"`) and dumped homework into Quizzes.
 */
export function assessmentTakeHref(
  quizId: number,
  assessmentType: string,
  action: "continue" | "retake" | "start" = "start",
): string {
  const params = new URLSearchParams({
    type: assessmentType,
    action,
    quizId: String(quizId),
  })
  return `/take/${quizId}?${params.toString()}`
}

export function resolveAssessmentTakeQuizId(input: {
  id?: string | string[] | null
  quizId?: string | string[] | null
  pathname?: string
}): number | null {
  return (
    parseRouteNumericId(input.quizId) ??
    parseRouteNumericId(input.id) ??
    (input.pathname ? assessmentTakeQuizIdFromPath(input.pathname) : null)
  )
}
