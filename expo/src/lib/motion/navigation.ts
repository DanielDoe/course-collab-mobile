import { NAV_GUARD_MS } from "./motion"

let lastAt = 0
let lastKey = ""

export function resetNavigationGuardForTests(): void {
  lastAt = 0
  lastKey = ""
}

/** Blocks a second push to the same destination while the first transition is in flight. */
export function shouldAcceptNavigation(
  key: string,
  cooldownMs = NAV_GUARD_MS,
  now = Date.now(),
): boolean {
  if (key === lastKey && now - lastAt < cooldownMs) return false
  lastAt = now
  lastKey = key
  return true
}

export function navigationKeyFromHref(href: unknown): string {
  if (typeof href === "string") return href
  if (href && typeof href === "object") {
    const record = href as { pathname?: string; params?: unknown }
    return `${record.pathname ?? ""}:${JSON.stringify(record.params ?? {})}`
  }
  return String(href)
}
