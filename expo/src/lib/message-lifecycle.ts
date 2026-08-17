/** Mirrors server windows in `v0-coursecollabv3/lib/direct-messages/message-lifecycle.ts`. */
export const DM_UNSEND_WINDOW_MS = 2 * 60 * 1000
export const DM_EDIT_WINDOW_MS = 15 * 60 * 1000

export type MessageDeleteMode = "unsend" | "hide"

export type MessageEditVersion = {
  body: string
  editedAt: string
}

export function messageAgeMs(createdAt: string, now = Date.now()): number {
  const ts = new Date(createdAt).getTime()
  if (!Number.isFinite(ts)) return Number.POSITIVE_INFINITY
  return Math.max(0, now - ts)
}

export function canUnsendMessage(params: {
  createdAt: string
  isMine: boolean
  unsent?: boolean
  hasAttachments?: boolean
  canUnsend?: boolean
  now?: number
}): boolean {
  if (params.canUnsend != null) return params.canUnsend
  if (!params.isMine || params.unsent) return false
  if (params.hasAttachments) return false
  return messageAgeMs(params.createdAt, params.now) <= DM_UNSEND_WINDOW_MS
}

export function canEditMessage(params: {
  createdAt: string
  isMine: boolean
  unsent?: boolean
  hasAttachments?: boolean
  canEdit?: boolean
  now?: number
}): boolean {
  if (params.canEdit != null) return params.canEdit
  if (!params.isMine || params.unsent) return false
  if (params.hasAttachments) return false
  return messageAgeMs(params.createdAt, params.now) <= DM_EDIT_WINDOW_MS
}

export function unsentAuditLabel(isMine: boolean, senderName?: string): string {
  if (isMine) return "You unsent a message"
  const name = senderName?.trim()
  return name ? `${name} unsent a message` : "Message unsent"
}

export function messagePlainTextForEdit(body: string): string {
  return body
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
