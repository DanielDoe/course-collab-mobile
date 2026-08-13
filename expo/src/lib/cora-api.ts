import { API_BASE_URL } from "../constants"
import { mfaTrustRequestHeadersForStudent } from "./mfa-device-trust"
import { mergeCookieHeaders, persistHttpCookiesFromResponse, studentHttpCookieHeader } from "./student-http-cookies"
import { ApiError } from "./student-api"
import type { StudentSession } from "./session"
import type { CoraMode, CoraProblem, CoraSessionResponse } from "./cora-types"
import type { PreparedCoraRequest } from "./cora-rbac/prepare-request"
import {
  normalizeQuestionContentForRender,
  resolveImportedQuestionMedia,
  type QuestionMedia,
} from "./classroom-submission"

async function coraHeaders(session: StudentSession): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-student-id": session.databaseId,
  }
  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForStudent(session)
  Object.assign(headers, mergeCookieHeaders(trust.Cookie, jarCookie))
  return headers
}

async function coraRequest<T>(
  session: StudentSession,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(await coraHeaders(session)),
      ...init?.headers,
    },
  })

  let body: unknown = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status, body)
  }

  await persistHttpCookiesFromResponse(url, response.headers)
  return body as T
}

export async function exportWorkspaceToNotes(
  session: StudentSession,
  messages: { role: string; content: string }[],
): Promise<{ ok?: boolean; error?: string; noteId?: number; title?: string; message?: string }> {
  return coraRequest(session, "/api/cora/workspace-actions", {
    method: "POST",
    body: JSON.stringify({ action: "export_note", messages, confirmed: true }),
  })
}

export type AutomateStudyPlanResult = {
  ok?: boolean
  error?: string
  message?: string
  noteId?: number
  noteTitle?: string
  eventsCreated?: number
  sessionsScheduled?: number
  reminderMinutes?: number
  focusTopics?: string[]
  flashcardDecks?: { deckId?: number; deckTitle?: string; cardCount?: number; topic?: string }[]
  practiceQuizzes?: { attemptId?: number; topic?: string; questionCount?: number }[]
  href?: string
}

export async function automateStudyPlan(
  session: StudentSession,
  messages: { role: string; content: string }[],
  options?: { title?: string; reminderMinutes?: number },
): Promise<AutomateStudyPlanResult> {
  return coraRequest(session, "/api/cora/workspace-actions", {
    method: "POST",
    body: JSON.stringify({
      action: "automate_study_plan",
      messages,
      title: options?.title ?? "My Study Plan",
      reminderMinutes: options?.reminderMinutes ?? 30,
      confirmed: true,
    }),
  })
}

export async function startCoraSession(
  session: StudentSession,
  problem: CoraProblem,
  mode: CoraMode,
  prepared?: PreparedCoraRequest,
): Promise<CoraSessionResponse> {
  return coraRequest<CoraSessionResponse>(session, "/api/cora/session", {
    method: "POST",
    body: JSON.stringify({
      ...problem,
      mode,
      ...(prepared ? prepared.accessBody : {}),
    }),
  })
}

export async function getWorkspaceConversations(session: StudentSession) {
  const url = `${API_BASE_URL}/api/cora/workspace-conversations`
  const response = await fetch(url, {
    headers: await coraHeaders(session),
    credentials: "include",
  })

  if (response.status === 401) return []

  let body: { conversations?: unknown[]; error?: string } = {}
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text) as typeof body
    } catch {
      body = { error: text }
    }
  }

  if (!response.ok) {
    throw new ApiError(body.error ?? `Request failed (${response.status})`, response.status, body)
  }

  return body.conversations ?? []
}

export async function syncWorkspaceConversations(
  session: StudentSession,
  conversations: unknown[],
): Promise<void> {
  if (conversations.length === 0) return

  await coraRequest(session, "/api/cora/workspace-conversations", {
    method: "PUT",
    body: JSON.stringify({ conversations }),
  })
}

export async function deleteWorkspaceConversation(
  session: StudentSession,
  conversationId: string,
): Promise<void> {
  const url = `${API_BASE_URL}/api/cora/workspace-conversations/${encodeURIComponent(conversationId)}`
  const response = await fetch(url, {
    method: "DELETE",
    headers: await coraHeaders(session),
    credentials: "include",
  })

  if (response.status === 401 || response.status === 404) return

  if (!response.ok) {
    let body: { error?: string } = {}
    const text = await response.text()
    if (text) {
      try {
        body = JSON.parse(text) as typeof body
      } catch {
        body = { error: text }
      }
    }
    throw new ApiError(body.error ?? `Request failed (${response.status})`, response.status, body)
  }

  await persistHttpCookiesFromResponse(url, response.headers)
}

export type CoraQuestionImportSource = {
  key: string
  label: string
  description: string
  count: number
}

export type CoraQuestionImportContainer = {
  id: string
  label: string
  subtitle: string
  count: number
  locked?: boolean
  lockReason?: string | null
  accessStatus?: "unattempted" | "in_progress" | "completed"
}

export type CoraQuestionImportItem = {
  ref: string
  source: string
  group: string
  label: string
  preview: string
  bankQuestionId: number
  questionId?: string | number
  quizId?: number
  lectureId?: number
  classroomSubmissionId?: number
}

export type CoraImportedProblem = {
  source?: string
  domain?: string
  title?: string
  topic?: string
  questionText: string
  questionType?: string
  expectedAnswer?: string | null
  hint?: string | null
  explanation?: string | null
  bankQuestionId?: number
  questionId?: number | string
  quizId?: number
  lectureId?: number
  classroomSubmissionId?: number
  studentDatabaseId?: string | number
  mediaUrl?: string | null
  questionMedia?: QuestionMedia | null
  question_media?: QuestionMedia | null
  referenceSteps?: string[]
  options?: unknown
  choices?: unknown
}

function readOptionalString(value: unknown): string | null | undefined {
  if (value == null) return value as null | undefined
  const trimmed = String(value).trim()
  return trimmed || null
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.map((entry) => String(entry).trim()).filter(Boolean)
  return items.length > 0 ? items : undefined
}

/** Normalize `/api/cora/question-import` payloads into a stable Cora import shape. */
export function normalizeImportedProblem(problem: CoraImportedProblem): CoraImportedProblem {
  const raw = problem as CoraImportedProblem & {
    question_text?: string
    expected_answer?: string | null
    question_type?: string
    reference_steps?: string[]
  }

  const questionMedia = resolveImportedQuestionMedia(problem)
  const rawQuestionText = readOptionalString(raw.questionText ?? raw.question_text) ?? ""
  const questionText = rawQuestionText ? normalizeQuestionContentForRender(rawQuestionText) : ""
  const expectedAnswer = readOptionalString(raw.expectedAnswer ?? raw.expected_answer)
  const explanation = readOptionalString(raw.explanation)
  const hint = readOptionalString(raw.hint)
  const referenceSteps = raw.referenceSteps ?? readStringArray(raw.reference_steps)

  return {
    ...problem,
    source: readOptionalString(raw.source) ?? raw.source,
    domain: readOptionalString(raw.domain) ?? raw.domain,
    title: readOptionalString(raw.title) ?? raw.title,
    topic: readOptionalString(raw.topic) ?? raw.topic,
    questionText,
    questionType: readOptionalString(raw.questionType ?? raw.question_type) ?? raw.questionType ?? raw.question_type,
    expectedAnswer: expectedAnswer ?? null,
    hint: hint ?? null,
    explanation: explanation ?? null,
    referenceSteps,
    questionMedia,
    question_media: questionMedia,
    mediaUrl: questionMedia?.media_url ?? readOptionalString(raw.mediaUrl) ?? null,
  }
}

function questionImportPath(session: StudentSession, params: Record<string, string>): string {
  const search = new URLSearchParams(params)
  if (session.courseId != null && Number.isFinite(session.courseId)) {
    search.set("courseId", String(session.courseId))
  }
  return `/api/cora/question-import?${search.toString()}`
}

export async function getCoraQuestionImportSources(session: StudentSession) {
  return coraRequest<{ sources: CoraQuestionImportSource[] }>(
    session,
    questionImportPath(session, { level: "sources" }),
  )
}

export async function getCoraQuestionImportContainers(session: StudentSession, sourceKey: string) {
  return coraRequest<{ containers: CoraQuestionImportContainer[] }>(
    session,
    questionImportPath(session, { level: "containers", sourceKey }),
  )
}

export async function getCoraQuestionImportItems(
  session: StudentSession,
  sourceKey: string,
  containerId: string,
) {
  return coraRequest<{ items: CoraQuestionImportItem[] }>(
    session,
    questionImportPath(session, {
      level: "questions",
      sourceKey,
      containerId,
    }),
  )
}

export async function resolveCoraQuestionImport(
  session: StudentSession,
  item: CoraQuestionImportItem,
): Promise<CoraImportedProblem> {
  const body: Record<string, unknown> = {
    source: item.source,
    bankQuestionId: item.bankQuestionId,
  }
  if (session.courseId != null && Number.isFinite(session.courseId)) {
    body.courseId = session.courseId
  }
  if (item.questionId != null) body.questionId = item.questionId
  if (item.quizId != null) body.quizId = item.quizId
  if (item.lectureId != null) body.lectureId = item.lectureId
  if (item.classroomSubmissionId != null) body.classroomSubmissionId = item.classroomSubmissionId

  const res = await coraRequest<{ problem: CoraImportedProblem }>(session, "/api/cora/question-import", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return normalizeImportedProblem(res.problem)
}
