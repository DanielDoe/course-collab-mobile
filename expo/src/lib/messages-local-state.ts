/** Client-side unread override when the server mark-unread endpoint is unavailable. */
const locallyUnreadThreadIds = new Set<number>()

export function markThreadUnreadLocally(threadId: number) {
  locallyUnreadThreadIds.add(threadId)
}

export function clearThreadUnreadLocally(threadId: number) {
  locallyUnreadThreadIds.delete(threadId)
}

export function isThreadUnreadLocally(threadId: number): boolean {
  return locallyUnreadThreadIds.has(threadId)
}

export function applyLocalUnreadToThreads<T extends { id: number; unreadCount: number }>(
  threads: T[],
): T[] {
  return threads.map((thread) =>
    isThreadUnreadLocally(thread.id)
      ? { ...thread, unreadCount: Math.max(1, thread.unreadCount) }
      : thread,
  )
}
