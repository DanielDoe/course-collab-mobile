import type { ParticipantKind } from "../messages-api"

/** Manual status set by the user (Teams-style). */
export type ManualPresenceStatus = "available" | "busy" | "dnd" | "away" | "appear_offline"

/** Resolved status shown on avatars. */
export type PresenceStatus = "available" | "busy" | "dnd" | "away" | "offline"

export type PresenceRecord = {
  kind: ParticipantKind
  id: number
  status: PresenceStatus
  manualStatus: ManualPresenceStatus | null
  lastSeenAt: string | null
}

export type PresenceMap = Record<string, PresenceStatus>

export type PresenceLastSeenMap = Record<string, string | null>

export function presenceKey(kind: ParticipantKind, id: number): string {
  return `${kind}:${id}`
}
