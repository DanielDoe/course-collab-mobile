export type MessageRefreshPayload = {
  threadId?: number
  /**
   * `local-read` is emitted by the open thread after marking itself read.
   * Thread screens must ignore it so they do not reload → emit → reload.
   */
  cause?: "local-read" | "external"
}

/** True when a thread screen should refetch from an inbox/push refresh event. */
export function shouldReloadThreadOnMessageRefresh(
  openThreadId: number,
  payload?: MessageRefreshPayload,
): boolean {
  if (payload?.cause === "local-read") return false
  if (payload?.threadId != null && payload.threadId !== openThreadId) return false
  return true
}

/** Inbox applies local unread, then refetches only for push/external events. */
export function shouldRefetchInboxOnMessageRefresh(payload?: MessageRefreshPayload): boolean {
  return payload?.cause !== "local-read"
}
