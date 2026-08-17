type SessionExpiredListener = () => void

const listeners = new Set<SessionExpiredListener>()
let lastNotifiedAt = 0
const DEDUPE_MS = 1500

const AUTH_PATH_PATTERN = /\/(login|logout|mfa|universities|activate)/i

export function subscribeSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function shouldInvalidateSessionForStatus(path: string, status: number): boolean {
  if (status !== 401) return false
  return !AUTH_PATH_PATTERN.test(path)
}

export function notifySessionExpired(path: string, status: number): void {
  if (!shouldInvalidateSessionForStatus(path, status)) return
  const now = Date.now()
  if (now - lastNotifiedAt < DEDUPE_MS) return
  lastNotifiedAt = now
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      /* listener failures must not break API handling */
    }
  }
}
