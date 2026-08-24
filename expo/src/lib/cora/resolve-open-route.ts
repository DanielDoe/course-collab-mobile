import type { Router } from "expo-router"
import { openWebPath } from "../../constants/module-web-paths"
import { resolveCoraOpenRoute, nativeRouteForModuleId } from "./resolve-open-route-logic"

export { resolveCoraOpenRoute, nativeRouteForModuleId }

export function openCoraNativeRoute(router: Router, route: string | null | undefined): boolean {
  const nativeRoute = resolveCoraOpenRoute(route)
  if (!nativeRoute) return false
  router.push(nativeRoute as never)
  return true
}

/** Resolve web dashboard / deep links to native routes; fall back to in-app WebView. */
export function navigateCoraRecommendationLink(
  router: Router,
  link: string | null | undefined,
): boolean {
  if (!link || link.startsWith("cora:")) return false
  if (openCoraNativeRoute(router, link)) return true
  if (link.startsWith("/student/") || /^https?:\/\//i.test(link)) {
    openWebPath(router, link)
    return true
  }
  if (link.startsWith("/")) {
    router.push(link as never)
    return true
  }
  return false
}
