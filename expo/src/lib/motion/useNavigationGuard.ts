import { useCallback, useRef } from "react"
import type { Router } from "expo-router"
import { NAV_GUARD_MS } from "./motion"
import { navigationKeyFromHref, shouldAcceptNavigation } from "./navigation"

/** Guarded router.push — blocks duplicate pushes to the same destination. */
export function useGuardedPush(router: Pick<Router, "push">) {
  const routerRef = useRef(router)
  routerRef.current = router

  return useCallback((href: unknown) => {
    if (!shouldAcceptNavigation(navigationKeyFromHref(href))) return
    routerRef.current.push(href as never)
  }, [])
}

export { NAV_GUARD_MS }
