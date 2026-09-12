import { createContext, useContext } from "react"
import type { AppSession, SignInPayload, SessionPatch } from "../lib/session"

export type SessionContextValue = {
  session: AppSession | null
  isLoading: boolean
  signIn: (data: SignInPayload) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  updateSession: (patch: SessionPatch) => Promise<void>
}

/** Separate module so Fast Refresh does not recreate context and break useSession. */
export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
