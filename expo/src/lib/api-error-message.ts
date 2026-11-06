function isHtmlPayload(value: string): boolean {
  const trimmed = value.trimStart().toLowerCase()
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")
}

/** Parse API error bodies without surfacing raw HTML 404 pages in the UI. */
export function extractApiErrorMessage(body: unknown, status: number, path?: string): string {
  if (typeof body === "object" && body !== null) {
    for (const key of ["error", "message"] as const) {
      const value = (body as Record<string, unknown>)[key]
      if (typeof value === "string" && value.trim() && !isHtmlPayload(value)) {
        if (/cannot read propert|undefined is not|sqlstate|foreign key/i.test(value)) {
          return `Request failed (${status})`
        }
        return value
      }
    }
  }

  if (status === 404 && path?.includes("mobile-payment")) {
    return "Native checkout is not available on this server yet."
  }

  return `Request failed (${status})`
}

export function isNativeMembershipPaymentUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const status = "status" in error ? Number((error as { status: unknown }).status) : NaN
  return status === 404 || status === 503
}
