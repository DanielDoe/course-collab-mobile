import { useCallback, useEffect, useMemo, useState } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useSession } from "../context/SessionProvider"
import { messagesAuthFromSession, type ParticipantKind } from "../lib/messages-api"
import { presenceApi } from "../lib/presence-api"
import { subscribePresenceUpdated } from "../lib/presence/events"
import {
  presenceKey,
  type PresenceLastSeenMap,
  type PresenceMap,
  type PresenceStatus,
} from "../lib/presence/types"

type ParticipantRef = { kind: ParticipantKind; id: number }

const POLL_MS = 30_000

export function usePresenceTracking(participants: ParticipantRef[]) {
  const { session } = useSession()
  const auth = useMemo(
    () => messagesAuthFromSession(session),
    [
      session?.portal,
      session && "databaseId" in session ? session.databaseId : undefined,
      session?.portal === "faculty" && session ? session.id : undefined,
    ],
  )
  const [statuses, setStatuses] = useState<PresenceMap>({})
  const [lastSeenAt, setLastSeenAt] = useState<PresenceLastSeenMap>({})

  const keys = useMemo(() => {
    const unique = new Map<string, ParticipantRef>()
    for (const p of participants) {
      if (Number.isFinite(p.id) && p.id > 0) {
        unique.set(presenceKey(p.kind, p.id), p)
      }
    }
    return [...unique.values()]
  }, [participants])

  const refresh = useCallback(async () => {
    if (!auth || keys.length === 0) {
      setStatuses({})
      setLastSeenAt({})
      return
    }
    try {
      const data = await presenceApi.getBatch(auth, keys)
      setStatuses(data.statuses ?? {})
      setLastSeenAt(data.lastSeenAt ?? {})
    } catch {
      /* ignore */
    }
  }, [auth, keys])

  useEffect(() => {
    void refresh()
    if (!auth || keys.length === 0) return

    const id = setInterval(() => void refresh(), POLL_MS)
    const unsub = subscribePresenceUpdated(() => void refresh())

    const onAppState = (next: AppStateStatus) => {
      if (next === "active") void refresh()
    }
    const sub = AppState.addEventListener("change", onAppState)

    return () => {
      clearInterval(id)
      unsub()
      sub.remove()
    }
  }, [auth, keys, refresh])

  const getStatus = useCallback(
    (kind: ParticipantKind, id: number): PresenceStatus | undefined => statuses[presenceKey(kind, id)],
    [statuses],
  )

  const getLastSeenAt = useCallback(
    (kind: ParticipantKind, id: number): string | null | undefined =>
      lastSeenAt[presenceKey(kind, id)],
    [lastSeenAt],
  )

  return { statuses, lastSeenAt, getStatus, getLastSeenAt, refresh }
}
