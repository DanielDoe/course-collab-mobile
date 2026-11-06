import { parseRouteNumericId } from "./route-params"

export function assessmentReportHref(
  attemptId: number,
  assessmentType?: string,
  from?: string,
): string {
  const params = new URLSearchParams()
  if (assessmentType?.trim()) params.set("type", assessmentType.trim())
  if (from?.trim()) params.set("from", from.trim())
  const query = params.toString()
  return query ? `/results/${attemptId}?${query}` : `/results/${attemptId}`
}

export function assessmentReportRouteParams(
  attemptId: number,
  assessmentType?: string,
  from?: string,
): { pathname: "/results/[attemptId]"; params: Record<string, string> } {
  return {
    pathname: "/results/[attemptId]",
    params: {
      attemptId: String(attemptId),
      ...(assessmentType?.trim() ? { type: assessmentType.trim() } : {}),
      ...(from?.trim() ? { from: from.trim() } : {}),
    },
  }
}

/** Resolve the attempt id from params, `/results/123`, or `/assessment/report/123`. */
export function parseAssessmentReportAttemptId(args: {
  param?: string | string[] | null
  pathname?: string | null
  segments?: string[]
}): number | null {
  const fromParam = parseRouteNumericId(args.param)
  if (fromParam != null) return fromParam

  const path = args.pathname ?? ""
  const pathMatch = path.match(/\/(?:results|assessment\/report)\/(\d+)/)
  if (pathMatch) return parseRouteNumericId(pathMatch[1])

  const segments = args.segments ?? []
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const id = parseRouteNumericId(segments[i])
    if (id != null) return id
  }
  return null
}

export function isAssessmentReportPath(pathname: string): boolean {
  const path = (pathname.split("?")[0] || "").replace(/\/$/, "")
  return path === "/results" || path.startsWith("/results/") || /\/assessment\/report(?:\/|$)/.test(path)
}
