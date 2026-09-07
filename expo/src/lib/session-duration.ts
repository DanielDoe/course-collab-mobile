export const DEFAULT_SESSION_MS = 7 * 24 * 60 * 60 * 1000
export const REMEMBER_ME_SESSION_MS = 30 * 24 * 60 * 60 * 1000

export function resolveSessionDurationMs(input?: {
  rememberMe?: boolean
  sessionExpiresIn?: number | null
}): number {
  const fromServer = Number(input?.sessionExpiresIn)
  if (Number.isFinite(fromServer) && fromServer > 60_000) return fromServer
  return input?.rememberMe ? REMEMBER_ME_SESSION_MS : DEFAULT_SESSION_MS
}
