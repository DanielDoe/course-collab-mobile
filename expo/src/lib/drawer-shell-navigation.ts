import { router as rootRouter, type Router } from "expo-router"
import { normalizeRoutePathname, toAppHref } from "./navigation-reset"

function moduleIdFromPath(path: string): string | undefined {
  const id = path.match(/^\/module\/([^/?]+)/)?.[1]
  return id && id !== "[id]" ? id : undefined
}

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

/**
 * Switch top-level shell routes without growing the stack.
 * Always uses the root router so a closing drawer Modal cannot drop the action.
 * Module → module stays on `/(app)/module/[id]`; the screen remounts via its slug key.
 */
export function navigateDrawerShellRoute(_router: Router, pathname: string, route: string) {
  if (isDrawerShellRouteActive(pathname, route)) return
  const current = normalizeRoutePathname(pathname)
  const target = normalizeRoutePathname(route)
  const currentModule = moduleIdFromPath(current)
  const targetModule = moduleIdFromPath(target)

  if (targetModule && currentModule !== targetModule) {
    rootRouter.replace({
      pathname: "/(app)/module/[id]",
      params: { id: targetModule },
    } as never)
    rootRouter.setParams({ id: targetModule })
    return
  }

  rootRouter.replace(toAppHref(route) as never)
}
