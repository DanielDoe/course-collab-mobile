import * as SecureStore from "./secure-store-client"

export type NotificationInboxPortal = "student" | "faculty"

export type NotificationInboxPrefs = {
  pinnedIds: number[]
  archivedIds: number[]
  /** Faculty-only soft delete (API has no dismiss). */
  deletedIds: number[]
}

const EMPTY: NotificationInboxPrefs = {
  pinnedIds: [],
  archivedIds: [],
  deletedIds: [],
}

function storageKey(portal: NotificationInboxPortal, userId: number | string): string {
  return `notification_inbox_prefs_v1:${portal}:${userId}`
}

function sanitizeIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const next: number[] = []
  const seen = new Set<number>()
  for (const item of value) {
    const id = typeof item === "number" ? item : Number(item)
    if (!Number.isFinite(id) || seen.has(id)) continue
    seen.add(id)
    next.push(id)
  }
  return next
}

function normalize(raw: Partial<NotificationInboxPrefs> | null | undefined): NotificationInboxPrefs {
  return {
    pinnedIds: sanitizeIds(raw?.pinnedIds),
    archivedIds: sanitizeIds(raw?.archivedIds),
    deletedIds: sanitizeIds(raw?.deletedIds),
  }
}

export async function loadNotificationInboxPrefs(
  portal: NotificationInboxPortal,
  userId: number | string,
): Promise<NotificationInboxPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(storageKey(portal, userId))
    if (!raw) return { ...EMPTY }
    return normalize(JSON.parse(raw) as Partial<NotificationInboxPrefs>)
  } catch {
    return { ...EMPTY }
  }
}

export async function saveNotificationInboxPrefs(
  portal: NotificationInboxPortal,
  userId: number | string,
  prefs: NotificationInboxPrefs,
): Promise<void> {
  try {
    await SecureStore.setItemAsync(storageKey(portal, userId), JSON.stringify(normalize(prefs)))
  } catch {
    /* ignore */
  }
}

export async function clearNotificationInboxPrefs(
  portal: NotificationInboxPortal,
  userId: number | string,
): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(storageKey(portal, userId))
  } catch {
    /* ignore */
  }
}

function toggleId(ids: number[], id: number, enabled: boolean): number[] {
  if (enabled) {
    return ids.includes(id) ? ids : [...ids, id]
  }
  return ids.filter((value) => value !== id)
}

export function withPinned(
  prefs: NotificationInboxPrefs,
  id: number,
  pinned: boolean,
): NotificationInboxPrefs {
  return {
    ...prefs,
    pinnedIds: toggleId(prefs.pinnedIds, id, pinned),
    // Pinning brings an item back into the active inbox.
    archivedIds: pinned ? prefs.archivedIds.filter((value) => value !== id) : prefs.archivedIds,
  }
}

export function withArchived(
  prefs: NotificationInboxPrefs,
  id: number,
  archived: boolean,
): NotificationInboxPrefs {
  return {
    ...prefs,
    archivedIds: toggleId(prefs.archivedIds, id, archived),
    // Archiving clears pin so inbox stay intentional.
    pinnedIds: archived ? prefs.pinnedIds.filter((value) => value !== id) : prefs.pinnedIds,
  }
}

export function withDeleted(prefs: NotificationInboxPrefs, id: number): NotificationInboxPrefs {
  return {
    pinnedIds: prefs.pinnedIds.filter((value) => value !== id),
    archivedIds: prefs.archivedIds.filter((value) => value !== id),
    deletedIds: toggleId(prefs.deletedIds, id, true),
  }
}

export function withoutNotification(prefs: NotificationInboxPrefs, id: number): NotificationInboxPrefs {
  return {
    pinnedIds: prefs.pinnedIds.filter((value) => value !== id),
    archivedIds: prefs.archivedIds.filter((value) => value !== id),
    deletedIds: prefs.deletedIds.filter((value) => value !== id),
  }
}

export function sortNotificationsWithPins<T extends { id: number; created_at: string }>(
  items: T[],
  pinnedIds: number[],
): T[] {
  const pinned = new Set(pinnedIds)
  return [...items].sort((a, b) => {
    const aPinned = pinned.has(a.id) ? 1 : 0
    const bPinned = pinned.has(b.id) ? 1 : 0
    if (aPinned !== bPinned) return bPinned - aPinned
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}
