import type { Router } from "expo-router"
import { normalizeRoutePathname, toAppHref } from "./navigation-reset"

/** True when the user is already on this drawer destination (including module/settings sub-routes). */
export function isDrawerShellRouteActive(pathname: string, route: string): boolean {
  const current = normalizeRoutePathname(pathname)
  const target = normalizeRoutePathname(route)
  if (current === target) return true
  if (target.startsWith("/module/") && current.startsWith(`${target}/`)) return true
  if (target === "/module/recommendations" && current.startsWith("/recommendation/")) return true
  if (target === "/module/messages" && current.startsWith("/messages/")) return true
  if (target === "/module/my-trainings" && current.includes("/summer/training")) return true
  if (target === "/settings" && current.startsWith("/settings")) return true
  return false
}

/** Switch top-level shell routes without growing the stack. */
export function navigateDrawerShellRoute(router: Router, pathname: string, route: string) {
  if (isDrawerShellRouteActive(pathname, route)) return
  router.replace(toAppHref(route) as never)
}
