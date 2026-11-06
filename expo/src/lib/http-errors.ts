/** Shared API error text cleanup — never surface HTML error pages in native UI. */
export function sanitizeApiErrorText(text: string, status: number): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return status >= 500
      ? `Server error (${status}). Please try again later.`
      : `Request failed (${status}).`
  }
  if (
    /postgresql|psql|sqlite|mongodb|traceback \(most recent|at \S+\.(ts|js|py):\d+|\/api\/(admin|internal)\//i.test(
      trimmed,
    )
  ) {
    return "I couldn't complete that action. Please try again or contact support."
  }
  if (trimmed.includes("<!DOCTYPE") || trimmed.includes("<html")) {
    if (status === 404) {
      return "This feature is not available on the server yet. Try again after the next app update."
    }
    return status >= 500
      ? `Server error (${status}). The server returned an error page.`
      : `Request failed (${status}). Please try again.`
  }
  return trimmed.length > 220 ? `${trimmed.slice(0, 220)}…` : trimmed
}

export function apiErrorMessage(body: unknown, status: number, fallback?: string): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return sanitizeApiErrorText((body as { error: string }).error, status)
  }
  return fallback ?? sanitizeApiErrorText("", status)
}

export function isApiRouteMissingError(status: number, message: string): boolean {
  return status === 404 || message.includes("not available on the server yet")
}
