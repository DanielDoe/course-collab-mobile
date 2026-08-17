import { messageCourseImportPreview } from "./message-course-import"
import { unsentAuditLabel } from "./message-lifecycle"

/** Strip HTML tags for mobile message previews and plain-text display. */
export function stripMessageHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

export function messagePreviewText(body: string, max = 120): string {
  const importPreview = messageCourseImportPreview(body, max)
  if (importPreview) return importPreview

  const text = stripMessageHtml(body) || body.trim()
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export function threadMessagePreview(message: {
  body: string
  unsent?: boolean
  isMine?: boolean
  senderName?: string
}, max = 120): string {
  if (message.unsent) return unsentAuditLabel(Boolean(message.isMine), message.senderName)
  return messagePreviewText(message.body, max)
}

export function looksLikeHtml(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body)
}

export function formatMessageWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const now = new Date()
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return time

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  if (isYesterday) return `Yesterday ${time}`

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function messageInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
}

export type MessageDeliveryStatus = "sent" | "delivered" | "read"

export function resolveMessageDeliveryStatus(
  createdAt: string,
  otherLastReadAt: string | null | undefined,
): MessageDeliveryStatus {
  if (!otherLastReadAt) return "delivered"

  const messageTime = new Date(createdAt).getTime()
  const readTime = new Date(otherLastReadAt).getTime()
  if (Number.isFinite(messageTime) && Number.isFinite(readTime) && readTime >= messageTime) {
    return "read"
  }

  return "delivered"
}

export function deliveryStatusLabel(status: MessageDeliveryStatus): string {
  switch (status) {
    case "read":
      return "Read"
    case "delivered":
      return "Delivered"
    default:
      return "Sent"
  }
}

export function formatMessageMetaLine(
  createdAt: string,
  options?: {
    deliveryStatus?: MessageDeliveryStatus
    otherLastReadAt?: string | null
    showReceipt?: boolean
  },
): string {
  const when = formatMessageWhen(createdAt)
  if (!options?.showReceipt) return when

  const status =
    options.deliveryStatus ??
    resolveMessageDeliveryStatus(createdAt, options.otherLastReadAt)

  return `${deliveryStatusLabel(status)} · ${when}`
}
