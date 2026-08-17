import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  clearStoredSession,
  getStoredSession,
  refreshStoredSession,
  saveSession,
  type AppSession,
  type SignInPayload,
} from "../lib/session"
import { persistRememberedLoginPortal } from "../lib/remembered-login-portal"
import { api } from "../lib/api"
import { clearUserLocalState } from "../lib/clear-user-local-state"
import { subscribeSessionExpired } from "../lib/session-expiry"

type SessionContextValue = {
  session: AppSession | null
  isLoading: boolean
  signIn: (data: SignInPayload) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getStoredSession()
      .then((stored) => {
        if (mounted) setSession(stored)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const signIn = useCallback(async (data: SignInPayload) => {
    const previous = await getStoredSession()
    if (previous) {
      await clearUserLocalState(previous)
      try {
        await api.logout()
      } catch {
        /* previous server session revoke is best-effort */
      }
    }
    if (data.portal !== "admin") {
      await persistRememberedLoginPortal(data.portal)
    }
    const next = await saveSession(data)
    setSession(next)
  }, [])

  const signOut = useCallback(async () => {
    await clearUserLocalState(session)
    await clearStoredSession()
    // Keep remembered login portal, university, and remember-me identifiers across sign-out.
    // Keep MFA device trust — "trust this device for 1 week" should survive sign-out.
    try {
      await api.logout()
    } catch {
      // Best-effort — local session is already cleared.
    }
    setSession(null)
  }, [session])

  const refreshSession = useCallback(async () => {
    const next = await refreshStoredSession()
    setSession(next)
  }, [])

  useEffect(() => {
    return subscribeSessionExpired(() => {
      void (async () => {
        const current = await getStoredSession()
        await clearUserLocalState(current)
        await clearStoredSession()
        try {
          await api.logout()
        } catch {
          /* already invalid */
        }
        setSession(null)
      })()
    })
  }, [])

  const value = useMemo(
    () => ({ session, isLoading, signIn, signOut, refreshSession }),
    [session, isLoading, signIn, signOut, refreshSession],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
