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
import { resetAppBootstrapState } from "../lib/post-login-bootstrap"

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
    if (data.portal !== "admin") {
      await persistRememberedLoginPortal(data.portal)
    }
    const next = await saveSession(data)
    setSession(next)
  }, [])

  const signOut = useCallback(async () => {
    resetAppBootstrapState()
    await clearStoredSession()
    // Keep remembered login portal, university, and remember-me identifiers across sign-out.
    // Keep MFA device trust — "trust this device for 1 week" should survive sign-out.
    try {
      await api.logout()
    } catch {
      // Best-effort — local session is already cleared.
    }
    setSession(null)
  }, [])

  const refreshSession = useCallback(async () => {
    const next = await refreshStoredSession()
    setSession(next)
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
