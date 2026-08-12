import { PRESENCE_LABELS } from "./constants"
import type { PresenceStatus } from "./types"

function formatLastSeen(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return "Offline"
  const diff = Date.now() - new Date(lastSeenAt).getTime()
  if (diff < 60_000) return "Last seen just now"
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `Last seen ${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Last seen ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Last seen ${days}d ago`
  return `Last seen ${new Date(lastSeenAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
}

/** Short activity line for thread headers and profile sheets. */
export function formatPresenceActivity(
  status: PresenceStatus | undefined,
  lastSeenAt?: string | null,
): string | null {
  if (!status) return null
  if (status === "available") return "Active now"
  if (status === "offline") return formatLastSeen(lastSeenAt)
  return PRESENCE_LABELS[status]
}

/** Subtitle row: role · activity (e.g. Faculty · Active now). */
export function formatParticipantSubtitleLine(
  role: string | null | undefined,
  status: PresenceStatus | undefined,
  lastSeenAt?: string | null,
): string | null {
  const activity = formatPresenceActivity(status, lastSeenAt)
  const trimmedRole = role?.trim()
  if (trimmedRole && activity) return `${trimmedRole} · ${activity}`
  return trimmedRole || activity
}
