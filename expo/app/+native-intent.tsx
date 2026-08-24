/**
 * Normalize custom-scheme and HTTPS deep links for Expo Router.
 * Incoming links are untrusted: only CourseCollab schemes/hosts are accepted.
 */
import { isAllowedDeepLinkHost } from "../src/lib/trusted-origins"

const CUSTOM_SCHEMES = ["coursecollab://", "com.coursecollab.app://"]

/** Expo dev-client launch links carry the Metro URL in `?url=` — not an app route. */
function isExpoDevelopmentClientPath(path: string): boolean {
  return /expo-development-client(?:\/|\?|$)/i.test(path)
}

export function redirectSystemPath({
  path,
}: {
  path: string
  initial: boolean
}): string {
  if (!path) return "/"
  if (/^(javascript|data|file|blob|vbsscript):/i.test(path)) return "/"
  if (isExpoDevelopmentClientPath(path)) return "/"

  if (path.startsWith("/")) {
    return hardenInboundPath(path)
  }

  for (const scheme of CUSTOM_SCHEMES) {
    if (path.startsWith(scheme)) {
      const withoutScheme = path.slice(scheme.length)
      if (isExpoDevelopmentClientPath(withoutScheme)) return "/"
      const route = withoutScheme.replace(/^\/+/, "")
      return hardenInboundPath(route ? `/${route}` : "/")
    }
  }

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path)
      if (url.protocol !== "https:" && url.protocol !== "http:") return "/"
      if (!isAllowedDeepLinkHost(url.hostname)) return "/"
      const next = `${url.pathname || "/"}${url.search}`
      return hardenInboundPath(next.startsWith("/") ? next : `/${next}`)
    } catch {
      return "/"
    }
  }

  return "/"
}

function hardenInboundPath(path: string): string {
  return downgradeExternalAssessmentRetake(aliasFacultyCoraPath(path))
}

/**
 * `action=retake` force-restarts the attempt server-side, which finalizes (submits)
 * any attempt already in progress. Only the in-app retake button — which never routes
 * through this handler — may request it; an inbound link is downgraded to a resume so a
 * crafted `coursecollab://assessment/take/<id>?action=retake` cannot submit a student's
 * live attempt out from under them.
 */
function downgradeExternalAssessmentRetake(path: string): string {
  if (!path || !path.includes("action=retake")) return path
  const bare = path.split("?")[0] ?? ""
  if (!/^\/assessment\/take\/[^/]+$/.test(bare)) return path
  return path.replace(/([?&]action=)retake\b/g, "$1continue")
}

/** Friendly / legacy Faculty Cora deep links → module route. */
function aliasFacultyCoraPath(path: string): string {
  const bare = path.split("?")[0]?.replace(/\/+$/, "") || path
  if (
    bare === "/faculty/cora" ||
    bare === "/faculty-cora" ||
    bare === "/cora-copilot" ||
    bare === "/ai-copilot"
  ) {
    const qs = path.includes("?") ? path.slice(path.indexOf("?")) : ""
    return `/module/cora${qs}`
  }
  return path
}
