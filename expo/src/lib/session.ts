import * as SecureStore from "./secure-store-client"
import type { LoginPortal } from "../constants/portals"
import { readRememberedFacultyUniversity } from "./remembered-faculty-auth"
import { readRememberedUniversity } from "./remembered-student-auth"
import { resolveSessionDurationMs } from "./session-duration"
import { normalizedStudentDatabaseId } from "./student-content-context"
import { getStoredStudentSection } from "./student-course-storage"

const SESSION_KEY = "appSession"

type BaseSession = {
  portal: LoginPortal
  expiresAt: number
  rememberMe?: boolean
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
  /** Fall 2026+ offerings are term-scoped on production. */
  academicTermId?: number
  universityId?: number
  universityName?: string
  universityShortName?: string
  /** First-login gate: must set a new password before dashboard. */
  requiresPasswordChange?: boolean
}

/** Platform guest (recommendation letters, Cora Career, etc.). */
export type GuestSession = BaseSession & {
  portal: "guest"
  id: string
  name: string
  databaseId: string
  /** Guest email when returned from login/profile — used for checkout + MFA trust. */
  email?: string
  /** Identifier typed at login — used for MFA device trust lookup. */
  authIdentifier?: string
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
  /** First-login gate: must set a new password before dashboard. */
  requiresPasswordChange?: boolean
  /** Campus chosen at faculty sign-in (dual employment). */
  universityId?: number
  universityName?: string
  universityShortName?: string
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

export type SignInPayload = (
  | Omit<StudentSession, "expiresAt">
  | Omit<GuestSession, "expiresAt">
  | Omit<SummerSession, "expiresAt">
  | Omit<FacultySession, "expiresAt">
  | Omit<AdminSession, "expiresAt">
) & {
  rememberMe?: boolean
  sessionExpiresIn?: number
}

export function isSessionValid(session: AppSession | null | undefined): session is AppSession {
  return Boolean(session && Date.now() < session.expiresAt)
}

export async function getStoredSession(): Promise<AppSession | null> {
  try {
    const { hasExplicitSignOut } = await import("./signed-out-flag")
    if (await hasExplicitSignOut()) {
      await SecureStore.deleteItemAsync(SESSION_KEY)
      return null
    }
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
    if (parsed.portal === "faculty" && parsed.universityId == null) {
      const university = await readRememberedFacultyUniversity()
      if (university?.id) {
        parsed.universityId = university.id
        parsed.universityName = parsed.universityName ?? university.name
        parsed.universityShortName = parsed.universityShortName ?? university.short_name
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(parsed))
      }
    }
    if (parsed.portal === "student") {
      const databaseId = normalizedStudentDatabaseId(parsed)
      if (!databaseId && parsed.databaseId != null) {
        delete (parsed as Partial<StudentSession>).databaseId
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(parsed))
      } else if (databaseId && parsed.databaseId !== databaseId) {
        parsed.databaseId = databaseId
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(parsed))
      }
      if (
        !parsed.section?.trim() &&
        databaseId &&
        parsed.courseId != null &&
        Number.isFinite(parsed.courseId)
      ) {
        const storedSection = await getStoredStudentSection(databaseId, parsed.courseId)
        if (storedSection) {
          parsed.section = storedSection
          await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(parsed))
        }
      }
    }
    return parsed
  } catch {
    return null
  }
}

export async function saveSession(data: SignInPayload): Promise<AppSession> {
  const { sessionExpiresIn, ...rest } = data
  const session = {
    ...rest,
    expiresAt: Date.now() + resolveSessionDurationMs({ rememberMe: data.rememberMe, sessionExpiresIn }),
  } as AppSession
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
  return session
}

export async function clearStoredSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY)
  const lingering = await SecureStore.getItemAsync(SESSION_KEY)
  if (lingering != null) {
    await SecureStore.deleteItemAsync(SESSION_KEY)
  }
}

export async function refreshStoredSession(): Promise<AppSession | null> {
  const current = await getStoredSession()
  if (!current) return null
  const { expiresAt: _, ...rest } = current
  return saveSession(rest)
}

export type SessionPatch = {
  name?: string
  email?: string
  courseId?: number
  courseCode?: string
  courseTitle?: string
  section?: string
  academicTermId?: number
  /** Bound `students.id` after an in-session course switch. */
  databaseId?: string
}

export async function patchStoredSession(patch: SessionPatch): Promise<AppSession | null> {
  const current = await getStoredSession()
  if (!current) return null

  const definedPatch = Object.fromEntries(
    Object.entries(patch).filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== undefined),
  ) as SessionPatch
  if (
    current.portal === "student" &&
    definedPatch.section === "" &&
    "section" in current &&
    current.section?.trim()
  ) {
    delete definedPatch.section
  }
  const next = { ...current, ...definedPatch } as AppSession
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(next))
  return next
}

/** Learner portals share student-like dashboard patterns. */
export function isLearnerPortal(portal: LoginPortal): boolean {
  return portal === "student" || portal === "guest" || portal === "summer"
}
