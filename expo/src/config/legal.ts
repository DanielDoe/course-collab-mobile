import { resolveApiBaseUrl } from "./api"

/** Legal pages are served by the CourseCollab API origin (same host as mobile API calls). */
export function getLegalUrls() {
  const base = resolveApiBaseUrl()
  return {
    privacyPolicy: `${base}/legal/privacy-policy`,
    termsOfService: `${base}/legal/terms-of-service`,
    aiAndData: `${base}/ai-and-data`,
    support: `${base}/support`,
    appStoreSupport: `${base}/support`,
  } as const
}

/** @deprecated Use getLegalUrls() for runtime resolution. */
export const LEGAL_URLS = getLegalUrls()

export const ACCOUNT_DELETION_CONFIRM_PHRASE = "DELETE"

/** Unified server deletion route (also accepts role-specific alias paths). */
export const ACCOUNT_DELETION_API_PATH = "/api/account/delete"

export type AccountDeletionKind = "student" | "guest" | "instructor"

export function accountDeletionKindForPortal(
  portal: "student" | "guest" | "summer" | "faculty",
): AccountDeletionKind {
  if (portal === "guest") return "guest"
  if (portal === "faculty") return "instructor"
  return "student"
}
