import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { SessionContext } from "./session-context"
import {
  clearStoredSession,
  getStoredSession,
  patchStoredSession,
  saveSession,
  type AppSession,
  type SignInPayload,
  type StudentSession,
} from "../lib/session"
import { refreshServerSession } from "../lib/session-refresh"
import { studentSessionHasAuthIdentity } from "../lib/student-content-context"
import { repairStudentDatabaseIdFromServer, saveStudentSession } from "../lib/student-session-repair"
import { persistRememberedLoginPortal } from "../lib/remembered-login-portal"
import { api } from "../lib/api"
import { clearUserLocalState } from "../lib/clear-user-local-state"
import { mfaTrustRequestHeadersForStudent } from "../lib/mfa-device-trust"
import { getStoredRefreshToken, REFRESH_TOKEN_HEADER } from "../lib/refresh-token-store"
import { studentHttpCookieHeader } from "../lib/student-http-cookies"
import { headersHaveStudentSessionProof } from "../lib/student-session-proof"
import { subscribeSessionExpired } from "../lib/session-expiry"
import { bootLog } from "../lib/boot-diagnostics"
import { getQueryClient } from "../lib/query/client"
import { queryKeys } from "../lib/query/keys"
import { studentQueryScope } from "../lib/query/scope"
import { clearExplicitSignOut, hasExplicitSignOut, markExplicitSignOut } from "../lib/signed-out-flag"

const SESSION_RESTORE_TIMEOUT_MS = 3_500
const HYDRATE_TIMEOUT_MS = 2_800

async function canUseStoredStudentSession(stored: StudentSession): Promise<boolean> {
  const refresh = await getStoredRefreshToken()
  const jar = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForStudent(stored)
  const headers: Record<string, string> = { ...trust }
  if (refresh) headers[REFRESH_TOKEN_HEADER] = refresh
  const cookie = [headers.Cookie, jar].filter(Boolean).join("; ").trim()
  if (cookie) headers.Cookie = cookie
  return headersHaveStudentSessionProof(headers)
}

async function finalizeStudentSession(stored: AppSession | null): Promise<AppSession | null> {
  if (!stored || stored.portal !== "student" || studentSessionHasAuthIdentity(stored)) {
    return stored
  }
  const repaired = await repairStudentDatabaseIdFromServer(stored)
  if (!repaired) return stored
  return (await patchStoredSession({ databaseId: repaired })) ?? stored
}

async function hydrateSessionFromStore(): Promise<AppSession | null> {
  const refreshed = await refreshServerSession()
  if (refreshed) {
    return finalizeStudentSession(refreshed)
  }
  const stored = await getStoredSession()
  if (!stored) return null
  if (stored.portal === "student" && !(await canUseStoredStudentSession(stored))) {
    bootLog("Session restore skipped — stored student session has no auth credentials", "warn")
    await clearStoredSession()
    return null
  }
  return finalizeStudentSession(stored)
}

async function hydrateSessionWithTimeout(stored: AppSession | null): Promise<AppSession | null> {
  if (!stored) return null
  try {
    const hydrated = await Promise.race([
      hydrateSessionFromStore(),
      new Promise<AppSession | null>((resolve) => {
        setTimeout(() => resolve(stored), HYDRATE_TIMEOUT_MS)
      }),
    ])
    return hydrated ?? stored
  } catch {
    return stored
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const identityRepairAttemptedRef = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true
    bootLog("Session restore started")

    const timeout = setTimeout(() => {
      if (!mounted) return
      bootLog("Session restore timed out — continuing without session", "warn")
      setIsLoading(false)
    }, SESSION_RESTORE_TIMEOUT_MS)

    getStoredSession()
      .then(async (stored) => {
        if (!mounted) return
        if (await hasExplicitSignOut()) {
          bootLog("Session restore blocked (signed out)")
          try {
            await api.logout()
          } catch {
            /* leftover token revoke is best-effort */
          }
          await clearUserLocalState(null)
          await clearStoredSession()
          setSession(null)
          return
        }
        const refreshed = await hydrateSessionWithTimeout(stored)
        if (!mounted) return
        if (await hasExplicitSignOut()) {
          bootLog("Session restore blocked after refresh (signed out)")
          await clearStoredSession()
          setSession(null)
          return
        }
        if (refreshed) {
          bootLog(`Session restore completed (${refreshed.portal})`)
          setSession(refreshed)
          return
        }
        bootLog(stored ? `Session restore completed (${stored.portal})` : "Session restore completed (signed out)")
        setSession(stored)
      })
      .catch((error) => {
        if (mounted) {
          bootLog(
            `Session restore failed: ${error instanceof Error ? error.message : String(error)}`,
            "warn",
          )
        }
      })
      .finally(() => {
        clearTimeout(timeout)
        if (mounted) setIsLoading(false)
      })
    return () => {
      mounted = false
      clearTimeout(timeout)
    }
  }, [])

  const signIn = useCallback(async (data: SignInPayload) => {
    const previous = await getStoredSession()
    if (previous) {
      // Login already minted fresh server credentials — only clear the prior user's local caches.
      await clearUserLocalState(previous, { preserveAuthCredentials: true })
    }
    if (data.portal !== "admin") {
      await persistRememberedLoginPortal(data.portal)
    }
    await clearExplicitSignOut()
    const next =
      data.portal === "student" ? await saveStudentSession(data) : await saveSession(data)
    setSession(next)
  }, [])

  const signOut = useCallback(async () => {
    const current = session ?? (await getStoredSession())
    await markExplicitSignOut()
    try {
      await api.logout()
    } catch {
      /* still clear local state */
    }
    await clearUserLocalState(current)
    await clearStoredSession()
    setSession(null)
  }, [session])

  const refreshSession = useCallback(async () => {
    const next = (await hydrateSessionFromStore()) ?? (await getStoredSession())
    setSession(next)
  }, [])

  const updateSession = useCallback(async (patch: import("../lib/session").SessionPatch) => {
    const next = await patchStoredSession(patch)
    if (next) setSession(next)
  }, [])

  const studentRosterId = session?.portal === "student" ? (session as StudentSession).id?.trim() : null
  const studentDatabaseId =
    session?.portal === "student" ? (session as StudentSession).databaseId?.trim() : null

  useEffect(() => {
    if (session?.portal !== "student") return
    const student = session as StudentSession
    if (studentSessionHasAuthIdentity(student)) return
    if (!studentRosterId || identityRepairAttemptedRef.current === studentRosterId) return
    identityRepairAttemptedRef.current = studentRosterId

    void repairStudentDatabaseIdFromServer(student).then(async (databaseId) => {
      if (!databaseId) return
      const next = await patchStoredSession({ databaseId })
      if (next) {
        setSession(next)
        try {
          getQueryClient().invalidateQueries({
            queryKey: queryKeys.student.dashboard.root(studentQueryScope(next as StudentSession)),
          })
        } catch {
          /* query client may not be mounted yet */
        }
      }
    })
  }, [session?.portal, studentDatabaseId, studentRosterId])

  useEffect(() => {
    let lastRecoveredAt = 0
    return subscribeSessionExpired(() => {
      void (async () => {
        if (Date.now() - lastRecoveredAt < 8_000) {
          const current = await getStoredSession()
          try {
            await api.logout()
          } catch {
            /* already invalid */
          }
          await clearUserLocalState(current)
          await clearStoredSession()
          setSession(null)
          return
        }
        if (await hasExplicitSignOut()) {
          const current = await getStoredSession()
          await clearUserLocalState(current)
          await clearStoredSession()
          setSession(null)
          return
        }
        const recovered = await refreshServerSession()
        if (recovered) {
          lastRecoveredAt = Date.now()
          setSession(recovered)
          return
        }
        const current = await getStoredSession()
        try {
          await api.logout()
        } catch {
          /* already invalid */
        }
        await clearUserLocalState(current)
        await clearStoredSession()
        setSession(null)
      })()
    })
  }, [])

  const value = useMemo(
    () => ({ session, isLoading, signIn, signOut, refreshSession, updateSession }),
    [session, isLoading, signIn, signOut, refreshSession, updateSession],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export { useSession } from "./session-context"
