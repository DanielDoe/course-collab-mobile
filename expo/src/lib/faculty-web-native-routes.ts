import {
  FACULTY_DASHBOARD_ROUTE,
  facultyNativeRouteFromLink,
} from "../constants/faculty-nav"

/**
 * Map faculty `/web` paths that already have native screens.
 * Returns null when the WebView should keep loading the page.
 */
export function resolveFacultyNativeRouteFromWebPath(webPath: string): string | null {
  const pathOnly = decodeURIComponent(webPath).split("?")[0]?.replace(/\/$/, "") ?? ""
  const lower = pathOnly.toLowerCase()

  if (
    !pathOnly ||
    lower === "/faculty/dashboard" ||
    lower === "/instructor/dashboard" ||
    lower === "/instructor/dashboard-v2" ||
    lower === "/faculty/dashboard-v2" ||
    lower.endsWith("/instructor/dashboard-v2") ||
    /\/instructor\/dashboard-v2\/?$/i.test(lower)
  ) {
    return FACULTY_DASHBOARD_ROUTE
  }

  const mapped = facultyNativeRouteFromLink(pathOnly)
  if (mapped !== FACULTY_DASHBOARD_ROUTE) return mapped

  return null
}
