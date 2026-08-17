import * as SecureStore from "expo-secure-store"
import type { StudentSession, FacultySession } from "./session"
import { studentHttpCookieHeader } from "./student-http-cookies"
import type { MfaUserType } from "./mfa-types"

const STORE_KEY = "mfaDeviceTrustRecords"
/** Fallback when the API sets `cc_mfa_trust` via Set-Cookie but omits JSON expiry fields. */
const DEFAULT_TRUST_MS = 7 * 24 * 60 * 60 * 1000
/** Sent alongside Cookie — React Native fetch often does not forward custom Cookie headers reliably. */
export const MFA_TRUST_HEADER = "X-CC-MFA-Trust"

export type MfaDeviceTrustRecord = {
  userType: MfaUserType
  loginKey: string
  token: string
  expiresAt: string
}

export function studentMfaLoginKey(universityId: number, identifier: string): string {
  return `student:${universityId}:${identifier.trim().toLowerCase()}`
}

export function studentMfaAliasKeys(
  universityId: number,
  authIdentifier: string,
  student?: { student_id?: string; email?: string | null },
): string[] {
  const keys = new Set<string>()
  const add = (value?: string | null) => {
    const trimmed = value?.trim()
    if (trimmed) keys.add(studentMfaLoginKey(universityId, trimmed))
  }
  add(authIdentifier)
  add(student?.student_id)
  add(student?.email)
  return [...keys]
}

export function instructorMfaLoginKey(username: string): string {
  return `instructor:${username.trim().toLowerCase()}`
}

export function instructorMfaAliasKeys(
  authIdentifier: string,
  instructor?: { username?: string; email?: string | null },
): string[] {
  const keys = new Set<string>()
  const add = (value?: string | null) => {
    const trimmed = value?.trim()
    if (trimmed) keys.add(instructorMfaLoginKey(trimmed))
  }
  add(authIdentifier)
  add(instructor?.username)
  add(instructor?.email)
  return [...keys]
}

/** Login identifier used at sign-in — falls back to session username or email. */
export function resolveInstructorMfaLoginKey(
  session: Pick<FacultySession, "username" | "email" | "authIdentifier">,
): string | null {
  const identifier = (session.authIdentifier ?? session.email ?? session.username).trim()
  if (!identifier) return null
  return instructorMfaLoginKey(identifier)
}

/** Login identifier used at sign-in (email or student ID) — falls back to session.id. */
export function resolveStudentMfaLoginKey(
  session: Pick<StudentSession, "universityId" | "id" | "authIdentifier" | "email">,
): string | null {
  if (session.universityId == null) return null
  const identifier = (session.authIdentifier ?? session.email ?? session.id).trim()
  if (!identifier) return null
  return studentMfaLoginKey(session.universityId, identifier)
}

export function resolveStudentMfaLoginKeys(
  session: Pick<StudentSession, "universityId" | "id" | "authIdentifier" | "email">,
): string[] {
  if (session.universityId == null) return []
  const authId = (session.authIdentifier ?? session.email ?? session.id).trim()
  if (!authId) return []
  return studentMfaAliasKeys(session.universityId, authId, {
    student_id: session.id,
    email: session.email,
  })
}

function userTypeFromLoginKey(loginKey: string): MfaUserType {
  if (loginKey.startsWith("instructor:")) return "instructor"
  if (loginKey.startsWith("admin:")) return "admin"
  return "student"
}

function readTrustFields(
  payload: Record<string, unknown>,
): { token: string; expiresAt: string } | null {
  const token =
    (typeof payload.mfaDeviceTrustToken === "string" && payload.mfaDeviceTrustToken.trim()) ||
    (typeof payload.mfa_device_trust_token === "string" && payload.mfa_device_trust_token.trim()) ||
    ""

  const expiresAt =
    (typeof payload.mfaDeviceTrustExpiresAt === "string" && payload.mfaDeviceTrustExpiresAt) ||
    (typeof payload.mfa_device_trust_expires_at === "string" && payload.mfa_device_trust_expires_at) ||
    ""

  if (!token || !expiresAt) return null
  if (new Date(expiresAt).getTime() <= Date.now()) return null
  return { token, expiresAt }
}

async function readMfaTrustTokenFromJar(): Promise<string | null> {
  const jarHeader = await studentHttpCookieHeader()
  if (!jarHeader) return null
  const match = jarHeader.match(/(?:^|;\s*)cc_mfa_trust=([^;]+)/i)
  const token = match?.[1]?.trim()
  return token || null
}

async function readAll(): Promise<MfaDeviceTrustRecord[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is MfaDeviceTrustRecord =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as MfaDeviceTrustRecord).loginKey === "string" &&
        typeof (entry as MfaDeviceTrustRecord).token === "string" &&
        typeof (entry as MfaDeviceTrustRecord).expiresAt === "string",
    )
  } catch {
    return []
  }
}

async function writeAll(records: MfaDeviceTrustRecord[]): Promise<void> {
  if (records.length === 0) {
    await SecureStore.deleteItemAsync(STORE_KEY)
    return
  }
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(records))
}

function isActive(record: MfaDeviceTrustRecord): boolean {
  return new Date(record.expiresAt).getTime() > Date.now()
}

export async function getMfaDeviceTrust(loginKey: string): Promise<MfaDeviceTrustRecord | null> {
  const records = await readAll()
  const match = records.find((entry) => entry.loginKey === loginKey && isActive(entry))
  return match ?? null
}

async function findActiveMfaTrust(loginKeys: string[]): Promise<MfaDeviceTrustRecord | null> {
  for (const loginKey of loginKeys) {
    const trust = await getMfaDeviceTrust(loginKey)
    if (trust) return trust
  }
  return null
}

export async function saveMfaDeviceTrust(record: MfaDeviceTrustRecord): Promise<void> {
  const records = (await readAll()).filter(
    (entry) => entry.loginKey !== record.loginKey || !isActive(entry),
  )
  records.push(record)
  await writeAll(records)
}

/** Copy an active trust record to additional login keys (e.g. email vs username). */
export async function aliasMfaDeviceTrust(fromKey: string, toKey: string): Promise<void> {
  if (fromKey === toKey) return
  const source = await getMfaDeviceTrust(fromKey)
  if (!source) return
  await saveMfaDeviceTrust({ ...source, loginKey: toKey })
}

async function aliasMfaDeviceTrustRecords(
  trust: MfaDeviceTrustRecord,
  aliasKeys: string[],
): Promise<void> {
  for (const key of aliasKeys) {
    if (key !== trust.loginKey) {
      await saveMfaDeviceTrust({ ...trust, loginKey: key })
    }
  }
}

export async function clearMfaDeviceTrust(loginKey?: string): Promise<void> {
  if (!loginKey) {
    await writeAll([])
    return
  }
  const records = (await readAll()).filter((entry) => entry.loginKey !== loginKey)
  await writeAll(records)
}

async function buildMergedMfaTrustCookie(token: string): Promise<Record<string, string>> {
  const jarCookie = await studentHttpCookieHeader()
  const trustPart = `cc_mfa_trust=${token}`
  if (!jarCookie) {
    return { Cookie: trustPart, [MFA_TRUST_HEADER]: token }
  }
  const jarWithoutTrust = jarCookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !/^cc_mfa_trust=/i.test(part))
    .join("; ")
  const merged = [trustPart, jarWithoutTrust].filter(Boolean).join("; ")
  return {
    Cookie: merged || trustPart,
    [MFA_TRUST_HEADER]: token,
  }
}

async function ensureTrustFromJar(
  loginKey: string,
  aliasKeys: string[],
  userType: MfaUserType,
): Promise<MfaDeviceTrustRecord | null> {
  const jarToken = await readMfaTrustTokenFromJar()
  if (!jarToken) return null
  const trust: MfaDeviceTrustRecord = {
    userType,
    loginKey,
    token: jarToken,
    expiresAt: new Date(Date.now() + DEFAULT_TRUST_MS).toISOString(),
  }
  await saveMfaDeviceTrust(trust)
  if (aliasKeys.length > 0) {
    await aliasMfaDeviceTrustRecords(trust, aliasKeys)
  }
  return trust
}

export async function mfaTrustRequestHeaders(loginKey: string): Promise<Record<string, string>> {
  let trust = await getMfaDeviceTrust(loginKey)
  if (!trust) {
    trust = await ensureTrustFromJar(loginKey, [loginKey], userTypeFromLoginKey(loginKey))
  }
  if (!trust) return {}
  return buildMergedMfaTrustCookie(trust.token)
}

/** Cookie header for student login — tries student ID, email, and other aliased keys. */
export async function mfaLoginCookieHeadersForStudent(
  universityId: number,
  authIdentifier: string,
  student?: { student_id?: string; email?: string | null },
): Promise<Record<string, string>> {
  const keys = studentMfaAliasKeys(universityId, authIdentifier, student)
  let trust = await findActiveMfaTrust(keys)
  if (!trust && keys[0]) {
    trust = await ensureTrustFromJar(keys[0], keys, "student")
  }
  if (!trust) {
    return keys[0] ? mfaLoginCookieHeaders(keys[0]) : {}
  }
  return buildMergedMfaTrustCookie(trust.token)
}

/** Trust cookie for authenticated student API calls — checks all aliased login keys. */
export async function mfaTrustRequestHeadersForStudent(
  session: Pick<StudentSession, "universityId" | "id" | "authIdentifier" | "email">,
): Promise<Record<string, string>> {
  const keys = resolveStudentMfaLoginKeys(session)
  let trust = keys.length > 0 ? await findActiveMfaTrust(keys) : null
  if (!trust && keys[0]) {
    trust = await ensureTrustFromJar(keys[0], keys, "student")
  }
  if (!trust) {
    const records = await readAll()
    trust = records.find((entry) => entry.userType === "student" && isActive(entry)) ?? null
  }
  if (!trust) return {}
  return buildMergedMfaTrustCookie(trust.token)
}

/** Cookie header for instructor login — tries username, email, and other aliased keys. */
export async function mfaLoginCookieHeadersForInstructor(
  authIdentifier: string,
  instructor?: { username?: string; email?: string | null },
): Promise<Record<string, string>> {
  const keys = instructorMfaAliasKeys(authIdentifier, instructor)
  let trust = await findActiveMfaTrust(keys)
  if (!trust && keys[0]) {
    trust = await ensureTrustFromJar(keys[0], keys, "instructor")
  }
  if (!trust) {
    return keys[0] ? mfaLoginCookieHeaders(keys[0]) : {}
  }
  return buildMergedMfaTrustCookie(trust.token)
}

/** Cookie header for login — merges SecureStore trust with the HTTP cookie jar. */
export async function mfaLoginCookieHeaders(loginKey: string): Promise<Record<string, string>> {
  const trustHeaders = await mfaTrustRequestHeaders(loginKey)
  const trustCookie = trustHeaders.Cookie
  const trustToken = trustHeaders[MFA_TRUST_HEADER]
  const jarCookie = await studentHttpCookieHeader()
  if (!trustCookie && !jarCookie) return {}
  if (!jarCookie) {
    return trustCookie
      ? { Cookie: trustCookie, ...(trustToken ? { [MFA_TRUST_HEADER]: trustToken } : {}) }
      : {}
  }
  if (!trustCookie) return { Cookie: jarCookie }
  const jarWithoutTrust = jarCookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !/^cc_mfa_trust=/i.test(part))
    .join("; ")
  const merged = [trustCookie, jarWithoutTrust].filter(Boolean).join("; ")
  return {
    ...(merged ? { Cookie: merged } : {}),
    ...(trustToken ? { [MFA_TRUST_HEADER]: trustToken } : {}),
  }
}

export async function persistMfaDeviceTrustFromLogin(params: {
  userType: MfaUserType
  loginKey: string
  payload: Record<string, unknown>
  aliasKeys?: string[]
}): Promise<void> {
  // Never re-save a jar/SecureStore token from an MFA challenge response — that freezes a
  // rejected/expired token with a fake local expiry and forces MFA on every login.
  if (params.payload.mfaRequired && params.payload.challengeToken) {
    return
  }

  const direct = readTrustFields(params.payload)
  const nestedPayload =
    (params.payload.login_payload ?? params.payload.loginPayload) as Record<string, unknown> | undefined
  const nested =
    nestedPayload && typeof nestedPayload === "object" && !Array.isArray(nestedPayload)
      ? readTrustFields(nestedPayload)
      : null
  const trust = direct ?? nested

  if (trust) {
    const record: MfaDeviceTrustRecord = {
      userType: params.userType,
      loginKey: params.loginKey,
      token: trust.token,
      expiresAt: trust.expiresAt,
    }
    await saveMfaDeviceTrust(record)
    if (params.aliasKeys?.length) {
      await aliasMfaDeviceTrustRecords(record, params.aliasKeys)
    }
    return
  }

  // API may only set cc_mfa_trust via Set-Cookie on verify — sync from jar.
  const jarToken = await readMfaTrustTokenFromJar()
  if (!jarToken) return
  const record: MfaDeviceTrustRecord = {
    userType: params.userType,
    loginKey: params.loginKey,
    token: jarToken,
    expiresAt: new Date(Date.now() + DEFAULT_TRUST_MS).toISOString(),
  }
  await saveMfaDeviceTrust(record)
  if (params.aliasKeys?.length) {
    await aliasMfaDeviceTrustRecords(record, params.aliasKeys)
  }
}

/** Drop local trust for these login keys after the server rejects it (returns mfaRequired). */
export async function clearMfaDeviceTrustKeys(loginKeys: string[]): Promise<void> {
  if (loginKeys.length === 0) return
  const drop = new Set(loginKeys)
  const records = (await readAll()).filter((entry) => !drop.has(entry.loginKey))
  await writeAll(records)
}
