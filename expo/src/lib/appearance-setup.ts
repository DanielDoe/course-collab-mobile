import * as SecureStore from "./secure-store-client"
import { getApiBaseUrl } from "../constants"
import type { StudentSession } from "./session"
import { studentAuthenticatedHeaders } from "./student-api"
import { normalizedStudentDatabaseId } from "./student-content-context"

/** Per-student flag: user explicitly picked appearance during onboarding. */
export function appearanceSetupStorageKey(studentDbId: string): string {
  return `cc_student_${String(studentDbId).trim()}_appearance_setup_v1`
}

function appearanceSetupStudentKey(session: StudentSession): string {
  return normalizedStudentDatabaseId(session) ?? session.id?.trim() ?? ""
}

/** Device-local onboarding gate — do not infer from server completion. */
export async function hasSessionCompletedAppearanceSetup(
  session: StudentSession,
): Promise<boolean> {
  const key = appearanceSetupStudentKey(session)
  if (!key) return false
  return hasStudentCompletedAppearanceSetup(key)
}

export async function hasStudentCompletedAppearanceSetup(
  studentDbId: string | null | undefined,
): Promise<boolean> {
  const id = String(studentDbId ?? "").trim()
  if (!id || id === "undefined") return false
  try {
    return (await SecureStore.getItemAsync(appearanceSetupStorageKey(id))) === "true"
  } catch {
    return false
  }
}

export async function markStudentAppearanceSetupComplete(studentDbId: string): Promise<void> {
  const id = String(studentDbId).trim()
  if (!id || id === "undefined") return
  try {
    await SecureStore.setItemAsync(appearanceSetupStorageKey(id), "true")
  } catch {
    /* ignore */
  }
}

async function appearanceSetupRequest(
  session: StudentSession,
  path: string,
  init?: RequestInit,
): Promise<{ completed?: boolean; success?: boolean }> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(await studentAuthenticatedHeaders(session)),
      ...(init?.headers ?? {}),
    },
  })
  let body: { completed?: boolean; success?: boolean; error?: string } = {}
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text) as typeof body
    } catch {
      body = {}
    }
  }
  if (!response.ok) {
    throw new Error(body.error || `Appearance setup request failed (${response.status})`)
  }
  return body
}

/** Load server-side completion and mirror into SecureStore for fast client checks. */
export async function syncAppearanceSetupFromServer(session: StudentSession): Promise<boolean> {
  const localKey = appearanceSetupStudentKey(session)
  if (localKey && (await hasStudentCompletedAppearanceSetup(localKey))) return true

  const databaseId = normalizedStudentDatabaseId(session)
  if (!databaseId) return false

  try {
    const data = await appearanceSetupRequest(
      session,
      `/api/student/appearance-setup?studentId=${encodeURIComponent(databaseId)}`,
    )
    if (data.completed) {
      await markStudentAppearanceSetupComplete(localKey || databaseId)
      return true
    }
  } catch {
    /* offline — fall back to local flag only */
  }
  return false
}

/** Persist completion on the account (server) and this device (SecureStore). */
export async function persistAppearanceSetupComplete(session: StudentSession): Promise<void> {
  const localKey = appearanceSetupStudentKey(session)
  if (localKey) {
    await markStudentAppearanceSetupComplete(localKey)
  }

  const databaseId = normalizedStudentDatabaseId(session)
  if (!databaseId) return

  try {
    await appearanceSetupRequest(session, "/api/student/appearance-setup", {
      method: "POST",
      body: JSON.stringify({ studentId: databaseId }),
    })
  } catch {
    /* local flag still prevents repeat prompts on this device */
  }
}

/** @deprecated Use resolvePostLoginRoute from onboarding.ts */
export async function resolveStudentPostLoginRoute(
  session: StudentSession,
): Promise<string> {
  const { resolvePostLoginRoute } = await import("./onboarding")
  return resolvePostLoginRoute(session)
}
