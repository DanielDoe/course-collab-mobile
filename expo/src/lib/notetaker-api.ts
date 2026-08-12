import { createAudioPlayer } from "expo-audio"
import { API_BASE_URL } from "../constants"
import type { StudentSession } from "./session"
import { ApiError } from "./student-api"

export type NotetakerKeyPoints = {
  shortSummary: string
  keyConcepts: string[]
  importantDefinitions: string[]
  actionItems: string[]
  possibleQuizQuestions: string[]
}

export type NotetakerNote = {
  id: number
  slug?: string
  title: string
  course_name: string | null
  lecture_date: string | null
  processing_status: string
  duration_seconds?: number | null
  created_at?: string
}

export type NotetakerNoteDetail = NotetakerNote & {
  audio_storage_key?: string | null
  audio_mime?: string | null
  transcript?: string | null
  summary?: string | null
  key_points?: NotetakerKeyPoints | null
  failure_reason?: string | null
  updated_at?: string
}

export type NotetakerLimits = {
  tier: string
  maxNoteDurationMinutes: number
  transcriptionMinutes: number
  maxNotesPerMonth: number
  chatEnabled: boolean
  maxChatMessagesPerMonth?: number
}

export type NotetakerUsage = {
  notesThisMonth: number
  transcriptionMinutesUsed: number
}

export type NotetakerListResponse = {
  notes: NotetakerNote[]
  limits: NotetakerLimits
  usage: NotetakerUsage
}

export type NotetakerNoteResponse = {
  note: NotetakerNoteDetail
  limits?: NotetakerLimits
}

export type NotetakerChatMessage = {
  role: "user" | "assistant"
  text: string
}

export type NotetakerChatResponse = {
  reply: string
}

export class NotetakerTierError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 403, details)
    this.name = "NotetakerTierError"
  }
}

function headers(session: StudentSession, json = false): HeadersInit {
  const base: Record<string, string> = {
    Accept: "application/json",
    "x-student-database-id": session.databaseId,
  }
  if (json) base["Content-Type"] = "application/json"
  return base
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error
  }
  return fallback
}

function tierErrorIfNeeded(response: Response, body: unknown): void {
  if (response.status !== 403) return
  const code =
    typeof body === "object" && body !== null && "code" in body
      ? (body as { code?: string }).code
      : undefined
  if (code === "NOTETAKER_TIER") {
    throw new NotetakerTierError(errorMessage(body, "Upgrade required for AI Notetaker."), body)
  }
}

function listUrl(session: StudentSession, q?: string, limit = 15): string {
  const params = new URLSearchParams({
    studentDatabaseId: session.databaseId,
    limit: String(limit),
  })
  if (q?.trim()) params.set("q", q.trim())
  return `/api/student/ai-notetaker?${params.toString()}`
}

export function notetakerNoteSegment(note: Pick<NotetakerNote, "id" | "slug"> | string): string {
  if (typeof note === "string") return encodeURIComponent(note)
  return encodeURIComponent(note.slug ?? String(note.id))
}

export function notetakerAudioUrl(session: StudentSession, noteRef: string): string {
  const seg = notetakerNoteSegment(noteRef)
  return `${API_BASE_URL}/api/student/ai-notetaker/${seg}/audio?studentDatabaseId=${encodeURIComponent(session.databaseId)}`
}

export function isNotetakerProcessing(status: string): boolean {
  return status === "transcribing" || status === "summarizing" || status === "draft"
}

export const notetakerApi = {
  async list(session: StudentSession, q?: string): Promise<NotetakerListResponse> {
    const url = `${API_BASE_URL}${listUrl(session, q)}`
    const response = await fetch(url, { headers: headers(session) })
    const body = await parseBody(response)
    tierErrorIfNeeded(response, body)

    if (!response.ok) {
      throw new ApiError(errorMessage(body, `Request failed (${response.status})`), response.status, body)
    }

    return body as NotetakerListResponse
  },

  async createNote(
    session: StudentSession,
    payload?: { title?: string; course_name?: string | null; lecture_date?: string | null },
  ): Promise<NotetakerNoteDetail> {
    const url = `${API_BASE_URL}/api/student/ai-notetaker`
    const response = await fetch(url, {
      method: "POST",
      headers: headers(session, true),
      body: JSON.stringify({
        studentDatabaseId: session.databaseId,
        title: payload?.title,
        course_name: payload?.course_name,
        lecture_date: payload?.lecture_date,
      }),
    })
    const body = await parseBody(response)
    tierErrorIfNeeded(response, body)

    if (!response.ok) {
      throw new ApiError(errorMessage(body, "Could not create note"), response.status, body)
    }

    return (body as NotetakerNoteResponse).note
  },

  async getNote(session: StudentSession, noteRef: string): Promise<NotetakerNoteResponse> {
    const seg = notetakerNoteSegment(noteRef)
    const url = `${API_BASE_URL}/api/student/ai-notetaker/${seg}?studentDatabaseId=${encodeURIComponent(session.databaseId)}`
    const response = await fetch(url, { headers: headers(session) })
    const body = await parseBody(response)
    tierErrorIfNeeded(response, body)

    if (!response.ok) {
      throw new ApiError(errorMessage(body, "Could not load note"), response.status, body)
    }

    return body as NotetakerNoteResponse
  },

  async sendChatMessage(
    session: StudentSession,
    noteRef: string,
    message: string,
  ): Promise<NotetakerChatResponse> {
    const seg = notetakerNoteSegment(noteRef)
    const url = `${API_BASE_URL}/api/student/ai-notetaker/${seg}/chat`
    const response = await fetch(url, {
      method: "POST",
      headers: headers(session, true),
      body: JSON.stringify({
        studentDatabaseId: session.databaseId,
        message,
      }),
    })
    const body = await parseBody(response)
    tierErrorIfNeeded(response, body)

    if (!response.ok) {
      const upgrade =
        typeof body === "object" &&
        body !== null &&
        "upgrade" in body &&
        Boolean((body as { upgrade?: boolean }).upgrade)
      const msg = errorMessage(body, "Could not send message")
      throw new ApiError(msg, response.status, { ...(body as object), upgrade })
    }

    return body as NotetakerChatResponse
  },

  async patchNote(
    session: StudentSession,
    noteRef: string,
    payload: { title?: string; course_name?: string | null; lecture_date?: string | null },
  ): Promise<NotetakerNoteDetail> {
    const seg = notetakerNoteSegment(noteRef)
    const url = `${API_BASE_URL}/api/student/ai-notetaker/${seg}?studentDatabaseId=${encodeURIComponent(session.databaseId)}`
    const response = await fetch(url, {
      method: "PATCH",
      headers: headers(session, true),
      body: JSON.stringify({
        studentDatabaseId: session.databaseId,
        ...payload,
      }),
    })
    const body = await parseBody(response)
    tierErrorIfNeeded(response, body)

    if (!response.ok) {
      throw new ApiError(errorMessage(body, "Could not save changes"), response.status, body)
    }

    return (body as NotetakerNoteResponse).note
  },

  async uploadAudio(
    session: StudentSession,
    noteRef: string,
    file: { uri: string; name: string; type: string },
    options: { durationSeconds: number; displayTitle?: string },
  ): Promise<NotetakerNoteDetail> {
    const seg = notetakerNoteSegment(noteRef)
    const url = `${API_BASE_URL}/api/student/ai-notetaker/${seg}/audio`
    const form = new FormData()
    form.append("studentDatabaseId", session.databaseId)
    form.append("durationSeconds", String(Math.max(0, Math.round(options.durationSeconds))))
    if (options.displayTitle?.trim()) {
      form.append("displayTitle", options.displayTitle.trim())
    }
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type || "audio/m4a",
    } as unknown as Blob)

    const response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "x-student-database-id": session.databaseId },
      body: form,
    })
    const body = await parseBody(response)
    tierErrorIfNeeded(response, body)

    if (!response.ok) {
      throw new ApiError(errorMessage(body, "Audio processing failed"), response.status, body)
    }

    return (body as NotetakerNoteResponse).note
  },

  async deleteNote(session: StudentSession, note: Pick<NotetakerNote, "id" | "slug">): Promise<void> {
    const seg = notetakerNoteSegment(note)
    const url = `${API_BASE_URL}/api/student/ai-notetaker/${seg}?studentDatabaseId=${encodeURIComponent(session.databaseId)}`
    const response = await fetch(url, { method: "DELETE", headers: headers(session) })
    const body = await parseBody(response)
    if (!response.ok) {
      throw new ApiError(errorMessage(body, "Delete failed"), response.status, body)
    }
  },
}

export async function resolveLocalAudioDurationSeconds(uri: string, fallback = 60): Promise<number> {
  const player = createAudioPlayer({ uri })
  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (player.isLoaded && player.duration > 0) {
        return Math.max(1, Math.round(player.duration))
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return fallback
  } finally {
    player.remove()
  }
}

export async function processNotetakerAudio(
  session: StudentSession,
  params: {
    uri: string
    fileName: string
    mimeType: string
    durationSeconds: number
    title: string
    courseName?: string | null
    lectureDate?: string | null
  },
): Promise<NotetakerNoteDetail> {
  const draft = await notetakerApi.createNote(session, {
    title: params.title,
    course_name: params.courseName ?? null,
    lecture_date: params.lectureDate ?? null,
  })
  const noteRef = draft.slug ?? String(draft.id)
  return notetakerApi.uploadAudio(
    session,
    noteRef,
    { uri: params.uri, name: params.fileName, type: params.mimeType },
    { durationSeconds: params.durationSeconds, displayTitle: params.title },
  )
}
