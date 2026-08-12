import * as SecureStore from "expo-secure-store"
import { SESSION_DURATION_MS } from "../constants"
import type { LoginPortal } from "../constants/portals"
import { readRememberedUniversity } from "./remembered-student-auth"

const SESSION_KEY = "appSession"

type BaseSession = {
  portal: LoginPortal
  expiresAt: number
}

/** University-authenticated student (regular enrollment). */
export type StudentSession = BaseSession & {
  portal: "student"
  id: string
  name: string
  section: string
  databaseId: string
  /** Identifier typed at login (email or student ID) — used for MFA device trust lookup. */
  authIdentifier?: string
  /** University email when returned from login — secondary MFA trust alias. */
  email?: string
  courseId?: number
  courseCode?: string
  courseTitle?: string
  universityId?: number
  universityName?: string
  universityShortName?: string
}

/** Platform guest (recommendation letters, etc.). */
export type GuestSession = BaseSession & {
  portal: "guest"
  id: string
  name: string
  databaseId: string
  guestAccessPurpose: "recommendation_letter" | "other"
}

/** Summer camp / summer program student. */
export type SummerSession = BaseSession & {
  portal: "summer"
  id: string
  name: string
  databaseId: string
  email?: string
  studentProgramRole?: string
}

export type FacultySession = BaseSession & {
  portal: "faculty"
  id: number
  username: string
  name: string
  email?: string
  role?: string
  /** Username or email typed at login — used for MFA device trust lookup. */
  authIdentifier?: string
}

export type AdminSession = BaseSession & {
  portal: "admin"
  id: string
  username: string
  name: string
  platformRole?: string
}

export type AppSession =
  | StudentSession
  | GuestSession
  | SummerSession
  | FacultySession
  | AdminSession

export type SignInPayload =
  | Omit<StudentSession, "expiresAt">
  | Omit<GuestSession, "expiresAt">
  | Omit<SummerSession, "expiresAt">
  | Omit<FacultySession, "expiresAt">
  | Omit<AdminSession, "expiresAt">

export function isSessionValid(session: AppSession | null | undefined): session is AppSession {
  return Boolean(session && Date.now() < session.expiresAt)
}

export async function getStoredSession(): Promise<AppSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppSession
    if (parsed.portal === "faculty" && typeof parsed.id !== "number") {
      const id = Number(parsed.id)
      if (Number.isFinite(id) && id > 0) {
        ;(parsed as FacultySession).id = id
      }
    }
    if (!isSessionValid(parsed)) {
      await SecureStore.deleteItemAsync(SESSION_KEY)
      return null
    }
    if (parsed.portal === "student" && parsed.universityId == null) {
      const university = await readRememberedUniversity()
      if (university?.id) {
        parsed.universityId = university.id
        parsed.universityName = parsed.universityName ?? university.name
        parsed.universityShortName = parsed.universityShortName ?? university.short_name
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(parsed))
      }
    }
    return parsed
  } catch {
    return null
  }
}

export async function saveSession(data: SignInPayload): Promise<AppSession> {
  const session = { ...data, expiresAt: Date.now() + SESSION_DURATION_MS } as AppSession
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
  return session
}

export async function clearStoredSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}

export async function refreshStoredSession(): Promise<AppSession | null> {
  const current = await getStoredSession()
  if (!current) return null
  const { expiresAt: _, ...rest } = current
  return saveSession(rest)
}

/** Learner portals share student-like dashboard patterns. */
export function isLearnerPortal(portal: LoginPortal): boolean {
  return portal === "student" || portal === "guest" || portal === "summer"
}
