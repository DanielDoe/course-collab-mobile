import { API_BASE_URL } from "../../constants"
import type { StudentSession } from "../session"
import { ApiError } from "../student-api"
import type {
  AttemptState,
  EvaluateAnswerResult,
  FinalizeQuizResult,
  SavedAnswer,
  StartQuizResult,
  TakeQuizResult,
} from "./assessment-quiz-types"

function headers(session: StudentSession): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-student-id": session.databaseId,
    "x-student-session": session.section,
  }
}

async function request<T>(
  session: StudentSession,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const response = await fetch(url, { ...init, headers: { ...headers(session), ...init?.headers } })
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
  return body as T
}

export const assessmentQuizApi = {
  startQuiz: (
    session: StudentSession,
    payload: { quizId: number; forceRestart?: boolean; superpowers?: string[] },
  ) =>
    request<StartQuizResult>(session, "/api/student/start-quiz", {
      method: "POST",
      body: JSON.stringify({
        studentId: Number(session.databaseId),
        quizId: payload.quizId,
        ...(payload.forceRestart ? { forceRestart: true } : {}),
        ...(payload.superpowers?.length ? { superpowers: payload.superpowers } : {}),
      }),
    }),

  take: (
    session: StudentSession,
    apiType: string,
    quizId: number,
    options?: { attemptId?: number; lat?: number; lng?: number },
  ) => {
    let path = `/api/${apiType}/take/${quizId}?studentId=${encodeURIComponent(session.databaseId)}`
    if (options?.attemptId != null) path += `&attemptId=${options.attemptId}`
    if (options?.lat != null && options?.lng != null) {
      path += `&lat=${options.lat}&lng=${options.lng}`
    }
    return request<TakeQuizResult>(session, path)
  },

  getAttemptState: (
    session: StudentSession,
    quizId: number,
    options?: { attemptId?: number },
  ) => {
    let path = `/api/student/quiz-attempt/${quizId}?studentId=${encodeURIComponent(session.databaseId)}`
    if (options?.attemptId != null) path += `&attemptId=${options.attemptId}`
    return request<AttemptState>(session, path)
  },

  getSavedAnswers: (session: StudentSession, attemptId: number) =>
    request<SavedAnswer[]>(session, `/api/student/attempt/${attemptId}/answers`),

  saveAnswer: (
    session: StudentSession,
    payload: {
      attemptId: number
      questionId: number
      answer: string | string[]
      questionType: string
      autoSave?: boolean
      timeSpentSeconds?: number
    },
  ) =>
    request<{ success: boolean }>(session, "/api/student/save-answer", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  saveProgress: (
    session: StudentSession,
    payload: {
      attemptId: number
      currentQuestionIndex?: number
      questionTimeRemaining?: Record<string, number>
    },
  ) =>
    request<{ ok: boolean }>(session, "/api/student/quiz-progress", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  submitAnswer: (
    session: StudentSession,
    apiType: string,
    payload: {
      attemptId: number
      questionId: number
      answer: string | string[]
      questionType: string
      timeSpentSeconds?: number
    },
  ) =>
    request<EvaluateAnswerResult>(session, `/api/${apiType}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /** Anti-cheat telemetry (tab_switch / copy_paste / app_backgrounded). Best-effort. */
  logViolation: (
    session: StudentSession,
    payload: {
      attemptId: number
      type: string
      reason?: string
      details?: string
    },
  ) =>
    request<{ success: boolean; counts?: Record<string, number> }>(
      session,
      "/api/quiz/log-violation",
      {
        method: "POST",
        body: JSON.stringify({
          attemptId: payload.attemptId,
          violation: {
            type: payload.type,
            reason: payload.reason ?? payload.type,
            details: payload.details ?? null,
            source: "native_app",
            timestamp: new Date().toISOString(),
          },
        }),
      },
    ),

  saveAndFinishLater: (
    session: StudentSession,
    payload: { attemptId: number; currentQuestionIndex?: number; remainingTimeSeconds?: number },
  ) =>
    request<{ success: boolean; message?: string; upgradeRequired?: string }>(
      session,
      "/api/student/save-and-finish-later",
      { method: "POST", body: JSON.stringify(payload) },
    ),

  finalize: (
    session: StudentSession,
    payload: { attemptId: number; quizId: number },
  ) =>
    request<FinalizeQuizResult>(session, "/api/student/finalize-quiz", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  uploadQuizSolutionFile: async (
    session: StudentSession,
    payload: {
      attemptId: number
      questionId: number
      partId: string
      uri: string
      name: string
      mime: string
    },
  ) => {
    const form = new FormData()
    form.append("file", { uri: payload.uri, name: payload.name, type: payload.mime } as unknown as Blob)
    form.append("studentId", session.databaseId)
    form.append("attemptId", String(payload.attemptId))
    form.append("questionId", String(payload.questionId))
    form.append("partId", payload.partId)
    form.append("uploadKind", "circuit_submission")

    const url = `${API_BASE_URL}/api/student/quiz-solution-upload`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "x-student-id": session.databaseId,
        "x-student-session": session.section,
      },
      body: form,
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
          : `Upload failed (${response.status})`
      throw new ApiError(message, response.status, body)
    }
    return body as { url: string; name: string; mime: string; uploaded_at?: string }
  },

  exportCircuitWorkspace: (
    session: StudentSession,
    payload: {
      attemptId: number
      questionId: number
      workspace: unknown
      title?: string
    },
  ) =>
    request<{
      success: boolean
      answerJson?: string
      solutionUploads?: Record<string, { url: string; name: string; mime: string }>
    }>(session, "/api/student/export-circuit-workspace", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
}
