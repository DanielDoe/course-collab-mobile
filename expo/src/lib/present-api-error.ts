import { getApiBaseUrl } from "../constants"
import { ApiError } from "./api"
import { isRawRuntimeErrorMessage, sanitizeUserFacingError } from "./user-facing-error"

export type ApiErrorKind = "network" | "server" | "client" | "unknown"

export type ApiErrorPresentation = {
  kind: ApiErrorKind
  title: string
  message: string
  status?: number
  detail?: string
  retryable: boolean
}

type PresentOptions = {
  /** Short label for the feature, e.g. "Messages" or "Login". */
  feature?: string
  fallbackMessage?: string
}

function buildApiErrorDetail(err: ApiError): string | undefined {
  const parts = [err.message]
  if (err.details != null) {
    try {
      parts.push(typeof err.details === "string" ? err.details : JSON.stringify(err.details, null, 2))
    } catch {
      parts.push(String(err.details))
    }
  }
  if (__DEV__) parts.push(`API: ${getApiBaseUrl()}`)
  return parts.filter(Boolean).join("\n\n")
}

export function presentApiError(err: unknown, options: PresentOptions = {}): ApiErrorPresentation {
  const feature = options.feature ?? "This page"
  const fallback = options.fallbackMessage ?? "Something went wrong. Please try again."

  if (err instanceof ApiError) {
    if (err.status === 0 || err.status === 408) {
      return {
        kind: "network",
        title: "Can't reach CourseCollab",
        message: `${feature} couldn't connect. Check Wi‑Fi or cellular data, then try again.`,
        status: err.status || undefined,
        detail: buildApiErrorDetail(err),
        retryable: true,
      }
    }

    if (err.status >= 500) {
      return {
        kind: "server",
        title: `${feature} unavailable`,
        message:
          "CourseCollab's servers returned an error. Your connection is fine — this needs to be fixed on our backend.",
        status: err.status,
        detail: buildApiErrorDetail(err),
        retryable: true,
      }
    }

    if (err.status === 401) {
      return {
        kind: "client",
        title: "Session expired",
        message: "Your CourseCollab session expired. Sign in again to continue.",
        status: err.status,
        detail: buildApiErrorDetail(err),
        retryable: false,
      }
    }

    if (err.status === 403) {
      return {
        kind: "client",
        title: "Access denied",
        message: err.message || "You don't have permission to view this content.",
        status: err.status,
        detail: buildApiErrorDetail(err),
        retryable: false,
      }
    }

    if (err.status === 404) {
      return {
        kind: "client",
        title: `${feature} not found`,
        message: err.message || "This item is no longer available.",
        status: err.status,
        detail: buildApiErrorDetail(err),
        retryable: false,
      }
    }

    if (err.status === 409) {
      return {
        kind: "client",
        title: "Already updated",
        message: err.message || "This action was already completed. Refresh and try again if needed.",
        status: err.status,
        detail: buildApiErrorDetail(err),
        retryable: true,
      }
    }

    if (err.status === 422) {
      return {
        kind: "client",
        title: "Check your input",
        message: sanitizeUserFacingError(err.message, fallback),
        status: err.status,
        detail: buildApiErrorDetail(err),
        retryable: false,
      }
    }

    if (err.status === 429) {
      return {
        kind: "client",
        title: "Too many requests",
        message: "CourseCollab is rate-limiting this action. Wait a moment, then try again.",
        status: err.status,
        detail: buildApiErrorDetail(err),
        retryable: true,
      }
    }

    return {
      kind: "client",
      title: `${feature} couldn't load`,
      message: sanitizeUserFacingError(err.message, fallback),
      status: err.status,
      detail: buildApiErrorDetail(err),
      retryable: true,
    }
  }

  if (err instanceof Error && err.message) {
    return {
      kind: "unknown",
      title: `${feature} couldn't load`,
      message: sanitizeUserFacingError(err.message, fallback),
      detail: __DEV__
        ? `${isRawRuntimeErrorMessage(err.message) ? err.message + "\n\n" : ""}API: ${getApiBaseUrl()}`
        : undefined,
      retryable: true,
    }
  }

  return {
    kind: "unknown",
    title: `${feature} couldn't load`,
    message: fallback,
    detail: __DEV__ ? `API: ${getApiBaseUrl()}` : undefined,
    retryable: true,
  }
}
