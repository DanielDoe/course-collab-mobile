import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import { apiErrorMessage, isApiRouteMissingError } from "./http-errors"
import type { ChatMessage } from "./ai-tutor-api"
import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import type { InstructorScope } from "./instructor-content-api"
import type { DraftQuestionBankItem } from "./question-bank-ai-types"
import { buildLocalFacultyCoraInsights } from "./faculty-cora-local-insights"
import {
  buildFacultyCoraCreateOfflineChatReply,
  generateFacultyCoraQuestionDrafts,
  isCoraGenerateQuestionsOfflineError,
} from "./faculty-cora-create-offline"
import { buildFacultyCoraImproveOfflineChatReply } from "./faculty-cora-improve-offline"
import { buildFacultyCoraAnalyzeOfflineChatReply } from "./faculty-cora-analyze-offline"
import { buildFacultyCoraExplainOfflineChatReply } from "./faculty-cora-explain-offline"
import { buildFacultyCoraAutomateOfflineChatReply } from "./faculty-cora-automate-offline"
import { buildFacultyCoraReviewOfflineChatReply } from "./faculty-cora-review-offline"
import { buildFacultyCoraAssistantOfflineChatReply } from "./faculty-cora-assistant-offline"
import type { CoraAccessEnvelope } from "./cora-rbac"
import type { PreparedCoraRequest } from "./cora-rbac/prepare-request"

export type FacultyCoraInsight = {
  id: string
  title: string
  body: string
  severity?: "info" | "warning" | "success"
  capabilityId?: FacultyCoraCapabilityId
}

export type FacultyCoraActionKind =
  | "generate_questions"
  | "open_quiz_create"
  | "open_module"
  | "schedule_automation"
  | "import_from_course"

export type FacultyCoraChatAction = {
  id: string
  label: string
  kind: FacultyCoraActionKind
  payload: Record<string, unknown>
}

export type FacultyCoraChatResponse = {
  reply: string
  restricted?: boolean
  suggestedModuleId?: string
  actions?: FacultyCoraChatAction[]
  contextSyncedAt?: string
  offline?: boolean
  rbacBlocked?: boolean
  blockReason?: string
}

type FacultyCoraRequestOptions = {
  coraAccess?: CoraAccessEnvelope
  prepared?: PreparedCoraRequest
  signal?: AbortSignal
}

export type FacultyCoraAutomationJob = {
  id: number
  jobType: "weekly_announcement" | "post_lecture_flashcards"
  runAt: string
  status: "pending" | "running" | "completed" | "failed"
  lastError: string | null
}

async function instructorCoraRequest<T>(
  path: string,
  scope: InstructorScope,
  init?: RequestInit,
  rbac?: FacultyCoraRequestOptions,
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-instructor-id": String(scope.instructorId),
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (scope.courseId != null) headers["x-course-id"] = String(scope.courseId)

  let requestBody = init?.body
  if (rbac?.prepared || rbac?.coraAccess) {
    const existing =
      typeof requestBody === "string" && requestBody
        ? (JSON.parse(requestBody) as Record<string, unknown>)
        : {}
    requestBody = JSON.stringify({
      ...existing,
      ...(rbac.prepared ? rbac.prepared.accessBody : {}),
      ...(rbac.coraAccess ? { coraAccess: rbac.coraAccess } : {}),
    })
  }

  const response = await fetch(url, {
    ...init,
    headers,
    body: requestBody,
    signal: rbac?.signal ?? init?.signal,
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
    throw new ApiError(apiErrorMessage(body, response.status), response.status, body)
  }
  return body as T
}

export const facultyCoraApi = {
  async listInsights(scope: InstructorScope): Promise<{ insights: FacultyCoraInsight[]; offline?: boolean }> {
    try {
      const res = await instructorCoraRequest<{ insights: FacultyCoraInsight[] }>(
        "/api/instructor/cora/insights",
        scope,
      )
      if ((res.insights ?? []).length > 0) return res
      const local = await buildLocalFacultyCoraInsights(scope)
      return { insights: local, offline: true }
    } catch (err) {
      if (err instanceof ApiError && isApiRouteMissingError(err.status, err.message)) {
        const local = await buildLocalFacultyCoraInsights(scope)
        return { insights: local, offline: true }
      }
      throw err
    }
  },

  async sendMessage(
    scope: InstructorScope,
    payload: {
      message: string
      capabilityId?: FacultyCoraCapabilityId
      conversationHistory?: ChatMessage[]
    },
    rbac?: FacultyCoraRequestOptions,
  ): Promise<FacultyCoraChatResponse> {
    try {
      return await instructorCoraRequest<FacultyCoraChatResponse>(
        "/api/instructor/cora/chat",
        scope,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        rbac,
      )
    } catch (err) {
      if (err instanceof ApiError && isApiRouteMissingError(err.status, err.message)) {
        if (payload.capabilityId === "insights") {
          const { buildFacultyCoraInsightsOfflineChatReply } = await import("./faculty-cora-teaching-context")
          return buildFacultyCoraInsightsOfflineChatReply(scope, payload)
        }
        if (payload.capabilityId === "create") {
          return buildFacultyCoraCreateOfflineChatReply(scope, payload)
        }
        if (payload.capabilityId === "improve") {
          return buildFacultyCoraImproveOfflineChatReply(scope, payload)
        }
        if (payload.capabilityId === "analyze") {
          return buildFacultyCoraAnalyzeOfflineChatReply(scope, payload)
        }
        if (payload.capabilityId === "explain") {
          return buildFacultyCoraExplainOfflineChatReply(scope, payload)
        }
        if (payload.capabilityId === "automate") {
          return buildFacultyCoraAutomateOfflineChatReply(scope, payload)
        }
        if (payload.capabilityId === "review") {
          return buildFacultyCoraReviewOfflineChatReply(scope, payload)
        }
        if (payload.capabilityId === "assistant") {
          return buildFacultyCoraAssistantOfflineChatReply(scope, payload)
        }
        return {
          reply:
            "Cora chat is not connected to the server yet for this build. You can still open Question Bank, Quizzes, and other modules from the capability cards below.",
          offline: true,
          actions: [],
        }
      }
      throw err
    }
  },

  async generateQuestions(
    scope: InstructorScope,
    payload: { prompt: string; count?: number; topic?: string; questionType?: string },
    rbac?: FacultyCoraRequestOptions,
  ): Promise<{ drafts: DraftQuestionBankItem[]; parsed: Record<string, unknown>; offline?: boolean }> {
    try {
      return await instructorCoraRequest<{ drafts: DraftQuestionBankItem[]; parsed: Record<string, unknown> }>(
        "/api/instructor/cora/tools/generate-questions",
        scope,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        rbac,
      )
    } catch (err) {
      if (isCoraGenerateQuestionsOfflineError(err)) {
        return generateFacultyCoraQuestionDrafts(scope, payload)
      }
      throw err
    }
  },

  async scheduleAutomation(
    scope: InstructorScope,
    payload: {
      jobType: "weekly_announcement" | "post_lecture_flashcards"
      payload?: Record<string, unknown>
      runInHours?: number
    },
    rbac?: FacultyCoraRequestOptions,
  ): Promise<{ job: FacultyCoraAutomationJob; offline?: boolean }> {
    try {
      return await instructorCoraRequest<{ job: FacultyCoraAutomationJob }>(
        "/api/instructor/cora/automate",
        scope,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        rbac,
      )
    } catch (err) {
      if (err instanceof ApiError && isApiRouteMissingError(err.status, err.message)) {
        const runInHours = payload.runInHours ?? 24
        return {
          offline: true,
          job: {
            id: Math.floor(Date.now() % 1_000_000),
            jobType: payload.jobType,
            runAt: new Date(Date.now() + runInHours * 3_600_000).toISOString(),
            status: "pending",
            lastError: null,
          },
        }
      }
      throw err
    }
  },

  async listAutomations(scope: InstructorScope): Promise<{ jobs: FacultyCoraAutomationJob[]; offline?: boolean }> {
    try {
      return await instructorCoraRequest<{ jobs: FacultyCoraAutomationJob[] }>(
        "/api/instructor/cora/automate",
        scope,
      )
    } catch (err) {
      if (err instanceof ApiError && isApiRouteMissingError(err.status, err.message)) {
        return { jobs: [], offline: true }
      }
      throw err
    }
  },

  async ingestDocument(
    scope: InstructorScope,
    file: { uri: string; name: string; type: string },
    payload: { intent: string; prompt?: string },
    rbac?: FacultyCoraRequestOptions,
  ): Promise<{
    drafts?: DraftQuestionBankItem[]
    extractedText?: string
    message?: string
    meta?: Record<string, unknown>
  }> {
    const url = `${API_BASE_URL}/api/instructor/cora/tools/ingest-document`
    const form = new FormData()
    form.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)
    form.append("intent", payload.intent)
    if (payload.prompt) form.append("prompt", payload.prompt)

    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-instructor-id": String(scope.instructorId),
    }
    if (scope.courseId != null) headers["x-course-id"] = String(scope.courseId)

    if (rbac?.prepared || rbac?.coraAccess) {
      form.append(
        "coraAccess",
        JSON.stringify(rbac.prepared?.accessBody.coraAccess ?? rbac.coraAccess),
      )
    }

    const response = await fetch(url, { method: "POST", headers, body: form })
    const text = await response.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = { error: text }
      }
    }
    if (!response.ok) {
      throw new ApiError(apiErrorMessage(body, response.status), response.status, body)
    }
    return body as {
      drafts?: DraftQuestionBankItem[]
      extractedText?: string
      message?: string
      meta?: Record<string, unknown>
    }
  },

  executeTool(
    scope: InstructorScope,
    payload: {
      toolId: string
      input: Record<string, unknown>
    },
    rbac?: FacultyCoraRequestOptions,
  ): Promise<{ result: Record<string, unknown>; actions?: FacultyCoraChatAction[] }> {
    return instructorCoraRequest(
      "/api/instructor/cora/tools/execute",
      scope,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      rbac,
    )
  },
}
