import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { AppState, InteractionManager, type AppStateStatus } from "react-native"
import { useSession } from "./SessionProvider"
import { messagesAuthFromSession } from "../lib/messages-api"
import { presenceApi } from "../lib/presence-api"
import { MANUAL_PRESENCE_OPTIONS, PRESENCE_LABELS } from "../lib/presence/constants"
import { emitPresenceUpdated } from "../lib/presence/events"
import type { ManualPresenceStatus, PresenceStatus } from "../lib/presence/types"

type PresenceSelfContextValue = {
  status: PresenceStatus
  manualStatus: ManualPresenceStatus | null
  statusLabel: string
  setStatus: (next: ManualPresenceStatus) => Promise<void>
  resetStatus: () => Promise<void>
  refresh: () => Promise<void>
  enabled: boolean
}

const noopContext: PresenceSelfContextValue = {
  status: "offline",
  manualStatus: null,
  statusLabel: "Offline",
  setStatus: async () => {},
  resetStatus: async () => {},
  refresh: async () => {},
  enabled: false,
}

const PresenceSelfContext = createContext<PresenceSelfContextValue>(noopContext)

const HEARTBEAT_MS = 60_000

export function PresenceSelfProvider({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const auth = useMemo(
    () => messagesAuthFromSession(session),
    [
      session?.portal,
      session && "databaseId" in session ? session.databaseId : undefined,
      session?.portal === "faculty" && session ? session.id : undefined,
    ],
  )

  const [status, setStatusState] = useState<PresenceStatus>("offline")
  const [manualStatus, setManualStatus] = useState<ManualPresenceStatus | null>(null)

  const applyPresence = useCallback(
    (record?: { status: PresenceStatus; manualStatus: ManualPresenceStatus | null }) => {
      if (!record) return
      setStatusState(record.status)
      setManualStatus(record.manualStatus)
      emitPresenceUpdated()
    },
    [],
  )

  const refresh = useCallback(async () => {
    if (!auth) return
    try {
      const data = await presenceApi.getSelf(auth)
      applyPresence(data.presence)
    } catch {
      /* ignore */
    }
  }, [auth, applyPresence])

  const heartbeat = useCallback(async () => {
    if (!auth) return
    try {
      const data = await presenceApi.heartbeat(auth)
      applyPresence(data.presence)
    } catch {
      /* ignore */
    }
  }, [auth, applyPresence])

  const setStatus = useCallback(
    async (next: ManualPresenceStatus) => {
      if (!auth) return
      const data = await presenceApi.setStatus(auth, next)
      applyPresence(data.presence)
    },
    [auth, applyPresence],
  )

  const resetStatus = useCallback(async () => {
    if (!auth) return
    const data = await presenceApi.resetStatus(auth)
    applyPresence(data.presence)
  }, [auth, applyPresence])

  useEffect(() => {
    if (!auth) {
      setStatusState("offline")
      setManualStatus(null)
      return
    }
    const task = InteractionManager.runAfterInteractions(() => {
      void refresh()
      void heartbeat()
    })
    const id = setInterval(() => void heartbeat(), HEARTBEAT_MS)
    return () => {
      task.cancel()
      clearInterval(id)
    }
  }, [auth, refresh, heartbeat])

  useEffect(() => {
    if (!auth) return
    const onAppState = (next: AppStateStatus) => {
      if (next === "active") void heartbeat()
    }
    const sub = AppState.addEventListener("change", onAppState)
    return () => sub.remove()
  }, [auth, heartbeat])

  const statusLabel = useMemo(() => {
    const manual = MANUAL_PRESENCE_OPTIONS.find((o) => o.value === manualStatus)
    return manual?.label ?? PRESENCE_LABELS[status]
  }, [manualStatus, status])

  const value = useMemo(
    () =>
      auth
        ? { status, manualStatus, statusLabel, setStatus, resetStatus, refresh, enabled: true }
        : noopContext,
    [auth, status, manualStatus, statusLabel, setStatus, resetStatus, refresh],
  )

  return <PresenceSelfContext.Provider value={value}>{children}</PresenceSelfContext.Provider>
}

export function useSelfPresence(): PresenceSelfContextValue {
  return useContext(PresenceSelfContext)
}
