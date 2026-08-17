import { router as rootRouter, type Router } from "expo-router"
import type { AppSession } from "./session"

const AUTH_ROUTES = new Set(["/login", "/signing-in", "/appearance-setup", "/change-password"])

/** Review / first-login accounts must use the native change-password screen — not web. */
export function sessionNeedsPasswordChange(session: AppSession | null | undefined): boolean {
  if (!session) return false
  if (session.portal !== "student" && session.portal !== "faculty") return false
  return Boolean(session.requiresPasswordChange)
}

/** Web change-password URLs that must bounce to native `/(auth)/change-password`. */
export function isWebChangePasswordUrl(urlOrPath: string): boolean {
  return /\/(?:student|faculty|instructor)\/change-password(?:\/|\?|#|$)/i.test(urlOrPath)
}

/** Auth/onboarding screens live under the `(auth)` stack group. */
export function toAuthHref(href: string): string {
  if (href.startsWith("/(auth)/")) return href
  if (AUTH_ROUTES.has(href)) return `/(auth)${href}`
  return href
}

/** Main app screens live under the `(app)` stack group. */
export function toAppHref(href: string): string {
  if (href.startsWith("/(app)/")) return href
  if (href.startsWith("/(auth)/")) return href
  if (href.startsWith("/")) return `/(app)${href}`
  return `/(app)/${href}`
}

/** Strip expo group segments so `/(app)/dashboard` → `/dashboard`. */
export function normalizeRoutePathname(pathname: string): string {
  const normalized = pathname.replace(/^\/\([^)]+\)/, "")
  return normalized.length > 0 ? normalized : "/"
}

/** @deprecated Use normalizeRoutePathname */
export function normalizeAppPathname(pathname: string): string {
  return normalizeRoutePathname(pathname)
}

export function isFacultySetupRoute(pathname: string): boolean {
  return normalizeRoutePathname(pathname) === "/faculty-select-course"
}

/** Navigate to auth stack — always uses root router (safe from `(app)` screens). */
export function replaceAuthRoute(_router: Router, href: string) {
  rootRouter.replace(toAuthHref(href) as never)
}

/** Enter the main app stack after sign-in — always uses root router. */
export function resetToAppRoute(_router: Router, href: string) {
  rootRouter.replace(toAppHref(href) as never)
}

/** Route resolved after signing-in bootstrap (may stay in auth or enter app). */
export function navigatePostSignIn(_router: Router, href: string) {
  if (AUTH_ROUTES.has(href)) {
    replaceAuthRoute(_router, href)
    return
  }
  resetToAppRoute(_router, href)
}

/** @deprecated Prefer replaceAuthRoute or resetToAppRoute. */
export function resetToRoute(router: Router, href: string) {
  resetToAppRoute(router, href)
}

export function exitToAuthLogin() {
  rootRouter.replace("/(auth)/login" as never)
}
