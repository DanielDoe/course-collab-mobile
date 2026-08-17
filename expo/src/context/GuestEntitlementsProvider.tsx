import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { ApiError } from "../lib/api"
import { guestApi } from "../lib/guest-api"
import { defaultGuestEntitlements, guestHasCapability } from "../lib/guest-entitlements-defaults"
import type { GuestEntitlements, GuestCapability } from "../lib/guest-types"
import type { GuestSession } from "../lib/session"

type GuestEntitlementsContextValue = {
  entitlements: GuestEntitlements
  loading: boolean
  error: string
  refresh: () => Promise<void>
  hasCapability: (capability: GuestCapability) => boolean
  workspaceEnabled: boolean
}

const GuestEntitlementsContext = createContext<GuestEntitlementsContextValue | null>(null)

export function GuestEntitlementsProvider({
  session,
  children,
}: {
  session: GuestSession
  children: ReactNode
}) {
  const [entitlements, setEntitlements] = useState<GuestEntitlements>(defaultGuestEntitlements())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const refresh = useCallback(async () => {
    setError("")
    try {
      const next = await guestApi.getEntitlements(session)
      setEntitlements(next)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load guest entitlements.")
    }
  }, [session])

  useEffect(() => {
    setLoading(true)
    void refresh().finally(() => setLoading(false))
  }, [refresh])

  const value = useMemo<GuestEntitlementsContextValue>(
    () => ({
      entitlements,
      loading,
      error,
      refresh,
      hasCapability: (capability) => guestHasCapability(entitlements, capability),
      workspaceEnabled: entitlements.flags.guestWorkspaceEnabled !== false,
    }),
    [entitlements, error, loading, refresh],
  )

  return <GuestEntitlementsContext.Provider value={value}>{children}</GuestEntitlementsContext.Provider>
}

export function useGuestEntitlements(): GuestEntitlementsContextValue {
  const ctx = useContext(GuestEntitlementsContext)
  if (!ctx) {
    return {
      entitlements: defaultGuestEntitlements(),
      loading: false,
      error: "",
      refresh: async () => {},
      hasCapability: () => false,
      workspaceEnabled: true,
    }
  }
  return ctx
}
