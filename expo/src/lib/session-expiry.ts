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

function requestPathname(path: string): string {
  return path.split("?")[0] ?? path
}

/**
 * Dual-role routes (projects/groups/attendance records) 401 when the server
 * wants the other portal's cookies. That is not a dead student/faculty session.
 * Production web treats those 401s as an empty list.
 *
 * Do not key off "Instructor authentication required" globally — that is how
 * expired faculty sessions fail on `/api/instructor/*`.
 */
export function isNonSessionExpiryUnauthorized(path: string): boolean {
  const pathname = requestPathname(path)
  if (
    pathname === "/api/attendance/records" ||
    pathname.startsWith("/api/attendance/records/") ||
    pathname === "/api/attendance/leaderboard" ||
    pathname.startsWith("/api/attendance/leaderboard/") ||
    pathname === "/api/attendance/score" ||
    pathname.startsWith("/api/attendance/score/") ||
    pathname === "/api/attendance/streaks" ||
    pathname.startsWith("/api/attendance/streaks/")
  ) {
    return true
  }
  if (pathname === "/api/classroom-points" || pathname.startsWith("/api/classroom-points/")) {
    return true
  }
  if (pathname === "/api/groups" || pathname.startsWith("/api/groups/")) return true
  if (pathname === "/api/projects" || pathname.startsWith("/api/projects/")) return true
  return false
}

/** Dual-role groups/projects routes 401 as instructor when student cookies are the caller. */
export function isInstructorAuthLeakMessage(message: string | undefined): boolean {
  return /instructor authentication required/i.test(String(message ?? ""))
}

export function shouldInvalidateSessionForStatus(
  path: string,
  status: number,
  _message?: string,
): boolean {
  if (status !== 401) return false
  if (AUTH_PATH_PATTERN.test(path)) return false
  if (isNonSessionExpiryUnauthorized(path)) return false
  return true
}

export function notifySessionExpired(path: string, status: number, message?: string): void {
  if (!shouldInvalidateSessionForStatus(path, status, message)) return
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
