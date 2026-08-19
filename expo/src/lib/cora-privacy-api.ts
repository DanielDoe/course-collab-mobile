import { API_BASE_URL } from "../constants"
import type { GuestSession, StudentSession, SummerSession } from "./session"

type CoraPrivacySession = StudentSession | SummerSession | GuestSession
import { mfaTrustRequestHeadersForStudent } from "./mfa-device-trust"
import { mergeCookieHeaders, studentHttpCookieHeader } from "./student-http-cookies"

/** Server-synced Cora privacy settings — mirrors v0-coursecollabv3/lib/cora/privacy/cora-privacy-settings.ts */
export type CoraServerPrivacySettings = {
  personalizedLearning: boolean
  useLearningContext: boolean
  shareWithInstructor: boolean
}

export const DEFAULT_CORA_SERVER_PRIVACY: CoraServerPrivacySettings = {
  personalizedLearning: true,
  useLearningContext: true,
  shareWithInstructor: false,
}

async function privacyHeaders(session: CoraPrivacySession): Promise<HeadersInit> {
  const base: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-student-id": session.databaseId,
  }
  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForStudent(session)
  return { ...base, ...mergeCookieHeaders(jarCookie, trust.Cookie) }
}

export async function fetchCoraServerPrivacy(
  session: CoraPrivacySession,
): Promise<CoraServerPrivacySettings> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cora/privacy`, {
      method: "GET",
      credentials: "include",
      headers: await privacyHeaders(session),
    })
    if (!response.ok) return DEFAULT_CORA_SERVER_PRIVACY
    const data = (await response.json()) as Partial<CoraServerPrivacySettings>
    return {
      personalizedLearning: data.personalizedLearning !== false,
      useLearningContext: data.useLearningContext !== false,
      shareWithInstructor: data.shareWithInstructor === true,
    }
  } catch {
    return DEFAULT_CORA_SERVER_PRIVACY
  }
}

export async function updateCoraServerPrivacy(
  session: CoraPrivacySession,
  patch: Partial<CoraServerPrivacySettings>,
): Promise<CoraServerPrivacySettings> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cora/privacy`, {
      method: "PUT",
      credentials: "include",
      headers: await privacyHeaders(session),
      body: JSON.stringify(patch),
    })
    if (!response.ok) return { ...DEFAULT_CORA_SERVER_PRIVACY, ...patch }
    const data = (await response.json()) as Partial<CoraServerPrivacySettings>
    return {
      personalizedLearning: data.personalizedLearning !== false,
      useLearningContext: data.useLearningContext !== false,
      shareWithInstructor: data.shareWithInstructor === true,
    }
  } catch {
    return { ...DEFAULT_CORA_SERVER_PRIVACY, ...patch }
  }
}
