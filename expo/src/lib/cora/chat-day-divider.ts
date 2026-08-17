/** iMessage-style day separators for Cora chat transcripts. */

export type TimedChatMessage = {
  id: string
  createdAt?: string | null
}

/** Show a stamp when the calendar day changes, or after a long quiet gap (iMessage-like). */
const GAP_MS = 60 * 60 * 1000

/** Calendar day key in local timezone (YYYY-M-D). */
export function calendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

/**
 * Resolve when a message was created.
 * Prefers explicit `createdAt`; falls back to a 13-digit epoch embedded in the id
 * (e.g. `fc-1755…-abc`, `cora-1755…`).
 */
export function resolveMessageCreatedAt(
  message: TimedChatMessage,
  fallbackIso?: string | null,
): Date | null {
  if (message.createdAt) {
    const parsed = new Date(message.createdAt)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  const fromId = message.id.match(/(?:^|-)(\d{13})(?:-|$)/)
  if (fromId?.[1]) {
    const ms = Number(fromId[1])
    if (Number.isFinite(ms) && ms > 1_000_000_000_000) {
      const parsed = new Date(ms)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
  }

  if (fallbackIso) {
    const parsed = new Date(fallbackIso)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  return null
}

/** iMessage-like centered stamp: "Wed, Aug 5 at 10:37 AM". */
export function formatIMessageDayDivider(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function shouldShowChatDayDivider(
  current: TimedChatMessage,
  previous: TimedChatMessage | null | undefined,
  fallbackIso?: string | null,
): { show: boolean; label: string | null } {
  const currentAt = resolveMessageCreatedAt(current, fallbackIso)
  if (!currentAt) return { show: false, label: null }

  if (!previous) {
    return { show: true, label: formatIMessageDayDivider(currentAt) }
  }

  const previousAt = resolveMessageCreatedAt(previous, fallbackIso)
  if (!previousAt) {
    return { show: true, label: formatIMessageDayDivider(currentAt) }
  }

  const dayChanged = calendarDayKey(currentAt) !== calendarDayKey(previousAt)
  const longGap = currentAt.getTime() - previousAt.getTime() >= GAP_MS
  if (dayChanged || longGap) {
    return { show: true, label: formatIMessageDayDivider(currentAt) }
  }

  return { show: false, label: null }
}
