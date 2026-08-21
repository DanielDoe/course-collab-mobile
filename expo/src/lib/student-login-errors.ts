/** User-facing copy for university / roster student login failures. */

export const STUDENT_LOGIN_NOT_FOUND_ERROR =
  "We couldn't find a roster account for that Student ID or email."

export const STUDENT_LOGIN_NOT_FOUND_HINT =
  "Use the Student ID from your syllabus (numbers work even if email sign-in fails). Confirm you selected the correct university. If you're on the roster but haven't signed in before, choose First time? Activate your account. Otherwise ask your instructor to verify your email is listed on the roster."

export function studentLoginNotFoundPayload() {
  return {
    error: STUDENT_LOGIN_NOT_FOUND_ERROR,
    lifecycle: "not_found" as const,
    requiresAccessRequest: true,
    message: STUDENT_LOGIN_NOT_FOUND_HINT,
  }
}

const MULTIPLE_ACCOUNTS_HINT =
  "If you used an email shared across courses, choose a course after signing in — or use your numeric Student ID from the syllabus for a direct login."

export function formatStudentLoginErrorMessage(body: {
  error?: string
  message?: string
  lifecycle?: string
}): string {
  const error = String(body.error ?? "Login failed").trim()
  const hint = typeof body.message === "string" ? body.message.trim() : ""
  if (body.lifecycle === "not_found") {
    return hint ? `${error}\n\n${hint}` : STUDENT_LOGIN_NOT_FOUND_HINT
  }
  if (/multiple accounts match/i.test(error)) {
    return hint && hint !== error ? `${error}\n\n${hint}` : `${error}\n\n${MULTIPLE_ACCOUNTS_HINT}`
  }
  if (hint && hint !== error) {
    return `${error}\n\n${hint}`
  }
  return error
}

export function formatStudentLoginApiError(error: string, details?: unknown): string {
  if (!details || typeof details !== "object") {
    return error
  }
  const body = details as Record<string, unknown>
  return formatStudentLoginErrorMessage({
    error,
    message: typeof body.message === "string" ? body.message : undefined,
    lifecycle: typeof body.lifecycle === "string" ? body.lifecycle : undefined,
  })
}
