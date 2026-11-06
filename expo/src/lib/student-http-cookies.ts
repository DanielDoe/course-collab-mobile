import { NativeModules, Platform } from "react-native"
import { API_BASE_URL } from "../constants"
import { clearStoredRefreshToken, persistRefreshTokenFromHeaders } from "./refresh-token-store"

type CookieJar = {
  setFromResponse: (url: string, cookie: string) => Promise<void>
  get: (url: string) => Promise<Record<string, { name?: string; value?: string }>>
  clearAll: () => Promise<void>
}

let cookieJarLoadAttempted = false
let cachedCookieManager: CookieJar | null = null

/** Native RNCookieManager must exist before requiring the JS package — otherwise RN throws an uncatchable Invariant Violation in dev. */
function nativeCookieModuleAvailable(): boolean {
  if (Platform.OS === "ios") return Boolean(NativeModules.RNCookieManagerIOS)
  if (Platform.OS === "android") return Boolean(NativeModules.RNCookieManagerAndroid)
  return false
}

function loadCookieManager(): CookieJar | null {
  if (cookieJarLoadAttempted) return cachedCookieManager
  cookieJarLoadAttempted = true

  if (!nativeCookieModuleAvailable()) {
    cachedCookieManager = null
    return null
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@react-native-cookies/cookies") as CookieJar & { default?: CookieJar }
    cachedCookieManager = mod.default ?? mod
  } catch (err) {
    cachedCookieManager = null
    if (__DEV__) {
      console.warn(
        "[CourseCollab] Cookie jar unavailable — MFA trust from SecureStore will still be used.",
        err,
      )
    }
  }

  return cachedCookieManager
}

function cookieHeaderFromJar(
  jar: Record<string, { name?: string; value?: string }>,
): string {
  return Object.values(jar)
    .map((entry) => {
      const name = entry?.name?.trim()
      const value = entry?.value ?? ""
      return name ? `${name}=${value}` : ""
    })
    .filter(Boolean)
    .join("; ")
}

function readSetCookieHeader(headers: Headers): string | null {
  if (typeof headers.getSetCookie === "function") {
    const parts = headers.getSetCookie()
    if (parts.length > 0) return parts.join("; ")
  }
  const single = headers.get("set-cookie") ?? headers.get("Set-Cookie")
  return single ?? null
}

/** Best-effort without native cookie jar — keeps cc_mfa_trust from Set-Cookie for MFA APIs. */
function cookieHeaderFromResponse(headers: Headers): string | undefined {
  const raw = readSetCookieHeader(headers)
  if (!raw) return undefined
  const pairs = raw
    .split(/,(?=\s*[^;,]+=)/)
    .map((chunk) => chunk.split(";")[0]?.trim() ?? "")
    .filter(Boolean)
  return pairs.length > 0 ? pairs.join("; ") : undefined
}

export async function persistHttpCookiesFromResponse(
  url: string,
  headers: Headers,
): Promise<void> {
  await persistRefreshTokenFromHeaders(headers)
  try {
    const CookieManager = loadCookieManager()
    if (!CookieManager) return
    const setCookie = readSetCookieHeader(headers)
    if (!setCookie?.trim()) return
    await CookieManager.setFromResponse(url, setCookie)
  } catch {
    /* cookie jar unavailable on this platform */
  }
}

export async function studentHttpCookieHeader(baseUrl = API_BASE_URL): Promise<string | undefined> {
  try {
    const CookieManager = loadCookieManager()
    if (!CookieManager) return undefined
    const jar = await CookieManager.get(baseUrl)
    const header = cookieHeaderFromJar(jar)
    return header || undefined
  } catch {
    return undefined
  }
}

/** Cookie header for a fetch Response when the native jar is unavailable (Expo Go / unlinked dev client). */
export function studentHttpCookieHeaderFromResponse(headers: Headers): string | undefined {
  return cookieHeaderFromResponse(headers)
}

export function mergeCookieHeaders(...parts: Array<string | undefined>): Record<string, string> {
  const cookie = parts.filter(Boolean).join("; ").trim()
  return cookie ? { Cookie: cookie } : {}
}

export async function clearStudentHttpCookies(): Promise<void> {
  await clearStoredRefreshToken()
  try {
    const CookieManager = loadCookieManager()
    if (!CookieManager) return
    await CookieManager.clearAll()
  } catch {
    /* ignore */
  }
}

export function isNativeCookieJarAvailable(): boolean {
  return nativeCookieModuleAvailable()
}
