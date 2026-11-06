/** Strip the app scheme and map empty Code Practice deep links to CodeBench. */
export function normalizeCoraDeepLink(route: string | null | undefined): string | null {
  if (!route) return null
  const trimmed = route.trim()
  if (!trimmed) return null

  const withoutScheme = trimmed.replace(/^coursecollab:\/\//i, "")
  const path = withoutScheme.replace(/^\/+/, "/")
  if (!withoutScheme || path === "/" || path === "") {
    return "/module/codebench"
  }

  if (/code[-_]?practice|codebench|\bide\b/i.test(path)) {
    return path.startsWith("/module/") ? path : "/module/codebench"
  }

  return path.startsWith("/") ? path : `/${withoutScheme}`
}
