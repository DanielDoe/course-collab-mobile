import { API_BASE_URL } from "../constants"
import type { StudentSession } from "./session"
import { ApiError } from "./student-api"
import { mfaTrustRequestHeadersForStudent } from "./mfa-device-trust"
import { mergeCookieHeaders, persistHttpCookiesFromResponse, studentHttpCookieHeader } from "./student-http-cookies"
import type { CoraImportedProblem } from "./cora-api"
import type { CoraLearningMemory } from "./cora-preferences-storage"
import type { StudentContextPayload } from "./student-context-api"
import type { CoraChatFlow } from "./cora-study-plan-flows"
import type { CoraProgressDetailed } from "./cora-insights-types"
import type { CoraAccessEnvelope } from "./cora-rbac"
import { filterStudentContextForCora } from "./cora-rbac/context-policy"
import { recordCoraError, recordCoraSuccess } from "./cora-rbac/prepare-request"
import type { PreparedCoraRequest } from "./cora-rbac/prepare-request"

export type { CoraImportedProblem } from "./cora-api"

async function tutorHeaders(session: StudentSession): Promise<HeadersInit> {
  const base: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-student-id": session.databaseId,
  }
  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForStudent(session)
  Object.assign(base, mergeCookieHeaders(trust.Cookie, jarCookie))
  return base
}

async function request<T>(session: StudentSession, path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { ...(await tutorHeaders(session)), ...init?.headers },
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

export type AiTutorRecommendation = {
  id: string
  title: string
  description: string
  link: string
}

export type TopicMasteryItem = {
  topic: string
  mastery: number
  status?: "mastered" | "learning" | "review" | string
  questionsAsked?: number
  accuracy?: number
}

export type { CoraProgressDetailed } from "./cora-insights-types"

export type AiTutorStats = {
  totalQuestions: number
  weeklyProgress: number
  streakDays: number
  topicsMastered: number
  averageResponseTime: number
  satisfactionScore: number
}

export type AiTutorCredits = {
  credits: number
  tier: string
  creditsLimit: number | "unlimited"
  isUnlimited: boolean
}

export type ChatMessageVersion = {
  content: string
  importedQuestion?: CoraImportedProblem
  importedQuestionLabel?: string
  assistantContent?: string
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  importedQuestion?: CoraImportedProblem
  importedQuestionLabel?: string
  /** Present when the user edited and resent this turn. */
  versions?: ChatMessageVersion[]
  activeVersionIndex?: number
}

type AiTutorMessageResponse = {
  response?: string
  detectedTopic?: string
  isConfigured?: boolean
  accessDenied?: boolean
  creditsInsufficient?: boolean
  error?: string
  rbacBlocked?: boolean
  blockReason?: string
}

function normalizeHistoryRole(role: string): "user" | "assistant" {
  if (role === "user" || role === "student") return "user"
  return "assistant"
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Reveal assistant text in small chunks for a typing effect (works on React Native). */
async function revealText(
  text: string,
  onChunk: (part: string) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  const tokens = text.match(/\S+\s*|\n+|[^\S\n]+/g) ?? [text]
  for (const token of tokens) {
    if (signal?.aborted) return false
    onChunk(token)
    if (!token.trim()) continue
    const delay = token.length > 16 ? 28 : token.length > 8 ? 20 : 14
    await sleep(delay)
    if (signal?.aborted) return false
  }
  return true
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError"
}

export const aiTutorApi = {
  getStats: (session: StudentSession) =>
    request<{ stats: AiTutorStats; sessions: unknown[]; topicMastery: TopicMasteryItem[] }>(
      session,
      `/api/ai-tutor/stats?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getRecommendations: (session: StudentSession) =>
    request<{ recommendations: AiTutorRecommendation[] }>(
      session,
      `/api/ai-tutor/recommendations?studentId=${encodeURIComponent(session.databaseId)}`,
    ).catch(() => ({ recommendations: [] as AiTutorRecommendation[] })),

  getCredits: (session: StudentSession) =>
    request<AiTutorCredits>(
      session,
      `/api/ai-tutor/credits?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getStudentContext: (session: StudentSession) =>
    request<StudentContextPayload>(session, "/api/ai-tutor/student-context"),

  getProgressDetailed: (session: StudentSession) =>
    request<CoraProgressDetailed>(
      session,
      `/api/ai-tutor/progress-detailed?studentId=${encodeURIComponent(session.databaseId)}`,
    ).catch(() => ({
      conceptMastery: [],
      reasoningScore: 0,
      reasoningHistory: [],
      misconceptions: [],
      behaviorInsights: {},
      interactionTrends: {},
      conversationTimeline: [],
      conceptHeatmap: {},
    })),

  /**
   * Sends a tutor message using the same JSON API as the web dashboard, then
   * reveals the answer progressively for a native streaming feel.
   */
  async streamMessage(
    session: StudentSession,
    message: string,
    conversationHistory: { role: string; content: string }[],
    handlers: {
      onChunk: (text: string) => void
      onDone: () => void
      onError: (message: string) => void
      onAborted?: () => void
    },
    options?: {
      problemContext?: CoraImportedProblem | null
      studentContext?: StudentContextPayload | null
      platformContextBlock?: string
      useAgent?: boolean
      learningMemory?: CoraLearningMemory
      chatConfig?: { learningGoal?: string; flow?: CoraChatFlow }
      coraAccess?: CoraAccessEnvelope
      prepared?: PreparedCoraRequest
      signal?: AbortSignal
    },
  ): Promise<void> {
    const prepared = options?.prepared
    const signal = options?.signal
    try {
      if (signal?.aborted) {
        handlers.onAborted?.()
        return
      }
      const learningMemory = options?.learningMemory
      const useAgent = options?.useAgent !== false
      const platformBlock = !useAgent ? options?.platformContextBlock?.trim() : undefined
      const apiMessage = platformBlock
        ? `${platformBlock}\n\n---\n\nStudent message:\n${message}`
        : message

      const scopedContext = filterStudentContextForCora(options?.studentContext ?? null)

      const response = await fetch(`${API_BASE_URL}/api/ai-tutor`, {
        method: "POST",
        credentials: "include",
        headers: await tutorHeaders(session),
        signal,
        body: JSON.stringify({
          message: apiMessage,
          studentId: session.databaseId,
          useAgent,
          context: { topic: "auto-detect" },
          conversationHistory: conversationHistory.map((entry) => ({
            role: normalizeHistoryRole(entry.role),
            content: entry.content,
          })),
          ...(options?.problemContext ? { problemContext: options.problemContext } : {}),
          ...(scopedContext ? { studentContext: scopedContext } : {}),
          ...(learningMemory
            ? {
                learningMemory: {
                  "remember-gaps": learningMemory.rememberGaps,
                  "detect-confusion": learningMemory.detectConfusion,
                },
              }
            : {}),
          ...(options?.chatConfig ? { chatConfig: options.chatConfig } : {}),
          ...(options?.coraAccess ? { coraAccess: options.coraAccess } : {}),
          ...(prepared ? prepared.accessBody : {}),
        }),
      })

      if (signal?.aborted) {
        handlers.onAborted?.()
        return
      }

      let data: AiTutorMessageResponse
      try {
        data = (await response.json()) as AiTutorMessageResponse
      } catch {
        if (prepared) recordCoraError(prepared, message)
        handlers.onError("Could not read the Cora response.")
        return
      }

      if (data.accessDenied || data.rbacBlocked) {
        if (prepared) recordCoraError(prepared, message)
        handlers.onError(
          typeof data.blockReason === "string"
            ? data.blockReason
            : "Cora cannot access that information with your current permissions.",
        )
        return
      }

      if (data.creditsInsufficient) {
        if (prepared) recordCoraError(prepared, message)
        handlers.onError("You've used your weekly Cora credits. Upgrade or wait for reset.")
        return
      }

      const answer = data.response?.trim()
      if (!answer) {
        if (prepared) recordCoraError(prepared, message)
        handlers.onError(
          typeof data.error === "string"
            ? data.error
            : "Cora returned an empty response. Please try again.",
        )
        return
      }

      const completed = await revealText(answer, handlers.onChunk, signal)
      if (!completed || signal?.aborted) {
        handlers.onAborted?.()
        return
      }
      if (prepared) {
        recordCoraSuccess(prepared, {
          prompt: message,
          response: answer,
          dataSources: prepared.claims.contextSources,
        })
      }
      handlers.onDone()
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        handlers.onAborted?.()
        return
      }
      if (prepared) recordCoraError(prepared, message)
      handlers.onError(err instanceof Error ? err.message : "Could not reach Cora.")
    }
  },
}
