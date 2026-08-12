/**
 * Normalize custom-scheme deep links for Expo Router.
 * e.g. coursecollab://dev-student-login → /dev-student-login
 */
export function redirectSystemPath({
  path,
}: {
  path: string
  initial: boolean
}): string {
  if (!path || path.startsWith("/")) return path

  if (path.startsWith("coursecollab://")) {
    const withoutScheme = path.replace(/^coursecollab:\/\//, "")
    const route = withoutScheme.replace(/^\/+/, "")
    return route ? `/${route}` : "/"
  }

  return path
}
