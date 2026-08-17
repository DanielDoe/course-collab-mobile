import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import { extractApiErrorMessage } from "./api-error-message"
import type { AppSession } from "./session"

export type EntitlementSnapshot = {
  role: "student" | "guest" | "instructor"
  accountId: number
  plan: string
  status: string
  source: "server"
  provider: "stripe" | "institutional" | "none"
  features: Record<string, unknown>
}

async function buildHeaders(session: AppSession): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (session.portal === "faculty") {
    headers["x-instructor-id"] = String(session.id)
    return headers
  }

  if (session.portal === "student" || session.portal === "guest" || session.portal === "summer") {
    headers["x-student-id"] = session.databaseId
    if (session.portal === "guest") {
      headers["x-account-role"] = "guest"
    }
  }

  return headers
}

function roleParam(session: AppSession): string {
  if (session.portal === "faculty") return "instructor"
  if (session.portal === "guest") return "guest"
  return "student"
}

/** Server-side entitlement read — never trust client subscription flags. */
export async function fetchServerEntitlements(session: AppSession): Promise<EntitlementSnapshot> {
  const role = roleParam(session)
  const url = `${API_BASE_URL}/api/account/entitlements?role=${encodeURIComponent(role)}`
  const response = await fetch(url, {
    credentials: "include",
    headers: await buildHeaders(session),
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
    throw new ApiError(extractApiErrorMessage(body, response.status, url), response.status, body)
  }

  return body as EntitlementSnapshot
}
