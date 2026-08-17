/** Client-side read/unread overrides when the server list is stale or mark-unread is used locally. */
const locallyUnreadThreadIds = new Set<number>()
const locallyReadThreadIds = new Set<number>()

export function markThreadUnreadLocally(threadId: number) {
  locallyUnreadThreadIds.add(threadId)
  locallyReadThreadIds.delete(threadId)
}

export function markThreadReadLocally(threadId: number) {
  locallyReadThreadIds.add(threadId)
  locallyUnreadThreadIds.delete(threadId)
}

export function clearThreadUnreadLocally(threadId: number) {
  markThreadReadLocally(threadId)
}

export function isThreadUnreadLocally(threadId: number): boolean {
  return locallyUnreadThreadIds.has(threadId)
}

export function applyLocalThreadStateToThreads<T extends { id: number; unreadCount: number }>(
  threads: T[],
): T[] {
  return threads.map((thread) => {
    if (isThreadUnreadLocally(thread.id)) {
      return { ...thread, unreadCount: Math.max(1, thread.unreadCount) }
    }
    if (locallyReadThreadIds.has(thread.id)) {
      return { ...thread, unreadCount: 0 }
    }
    return thread
  })
}

/** @deprecated Use applyLocalThreadStateToThreads */
export const applyLocalUnreadToThreads = applyLocalThreadStateToThreads

export function reconcileLocalThreadReadState(threads: Array<{ id: number; unreadCount: number }>) {
  for (const thread of threads) {
    if (thread.unreadCount === 0) {
      locallyReadThreadIds.delete(thread.id)
    }
  }
}
