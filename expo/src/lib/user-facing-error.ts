const RAW_RUNTIME_ERROR =
  /cannot read propert(?:y|ies) of undefined|undefined is not (?:an object|a function)|null is not an object|is not a function|json parse|unexpected token|syntaxerror|typeerror|referenceerror|foreign key|violates|sqlstate|internal server error/i

/**
 * Production UI must never surface raw JS / SQL / parse failures.
 * Technical detail stays available for logs via `presentApiError`.
 */
export function isRawRuntimeErrorMessage(message: string): boolean {
  return RAW_RUNTIME_ERROR.test(message.trim())
}

export function sanitizeUserFacingError(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message?: unknown }).message ?? "").trim()
    if (message && !isRawRuntimeErrorMessage(message)) return message
  }
  if (typeof err === "string") {
    const message = err.trim()
    if (message && !isRawRuntimeErrorMessage(message)) return message
  }
  return fallback
}
