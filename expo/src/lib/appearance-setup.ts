import * as SecureStore from "./secure-store-client"
import { getApiBaseUrl } from "../constants"
import type { StudentSession } from "./session"

/** Per-student flag: user explicitly picked appearance during onboarding. */
export function appearanceSetupStorageKey(studentDbId: string): string {
  return `cc_student_${String(studentDbId).trim()}_appearance_setup_v1`
}

export async function hasStudentCompletedAppearanceSetup(
  studentDbId: string | null | undefined,
): Promise<boolean> {
  const id = String(studentDbId ?? "").trim()
  if (!id) return false
  try {
    return (await SecureStore.getItemAsync(appearanceSetupStorageKey(id))) === "true"
  } catch {
    return false
  }
}

export async function markStudentAppearanceSetupComplete(studentDbId: string): Promise<void> {
  const id = String(studentDbId).trim()
  if (!id) return
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
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-student-id": session.databaseId,
      ...init?.headers,
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
  const id = session.databaseId
  if (await hasStudentCompletedAppearanceSetup(id)) return true

  try {
    const data = await appearanceSetupRequest(
      session,
      `/api/student/appearance-setup?studentId=${encodeURIComponent(id)}`,
    )
    if (data.completed) {
      await markStudentAppearanceSetupComplete(id)
      return true
    }
  } catch {
    /* offline — fall back to local flag only */
  }
  return false
}

/** Persist completion on the account (server) and this device (SecureStore). */
export async function persistAppearanceSetupComplete(session: StudentSession): Promise<void> {
  await markStudentAppearanceSetupComplete(session.databaseId)
  try {
    await appearanceSetupRequest(session, "/api/student/appearance-setup", {
      method: "POST",
      body: JSON.stringify({ studentId: session.databaseId }),
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
