import { API_BASE_URL } from "../../../constants"
import type { AdminSession, FacultySession, StudentSession } from "../../session"
import { persistHttpCookiesFromResponse } from "../../student-http-cookies"
import { ApiError, studentAuthenticatedHeaders } from "../../student-api"
import { instructorAuthenticatedHeaders } from "../../instructor-api"
import { adminAuthenticatedHeaders } from "../../admin-session-headers"

export type CoraScopeFeedbackRole = "student" | "instructor" | "faculty" | "admin"

export type CoraScopeFeedbackResult = {
  ok: boolean
  related: boolean
  allowRetry: boolean
}

async function studentHeaders(session: StudentSession): Promise<HeadersInit> {
  return studentAuthenticatedHeaders(session)
}

/**
 * POST /api/cora/scope/feedback
 * When related=true + allowRetry, client should resend with confirmScopeRelated=true.
 */
export async function submitCoraScopeFeedback(args: {
  role: CoraScopeFeedbackRole
  session: StudentSession | FacultySession | AdminSession
  related: boolean
  eventId?: number | null
  note?: string | null
}): Promise<CoraScopeFeedbackResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  }
  if (args.role === "student") {
    Object.assign(headers, await studentHeaders(args.session as StudentSession))
  } else if (args.role === "instructor" || args.role === "faculty") {
    Object.assign(
      headers,
      await instructorAuthenticatedHeaders({ instructorId: (args.session as FacultySession).id }),
    )
  } else {
    Object.assign(headers, await adminAuthenticatedHeaders((args.session as AdminSession).id))
  }

  const apiRole =
    args.role === "faculty" || args.role === "instructor"
      ? "instructor"
      : args.role === "admin"
        ? "admin"
        : "student"

  const url = `${API_BASE_URL}/api/cora/scope/feedback`
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      related: args.related,
      eventId: args.eventId ?? undefined,
      note: args.note?.trim() || undefined,
      role: apiRole,
    }),
  })

  let body: unknown = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status, body)
  }
  await persistHttpCookiesFromResponse(url, response.headers)
  const data = (body ?? {}) as Partial<CoraScopeFeedbackResult>
  return {
    ok: data.ok !== false,
    related: Boolean(data.related ?? args.related),
    allowRetry: Boolean(data.allowRetry ?? args.related),
  }
}
