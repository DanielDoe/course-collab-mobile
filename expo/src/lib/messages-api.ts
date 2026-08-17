import { getApiBaseUrl } from "../constants"
import { ApiError } from "./api"
import type { MessageDeleteMode, MessageEditVersion } from "./message-lifecycle"
import type { AppSession, FacultySession, GuestSession, StudentSession, SummerSession } from "./session"

export type ParticipantKind = "student" | "instructor"

export type MessageRecipient = {
  kind: ParticipantKind
  id: number
  displayName: string
  email: string | null
  subtitle: string
}

export type MessageDeliveryStatus = "sent" | "delivered" | "read"

export type ThreadSummary = {
  id: number
  subject: string | null
  updatedAt: string
  unreadCount: number
  otherParticipant: MessageRecipient
  lastMessage: {
    body: string
    createdAt: string
    senderKind: ParticipantKind
    senderId: number
    deliveryStatus?: MessageDeliveryStatus
  } | null
}

export type MessageAttachment = {
  id: number
  fileName: string
  fileUrl: string
  mimeType: string | null
  fileSize: number | null
}

export type MessageReactionGroup = {
  emoji: string
  count: number
  reactedByMe: boolean
}

export type ThreadMessage = {
  id: number
  senderKind: ParticipantKind
  senderId: number
  senderName: string
  subject: string | null
  body: string
  createdAt: string
  isMine: boolean
  deliveryStatus?: MessageDeliveryStatus
  attachments: MessageAttachment[]
  reactions: MessageReactionGroup[]
  unsent?: boolean
  unsentAt?: string | null
  unsentByMe?: boolean
  edited?: boolean
  editedAt?: string | null
  editHistory?: MessageEditVersion[]
  canUnsend?: boolean
  canEdit?: boolean
}

export type ThreadDetail = {
  id: number
  subject: string | null
  otherParticipant: MessageRecipient
  otherLastReadAt?: string | null
  messages: ThreadMessage[]
}

export type MessageAttachmentDraft = {
  fileName: string
  fileUrl: string
  mimeType?: string | null
  fileSize?: number | null
}

export type MessageProfileField = {
  label: string
  value: string
}

export type MessageParticipantProfile = {
  kind: ParticipantKind
  id: number
  displayName: string
  subtitle: string
  userCategory: string
  categoryLabel: string
  email: string | null
  avatarInitials: string
  fields: MessageProfileField[]
}

export type MessagesAuth =
  | { kind: "student"; databaseId: string }
  | { kind: "instructor"; instructorId: number }

export function messagesAuthFromSession(session: AppSession | null): MessagesAuth | null {
  if (!session) return null
  if (session.portal === "student" || session.portal === "guest" || session.portal === "summer") {
    return { kind: "student", databaseId: session.databaseId }
  }
  if (session.portal === "faculty") {
    return { kind: "instructor", instructorId: session.id }
  }
  return null
}

export function resolveAttachmentUrl(fileUrl: string): string {
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl
  return `${getApiBaseUrl()}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`
}

function authHeaders(auth: MessagesAuth): Record<string, string> {
  if (auth.kind === "student") {
    return {
      Accept: "application/json",
      "x-student-id": auth.databaseId,
    }
  }
  return {
    Accept: "application/json",
    "x-instructor-id": String(auth.instructorId),
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

function sanitizeErrorText(text: string, status: number): string {
  if (text.includes("<!DOCTYPE") || text.includes("<html")) {
    return status >= 500
      ? `Messages service error (${status}). The server returned an error — not a connection problem.`
      : `Request failed (${status}). Please try again.`
  }
  return text.length > 200 ? `${text.slice(0, 200)}…` : text
}

function errorMessage(body: unknown, status: number): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return sanitizeErrorText((body as { error: string }).error, status)
  }
  return status >= 500
    ? `Messages service error (${status}). Please try again later.`
    : `Request failed (${status})`
}

async function messagesRequest<T>(
  auth: MessagesAuth,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`
  const headers: Record<string, string> = {
    ...authHeaders(auth),
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (init?.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(url, { ...init, headers })
  const body = await parseJsonResponse(response)
  if (!response.ok) {
    throw new ApiError(errorMessage(body, response.status), response.status, body)
  }
  return body as T
}

export const messagesApi = {
  listThreads(auth: MessagesAuth) {
    return messagesRequest<{ threads: ThreadSummary[] }>(auth, "/api/messages/threads")
  },

  getThread(auth: MessagesAuth, threadId: number) {
    return messagesRequest<{ thread: ThreadDetail }>(auth, `/api/messages/threads/${threadId}`)
  },

  getParticipantProfile(auth: MessagesAuth, kind: ParticipantKind, participantId: number) {
    return messagesRequest<{ profile: MessageParticipantProfile }>(
      auth,
      `/api/messages/participants/${kind}/${participantId}/profile`,
    )
  },

  searchRecipients(auth: MessagesAuth, query: string) {
    const q = encodeURIComponent(query.trim())
    return messagesRequest<{ recipients: MessageRecipient[] }>(auth, `/api/messages/recipients?q=${q}`)
  },

  createThread(
    auth: MessagesAuth,
    payload: {
      recipientKind: ParticipantKind
      recipientId: number
      subject?: string | null
      body: string
      attachments?: MessageAttachmentDraft[]
    },
  ) {
    return messagesRequest<{ threadId: number }>(auth, "/api/messages/threads", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  replyToThread(
    auth: MessagesAuth,
    threadId: number,
    payload: {
      body: string
      subject?: string | null
      attachments?: MessageAttachmentDraft[]
    },
  ) {
    return messagesRequest<{ thread?: ThreadDetail; threadId?: number }>(
      auth,
      `/api/messages/threads/${threadId}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    )
  },

  toggleReaction(auth: MessagesAuth, threadId: number, messageId: number, emoji: string) {
    return messagesRequest<{ reactions: MessageReactionGroup[] }>(
      auth,
      `/api/messages/threads/${threadId}/messages/${messageId}/reactions`,
      {
        method: "POST",
        body: JSON.stringify({ emoji: emoji.normalize("NFC").trim() }),
      },
    )
  },

  markThreadUnread(auth: MessagesAuth, threadId: number) {
    return messagesRequest<{ success?: boolean }>(auth, `/api/messages/threads/${threadId}/unread`, {
      method: "POST",
    })
  },

  deleteMessage(
    auth: MessagesAuth,
    threadId: number,
    messageId: number,
    mode: MessageDeleteMode = "hide",
  ) {
    const normalizedMessageId = Number(messageId)
    if (!Number.isFinite(normalizedMessageId) || normalizedMessageId <= 0) {
      return Promise.reject(new ApiError("Invalid message", 400))
    }
    const query = mode === "unsend" ? "?mode=unsend" : "?mode=hide"
    return messagesRequest<{ success?: boolean; mode?: MessageDeleteMode }>(
      auth,
      `/api/messages/threads/${threadId}/messages/${normalizedMessageId}${query}`,
      { method: "DELETE" },
    )
  },

  editMessage(auth: MessagesAuth, threadId: number, messageId: number, body: string) {
    const normalizedMessageId = Number(messageId)
    if (!Number.isFinite(normalizedMessageId) || normalizedMessageId <= 0) {
      return Promise.reject(new ApiError("Invalid message", 400))
    }
    return messagesRequest<{ message: ThreadMessage }>(
      auth,
      `/api/messages/threads/${threadId}/messages/${normalizedMessageId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ body }),
      },
    )
  },

  async uploadAttachment(
    auth: MessagesAuth,
    file: { uri: string; name: string; mimeType: string },
  ): Promise<MessageAttachmentDraft> {
    const url = `${getApiBaseUrl()}/api/messages/attachments`
    const formData = new FormData()
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob)

    const response = await fetch(url, {
      method: "POST",
      headers: authHeaders(auth),
      body: formData,
    })
    const body = await parseJsonResponse(response)
    if (!response.ok) {
      throw new ApiError(errorMessage(body, response.status), response.status, body)
    }
    return body as MessageAttachmentDraft
  },
}

export type MessagesSession = StudentSession | GuestSession | SummerSession | FacultySession
