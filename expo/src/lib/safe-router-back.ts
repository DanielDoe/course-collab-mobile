import type { Router } from "expo-router"

type RouterBack = Pick<Router, "back" | "canGoBack" | "replace">

/** Go back when possible; otherwise replace with a sensible fallback route. */
export function safeRouterBack(router: RouterBack, fallbackHref: string) {
  if (router.canGoBack()) {
    router.back()
    return
  }
  router.replace(fallbackHref as never)
}
