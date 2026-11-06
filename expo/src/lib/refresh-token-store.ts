import * as SecureStore from "./secure-store-client"
import {
  extractRefreshTokenFromCookieHeader,
  extractRefreshTokenFromSetCookie,
} from "./refresh-token-parse"

const REFRESH_TOKEN_KEY = "ccRefreshToken"
export const REFRESH_TOKEN_HEADER = "x-cc-refresh"

export { extractRefreshTokenFromCookieHeader, extractRefreshTokenFromSetCookie }

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    return value?.trim() || null
  } catch {
    return null
  }
}

export async function persistRefreshToken(rawToken: string | null | undefined): Promise<void> {
  const token = rawToken?.trim()
  if (!token) return
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token)
  } catch {
    /* SecureStore unavailable — cookie jar may still hold the token */
  }
}

export async function persistRefreshTokenFromHeaders(headers: Headers): Promise<void> {
  const fromHeader = headers.get(REFRESH_TOKEN_HEADER)?.trim()
  if (fromHeader) {
    await persistRefreshToken(fromHeader)
    return
  }
  const setCookie =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie().join(", ")
      : headers.get("set-cookie") ?? headers.get("Set-Cookie")
  await persistRefreshToken(extractRefreshTokenFromSetCookie(setCookie))
}

export async function clearStoredRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export async function refreshTokenRequestHeaders(): Promise<Record<string, string>> {
  const token = await getStoredRefreshToken()
  return token ? { [REFRESH_TOKEN_HEADER]: token } : {}
}
