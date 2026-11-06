import { getApiBaseUrl } from "../constants"
import { ApiError } from "./api"
import { assertProductionHttpsUrl, createApiAbortSignal } from "./http"
import type { MessageDeleteMode, MessageEditVersion } from "./message-lifecycle"
import { mfaTrustRequestHeadersForInstructor } from "./mfa-device-trust"
import {
  getStoredSession,
  type AppSession,
  type FacultySession,
  type GuestSession,
  type StudentSession,
  type SummerSession,
} from "./session"
import { studentAuthenticatedHeaders, studentAuthenticatedRequest } from "./student-api"
import { mergeCookieHeaders, persistHttpCookiesFromResponse, studentHttpCookieHeader } from "./student-http-cookies"
import { headersHaveStudentSessionProof, STUDENT_REFRESH_HEADER } from "./student-session-proof"
import { getStoredRefreshToken } from "./refresh-token-store"
import {
  inferMessageAttachmentMime,
  isPersistedMessageAttachmentUrl,
} from "./messages-media"
import {
  cacheDirectory,
  copyAsync,
  FileSystemUploadType,
  uploadAsync,
} from "expo-file-system/legacy"

const MESSAGE_UPLOAD_TIMEOUT_MS = 90_000

function safeUploadFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || `photo-${Date.now()}.jpg`
}

/** Copy picker/asset URIs into a stable cache file:// path for multipart upload. */
async function localFileUriForUpload(uri: string, fileName: string): Promise<string> {
  const base = cacheDirectory
  if (!base) return uri
  const dest = `${base}messages-upload-${Date.now()}-${safeUploadFileName(fileName)}`
  if (uri === dest) return uri
  try {
    await copyAsync({ from: uri, to: dest })
    return dest
  } catch {
    // Some file:// URIs are already readable by uploadAsync.
    return uri
  }
}

function uploadFailureMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  const name = err instanceof Error ? err.name : ""
  const message = err instanceof Error ? err.message : String(err ?? "")
  if (name === "AbortError" || /aborted|timed out|timeout/i.test(message)) {
    return "Upload timed out. Try a smaller photo or check your connection."
  }
  if (/network request failed|failed to fetch|network error/i.test(message)) {
    return "Network error while uploading. Check your connection and try again."
  }
  if (message.trim()) return message
  return "Could not upload file."
}

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
  /** Local file:// URI for composer thumbnail while / after upload. */
  localPreviewUri?: string | null
  /** Client-only upload lifecycle for the composer strip. */
  uploadState?: "uploading" | "ready" | "error"
  /** Stable key for in-flight uploads before fileUrl exists. */
  localKey?: string
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
  | { kind: "student"; databaseId: string; courseId?: number | null; section?: string | null }
  | { kind: "instructor"; instructorId: number }

export function messagesAuthFromSession(session: AppSession | null): MessagesAuth | null {
  if (!session) return null
  if (session.portal === "student") {
    return {
      kind: "student",
      databaseId: session.databaseId,
      courseId: session.courseId,
      section: session.section,
    }
  }
  if (session.portal === "guest" || session.portal === "summer") {
    return { kind: "student", databaseId: session.databaseId }
  }
  if (session.portal === "faculty") {
    return { kind: "instructor", instructorId: session.id }
  }
  return null
}

export function resolveAttachmentUrl(fileUrl: string): string {
  if (!fileUrl) return ""
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl
  return `${getApiBaseUrl()}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`
}

function normalizeAttachment(raw: unknown): MessageAttachment | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const id = Number(row.id)
  const fileUrl = String(row.fileUrl ?? row.file_url ?? "").trim()
  const fileName = String(row.fileName ?? row.file_name ?? "").trim() || "Attachment"
  if (!fileUrl) return null
  // Tolerate missing/stringy ids from older API payloads; prefer a stable positive id when present.
  const resolvedId =
    Number.isFinite(id) && id > 0
      ? id
      : Math.abs(
          Array.from(fileUrl).reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) | 0, 0),
        ) || 1
  return {
    id: resolvedId,
    fileName,
    fileUrl,
    mimeType: row.mimeType != null ? String(row.mimeType) : row.mime_type != null ? String(row.mime_type) : null,
    fileSize:
      row.fileSize != null
        ? Number(row.fileSize)
        : row.file_size != null
          ? Number(row.file_size)
          : null,
  }
}

function normalizeThreadMessage(raw: ThreadMessage): ThreadMessage {
  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.map(normalizeAttachment).filter((a): a is MessageAttachment => a != null)
    : []
  return {
    ...raw,
    body: raw.body == null ? "" : String(raw.body),
    attachments,
  }
}

function normalizeThreadDetail(thread: ThreadDetail): ThreadDetail {
  return {
    ...thread,
    messages: (thread.messages ?? []).map(normalizeThreadMessage),
  }
}

function refreshTokenFromCookieHeader(cookie: string | undefined): string | undefined {
  if (!cookie) return undefined
  const match = cookie.match(/(?:^|;\s*)cc_refresh=([^;]+)/i)
  const token = match?.[1]?.trim()
  return token || undefined
}

function learnerSessionMatchingAuth(
  stored: AppSession | null,
  auth: Extract<MessagesAuth, { kind: "student" }>,
): StudentSession | GuestSession | SummerSession | null {
  if (!stored) return null
  if (stored.portal !== "student" && stored.portal !== "guest" && stored.portal !== "summer") {
    return null
  }
  if (stored.databaseId !== auth.databaseId) return null
  return stored
}

async function instructorAuthenticatedHeaders(
  auth: Extract<MessagesAuth, { kind: "instructor" }>,
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "x-instructor-id": String(auth.instructorId),
    ...extra,
  }
  const stored = await getStoredSession()
  const faculty = stored?.portal === "faculty" ? stored : undefined
  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForInstructor(faculty)
  Object.assign(headers, mergeCookieHeaders(trust.Cookie, jarCookie))
  const refresh =
    refreshTokenFromCookieHeader(jarCookie) ??
    refreshTokenFromCookieHeader(trust.Cookie) ??
    (await getStoredRefreshToken()) ??
    undefined
  if (refresh) headers[STUDENT_REFRESH_HEADER] = refresh
  if (!headersHaveStudentSessionProof(headers)) {
    throw new ApiError("Instructor authentication required", 401)
  }
  return headers
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
  if (auth.kind === "student") {
    const stored = await getStoredSession()
    const session = learnerSessionMatchingAuth(stored, auth)
    if (!session) {
      throw new ApiError("Student authentication required", 401)
    }
    return studentAuthenticatedRequest<T>(session, path, init)
  }

  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`
  assertProductionHttpsUrl(url)
  const extra: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (init?.body && !extra["Content-Type"]) {
    extra["Content-Type"] = "application/json"
  }
  const headers = await instructorAuthenticatedHeaders(auth, extra)
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
    signal: createApiAbortSignal(undefined, init?.signal ?? undefined),
  })
  const body = await parseJsonResponse(response)
  if (!response.ok) {
    throw new ApiError(errorMessage(body, response.status), response.status, body)
  }
  await persistHttpCookiesFromResponse(url, response.headers)
  return body as T
}

export const messagesApi = {
  listThreads(auth: MessagesAuth) {
    return messagesRequest<{ threads: ThreadSummary[] }>(auth, "/api/messages/threads")
  },

  getThread(auth: MessagesAuth, threadId: number) {
    return messagesRequest<{ thread: ThreadDetail }>(auth, `/api/messages/threads/${threadId}`).then(
      (data) => ({
        thread: normalizeThreadDetail(data.thread),
      }),
    )
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
    ).then((data) => ({
      ...data,
      thread: data.thread ? normalizeThreadDetail(data.thread) : undefined,
    }))
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
    ).then((data) => ({
      message: normalizeThreadMessage(data.message),
    }))
  },

  async uploadAttachment(
    auth: MessagesAuth,
    file: { uri: string; name: string; mimeType: string },
  ): Promise<MessageAttachmentDraft> {
    const url = `${getApiBaseUrl()}/api/messages/attachments`
    assertProductionHttpsUrl(url)

    let headers: Record<string, string>
    if (auth.kind === "student") {
      const stored = await getStoredSession()
      const session = learnerSessionMatchingAuth(stored, auth)
      if (!session) {
        throw new ApiError("Student authentication required", 401)
      }
      headers = await studentAuthenticatedHeaders(session)
    } else {
      headers = await instructorAuthenticatedHeaders(auth)
    }
    delete headers["Content-Type"]
    headers.Accept = "application/json"

    const localUri = await localFileUriForUpload(file.uri, file.name)
    let body: unknown = null
    let status = 0

    try {
      // Native multipart is more reliable than RN FormData+fetch for photo library URIs.
      const result = await uploadAsync(url, localUri, {
        httpMethod: "POST",
        uploadType: FileSystemUploadType.MULTIPART,
        fieldName: "file",
        mimeType: file.mimeType,
        headers,
      })
      status = result.status
      if (result.body) {
        try {
          body = JSON.parse(result.body)
        } catch {
          body = { error: result.body }
        }
      }
    } catch (uploadErr) {
      const formData = new FormData()
      formData.append("file", {
        uri: localUri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob)
      try {
        const response = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers,
          body: formData,
          signal: createApiAbortSignal(MESSAGE_UPLOAD_TIMEOUT_MS),
        })
        status = response.status
        body = await parseJsonResponse(response)
        await persistHttpCookiesFromResponse(url, response.headers)
      } catch (fetchErr) {
        throw new ApiError(uploadFailureMessage(fetchErr ?? uploadErr), 0)
      }
    }

    if (!(status >= 200 && status < 300)) {
      throw new ApiError(errorMessage(body, status || 500), status || 500, body)
    }
    const draft = normalizeAttachmentDraft(body, file)
    if (!draft) {
      throw new ApiError("Upload did not return a usable file URL. Try again.", 502, body)
    }
    return draft
  },
}

function normalizeAttachmentDraft(
  body: unknown,
  file: { name: string; mimeType: string },
): MessageAttachmentDraft | null {
  if (!body || typeof body !== "object") return null
  const row = body as Record<string, unknown>
  const fileUrl = String(row.fileUrl ?? row.file_url ?? "").trim()
  if (!isPersistedMessageAttachmentUrl(fileUrl)) return null
  const fileName = String(row.fileName ?? row.file_name ?? "").trim() || file.name
  const mimeRaw =
    row.mimeType != null
      ? String(row.mimeType)
      : row.mime_type != null
        ? String(row.mime_type)
        : file.mimeType
  const fileSize =
    row.fileSize != null
      ? Number(row.fileSize)
      : row.file_size != null
        ? Number(row.file_size)
        : null
  return {
    fileName,
    fileUrl,
    mimeType: inferMessageAttachmentMime(fileName, mimeRaw, fileUrl),
    fileSize: Number.isFinite(fileSize) ? fileSize : null,
  }
}

export type MessagesSession = StudentSession | GuestSession | SummerSession | FacultySession
