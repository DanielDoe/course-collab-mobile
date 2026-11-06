import { API_BASE_URL } from "../constants"
import {
  ACCOUNT_DELETION_API_PATH,
  ACCOUNT_DELETION_CONFIRM_PHRASE,
  accountDeletionKindForPortal,
} from "../config/legal"
import { ApiError } from "./api"
import { extractApiErrorMessage } from "./api-error-message"
import { persistHttpCookiesFromResponse } from "./student-http-cookies"
import type { AppSession } from "./session"
import { studentAuthenticatedHeaders } from "./student-api"
import { instructorAuthenticatedHeaders } from "./instructor-api"
import { assertProductionHttpsUrl, createApiAbortSignal, noteApiFailure } from "./http"

export type AccountDeletionRequest = {
  password: string
  confirmPhrase: typeof ACCOUNT_DELETION_CONFIRM_PHRASE
  reason?: string
}

export type AccountDeletionResult = {
  success: boolean
  message?: string
  anonymized?: boolean
  retainedRecords?: string[]
}

async function buildHeaders(session: AppSession): Promise<Record<string, string>> {
  if (session.portal === "student" || session.portal === "guest" || session.portal === "summer") {
    return studentAuthenticatedHeaders(session)
  }
  if (session.portal === "faculty") {
    return instructorAuthenticatedHeaders({ instructorId: session.id })
  }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
  }
}

export function canDeleteAccount(
  session: AppSession | null,
): session is AppSession & { portal: "student" | "guest" | "summer" | "faculty" } {
  if (!session) return false
  return (
    session.portal === "student" ||
    session.portal === "guest" ||
    session.portal === "summer" ||
    session.portal === "faculty"
  )
}

export async function requestAccountDeletion(
  session: AppSession,
  request: AccountDeletionRequest,
): Promise<AccountDeletionResult> {
  if (!canDeleteAccount(session)) {
    throw new ApiError("Account deletion is not available for this account type.", 400)
  }

  if (request.confirmPhrase !== ACCOUNT_DELETION_CONFIRM_PHRASE) {
    throw new ApiError(`Type ${ACCOUNT_DELETION_CONFIRM_PHRASE} to confirm account deletion.`, 400)
  }

  const accountKind = accountDeletionKindForPortal(session.portal)
  const url = `${API_BASE_URL}${ACCOUNT_DELETION_API_PATH}`
  assertProductionHttpsUrl(url)
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    signal: createApiAbortSignal(),
    headers: await buildHeaders(session),
    body: JSON.stringify({
      accountKind,
      confirm: true,
      confirmPhrase: request.confirmPhrase,
      password: request.password,
      reason: request.reason?.trim() || undefined,
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

  await persistHttpCookiesFromResponse(url, response.headers)

  if (!response.ok) {
    const message = extractApiErrorMessage(body, response.status, ACCOUNT_DELETION_API_PATH)
    noteApiFailure(ACCOUNT_DELETION_API_PATH, response.status, message)
    throw new ApiError(message, response.status, body)
  }

  const record = (body ?? {}) as Record<string, unknown>
  const retained = Array.isArray(record.retainedRecords)
    ? record.retainedRecords.filter((item): item is string => typeof item === "string")
    : Array.isArray(record.retained)
      ? record.retained.filter((item): item is string => typeof item === "string")
      : undefined

  const denied = record.ok === false || record.success === false
  return {
    success: !denied,
    message:
      typeof record.message === "string"
        ? record.message
        : "Your account deletion request was processed.",
    anonymized: record.anonymized === true || (Array.isArray(record.anonymized) && record.anonymized.length > 0),
    retainedRecords: retained,
  }
}
