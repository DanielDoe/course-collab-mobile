export function extractRefreshTokenFromCookieHeader(cookie: string | undefined): string | undefined {
  if (!cookie) return undefined
  const match = cookie.match(/(?:^|;\s*)cc_refresh=([^;]+)/i)
  const token = match?.[1]?.trim()
  return token || undefined
}

export function extractRefreshTokenFromSetCookie(setCookie: string | null | undefined): string | undefined {
  if (!setCookie?.trim()) return undefined
  const match = setCookie.match(/(?:^|,|\s)cc_refresh=([^;,\s]+)/i)
  const token = match?.[1]?.trim()
  return token || undefined
}
