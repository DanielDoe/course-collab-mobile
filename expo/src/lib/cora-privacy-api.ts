import { API_BASE_URL } from "../constants"
import { instructorAuthenticatedHeaders } from "./instructor-api"
import { studentAuthenticatedHeaders } from "./student-api"
import { adminAuthenticatedHeaders } from "./admin-session-headers"
import type {
  AdminSession,
  FacultySession,
  GuestSession,
  StudentSession,
  SummerSession,
} from "./session"

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

export type CoraPrivacyActorType = "student" | "instructor" | "admin"

export type CoraPrivacySession =
  | StudentSession
  | SummerSession
  | GuestSession
  | FacultySession
  | AdminSession

export function coraPrivacyStorageKey(session: CoraPrivacySession): string {
  if (session.portal === "faculty") return `instructor-${session.id}`
  if (session.portal === "admin") return `admin-${session.id}`
  return session.databaseId
}

export function coraPrivacyVariant(session: CoraPrivacySession): "learner" | "faculty" | "admin" {
  if (session.portal === "faculty") return "faculty"
  if (session.portal === "admin") return "admin"
  return "learner"
}

function normalizeServerPrivacy(data: Partial<CoraServerPrivacySettings>): CoraServerPrivacySettings {
  return {
    personalizedLearning: data.personalizedLearning !== false,
    useLearningContext: data.useLearningContext !== false,
    shareWithInstructor: data.shareWithInstructor === true,
  }
}

async function privacyHeaders(session: CoraPrivacySession): Promise<HeadersInit> {
  const base: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  }

  if (session.portal === "faculty") {
    const headers = await instructorAuthenticatedHeaders(
      { instructorId: session.id },
      { omitCourseId: true },
    )
    return { ...base, ...headers }
  }

  if (session.portal === "admin") {
    return {
      ...base,
      ...(await adminAuthenticatedHeaders(session.id)),
    }
  }

  return {
    ...base,
    ...(await studentAuthenticatedHeaders(session)),
  }
}

export async function fetchCoraServerPrivacy(session: CoraPrivacySession): Promise<CoraServerPrivacySettings> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cora/privacy`, {
      method: "GET",
      credentials: "include",
      headers: await privacyHeaders(session),
    })
    if (!response.ok) return DEFAULT_CORA_SERVER_PRIVACY
    const data = (await response.json()) as Partial<CoraServerPrivacySettings>
    return normalizeServerPrivacy(data)
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
    return normalizeServerPrivacy(data)
  } catch {
    return { ...DEFAULT_CORA_SERVER_PRIVACY, ...patch }
  }
}

/** @deprecated Use CoraPrivacySession */
export type { CoraPrivacySession as LegacyStudentCoraPrivacySession }
