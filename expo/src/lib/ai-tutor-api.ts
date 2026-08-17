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
import { coraCreditsApi } from "./cora/credits/api"
import { studentMonthlyAllocation, type CoraMode } from "./cora/credits/economy"
import type { CoraExpensiveTaskPayload } from "./cora/credits/types"
import { mapStudentChatResponse } from "./cora/scope/types"
import { parseCoraChatMeta } from "./cora/models"

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
  /** Always false under the Cora Credit economy — kept for legacy UI branches. */
  isUnlimited: boolean
  includedBalance?: number
  purchasedBalance?: number
  reservedCredits?: number
  periodKey?: string
  coraMode?: CoraMode
  isLow?: boolean
  membershipTier?: string | null
  lifetimeCreditsUsed?: number
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
  /** ISO timestamp — used for iMessage-style day dividers. */
  createdAt?: string
  importedQuestion?: CoraImportedProblem
  importedQuestionLabel?: string
  /** Present when the user edited and resent this turn. */
  versions?: ChatMessageVersion[]
  activeVersionIndex?: number
  /** Signed (or local) action proposals — confirm via CoraActionCard before mutating. */
  proposals?: import("./cora/types").CoraActionProposal[]
  proposalStatusById?: Record<string, "idle" | "confirming" | "done" | "error">
  proposalResultById?: Record<string, import("./cora/types").CoraConfirmActionResult>
  /** Purpose-scope false-positive feedback (server redirect only). */
  scopeFeedback?: import("./cora/scope/types").CoraScopeFeedbackState | null
  /** Distinct from scope — assessment integrity refusal. */
  integrityBlock?: boolean
  /** Distinct from scope — unauthorized tool/data. */
  permissionDeny?: boolean
  coraPublicMode?: import("./cora/models").CoraPublicModeLabel
  coraProfile?: import("./cora/models").CoraModelProfile
  ui?: import("./cora/models").CoraUiPayload
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
  proposals?: import("./cora/types").CoraActionProposal[]
  needsConfirmation?: boolean
  expensiveTask?: boolean
  estimateLow?: number
  estimateHigh?: number
  estimatedCredits?: number
  creditsRemaining?: number
  threshold?: number
  coraMode?: CoraMode
  scopeRedirect?: boolean
  scopeDecision?: string
  scopeClassification?: string
  scopeEventId?: number | null
  offerScopeFeedback?: boolean
  creditsCharged?: number
  examBlocked?: boolean
  assessmentIntegrity?: unknown
  assessmentTitle?: string
  clearanceDenied?: boolean
  readOnlyRefusal?: boolean
  profile?: import("./cora/models").CoraModelProfile
  publicMode?: import("./cora/models").CoraPublicModeLabel
  ui?: import("./cora/models").CoraUiPayload
  routing?: import("./cora/models").PublicCoraRoutingMeta
}

export type AiTutorStreamDoneMeta = {
  proposals?: import("./cora/types").CoraActionProposal[]
  scopeFeedback?: import("./cora/scope/types").CoraScopeFeedbackState | null
  integrityBlock?: boolean
  permissionDeny?: boolean
  /** When true, do not refresh local credit balance (scope redirect charges 0). */
  skipCreditRefresh?: boolean
  profile?: import("./cora/models").CoraModelProfile
  publicMode?: import("./cora/models").CoraPublicModeLabel
  ui?: import("./cora/models").CoraUiPayload
  routing?: import("./cora/models").PublicCoraRoutingMeta
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

export function applyCoraChatMeta(message: ChatMessage, meta?: AiTutorStreamDoneMeta | null): ChatMessage {
  if (!meta) return message
  return {
    ...message,
    ...(meta.proposals?.length ? { proposals: meta.proposals } : {}),
    coraPublicMode: meta.publicMode ?? message.coraPublicMode,
    coraProfile: meta.profile ?? message.coraProfile,
    ui: meta.ui ?? message.ui,
    scopeFeedback: meta.scopeFeedback ?? message.scopeFeedback,
    integrityBlock: meta.integrityBlock || message.integrityBlock,
    permissionDeny: meta.permissionDeny || message.permissionDeny,
  }
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

  getCredits: async (session: StudentSession): Promise<AiTutorCredits> => {
    try {
      const balance = await coraCreditsApi.getStudentBalance(session)
      const tier = balance.membershipTier || "Scholar"
      const includedCap = balance.includedCapHint ?? studentMonthlyAllocation(tier)
      return {
        credits: balance.credits,
        tier,
        creditsLimit: includedCap > 0 ? includedCap : balance.credits,
        isUnlimited: false,
        includedBalance: balance.includedBalance,
        purchasedBalance: balance.purchasedBalance,
        reservedCredits: balance.reservedCredits,
        periodKey: balance.periodKey,
        coraMode: balance.coraMode,
        isLow: balance.isLow,
        membershipTier: balance.membershipTier,
        lifetimeCreditsUsed: balance.lifetimeCreditsUsed,
      }
    } catch {
      /* Fall back to legacy endpoint during migration. */
      const legacy = await request<AiTutorCredits & { coraMode?: string; isLow?: boolean }>(
        session,
        `/api/ai-tutor/credits?studentId=${encodeURIComponent(session.databaseId)}`,
      )
      return {
        ...legacy,
        isUnlimited: false,
        coraMode: legacy.coraMode === "lite" ? "lite" : legacy.credits <= 0 ? "lite" : "premium",
        isLow: Boolean(legacy.isLow),
      }
    }
  },

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
      onDone: (meta?: AiTutorStreamDoneMeta) => void
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
      confirmExpensiveTask?: boolean
      onNeedsExpensiveConfirm?: (payload: CoraExpensiveTaskPayload) => void
      confirmScopeRelated?: boolean
      declaredAcademicContext?: string | null
      threadId?: string | null
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
      const historyPayload = conversationHistory.map((entry) => ({
        role: normalizeHistoryRole(entry.role),
        content: entry.content,
      }))
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
          conversationHistory: historyPayload,
          ...(options?.threadId ? { threadId: options.threadId } : {}),
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
          ...(options?.confirmExpensiveTask ? { confirmExpensiveTask: true } : {}),
          ...(options?.confirmScopeRelated ? { confirmScopeRelated: true } : {}),
          ...(options?.declaredAcademicContext
            ? { declaredAcademicContext: options.declaredAcademicContext }
            : {}),
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

      if (data.needsConfirmation || response.status === 409) {
        if (prepared) recordCoraError(prepared, message)
        const payload: CoraExpensiveTaskPayload = {
          needsConfirmation: true,
          expensiveTask: true,
          estimateLow: Number(data.estimateLow ?? 0),
          estimateHigh: Number(data.estimateHigh ?? 0),
          estimatedCredits: Number(data.estimatedCredits ?? 0),
          creditsRemaining: Number(data.creditsRemaining ?? 0),
          threshold: Number(data.threshold ?? 100),
          response: data.response,
        }
        if (options?.onNeedsExpensiveConfirm) {
          options.onNeedsExpensiveConfirm(payload)
          return
        }
        handlers.onError(
          data.response?.trim() ||
            `Large Cora task — estimated ${payload.estimateLow}–${payload.estimateHigh} credits. Confirm to continue.`,
        )
        return
      }

      if (data.creditsInsufficient && !data.scopeRedirect) {
        if (prepared) recordCoraError(prepared, message)
        handlers.onError(
          data.coraMode === "lite" || data.response
            ? data.response?.trim() ||
                "You're on Cora Lite — premium generation needs more credits. Buy a pack or wait for your monthly refresh."
            : "You've used your Cora credits for this period. Buy a pack or wait for your monthly refresh.",
        )
        return
      }

      const outcome = mapStudentChatResponse(data as unknown as Record<string, unknown>, message)

      if (outcome.kind === "permission_deny" && !outcome.text.trim() && (data.accessDenied || data.rbacBlocked)) {
        if (prepared) recordCoraError(prepared, message)
        handlers.onError(
          typeof data.blockReason === "string"
            ? data.blockReason
            : "Cora cannot access that information with your current permissions.",
        )
        return
      }

      if (outcome.kind === "error") {
        if (prepared) recordCoraError(prepared, message)
        handlers.onError(outcome.message)
        return
      }

      const answer =
        outcome.kind === "assistant" ||
        outcome.kind === "scope_redirect" ||
        outcome.kind === "integrity_block" ||
        outcome.kind === "permission_deny"
          ? outcome.text.trim()
          : ""

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

      if (outcome.kind === "scope_redirect") {
        handlers.onDone({
          skipCreditRefresh: true,
          scopeFeedback: outcome.offerFeedback
            ? { eventId: outcome.eventId, originalMessage: outcome.originalUserMessage }
            : null,
        })
        return
      }

      if (outcome.kind === "integrity_block") {
        handlers.onDone({ integrityBlock: true, skipCreditRefresh: true })
        return
      }

      if (outcome.kind === "permission_deny") {
        if (prepared) recordCoraError(prepared, message)
        handlers.onDone({ permissionDeny: true, skipCreditRefresh: true })
        return
      }

      if (prepared) {
        recordCoraSuccess(prepared, {
          prompt: message,
          response: answer,
          dataSources: prepared.claims.contextSources,
        })
      }
      const chatMeta = parseCoraChatMeta(data as unknown as Record<string, unknown>)
      handlers.onDone({
        ...(outcome.proposals?.length ? { proposals: outcome.proposals } : {}),
        profile: chatMeta.profile,
        publicMode: chatMeta.publicMode,
        routing: chatMeta.routing,
        ...(chatMeta.ui ? { ui: chatMeta.ui } : {}),
      })
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
