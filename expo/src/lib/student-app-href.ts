import type { Router } from "expo-router"
import { navigationKeyFromHref, shouldAcceptNavigation } from "./motion/navigation"

/** Parse a dashboard/module href so `/module/grades?focus=engagement` keeps its params. */
export function studentAppHref(href: string): { pathname: string; params?: Record<string, string> } {
  const trimmed = href.trim()
  const qIndex = trimmed.indexOf("?")
  const path = (qIndex >= 0 ? trimmed.slice(0, qIndex) : trimmed) || "/"
  const query = qIndex >= 0 ? trimmed.slice(qIndex + 1) : ""
  const queryParams = Object.fromEntries(new URLSearchParams(query))
  const moduleId = path.match(/^\/module\/([^/]+)$/)?.[1]
  if (moduleId) {
    return {
      pathname: "/(app)/module/[id]",
      params: { id: moduleId, ...queryParams },
    }
  }
  return Object.keys(queryParams).length > 0 ? { pathname: path, params: queryParams } : { pathname: path }
}

export function pushStudentAppHref(router: Pick<Router, "push">, href: string) {
  const dest = studentAppHref(href)
  if (!shouldAcceptNavigation(navigationKeyFromHref(dest))) return
  router.push(dest as never)
}
