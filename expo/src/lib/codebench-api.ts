import { API_BASE_URL } from "../constants"
import type { CodebenchLearningMode } from "../constants/codebench-languages"
import { assertProductionHttpsUrl, createApiAbortSignal } from "./http"
import type { StudentSession } from "./session"
import { persistHttpCookiesFromResponse } from "./student-http-cookies"
import { iosInsufficientCoraCreditsNotice } from "./purchase-navigation"
import { ApiError, studentAuthenticatedHeaders } from "./student-api"
import type { PreparedCoraRequest } from "./cora-rbac/prepare-request"
import { flattenRequestHeaders } from "./student-session-proof"
import { filterOpenCodeClassroomAssignments } from "./codebench-classroom-assignments"

async function request<T>(session: StudentSession, path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  assertProductionHttpsUrl(url)
  const headers = {
    ...(await studentAuthenticatedHeaders(session)),
    ...flattenRequestHeaders(init?.headers),
  }
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    signal: createApiAbortSignal(undefined, init?.signal ?? undefined),
    headers,
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

export type CodebenchStreak = {
  streakDays: number
  calendarData?: Record<string, boolean>
  activityStats?: { totalSubmissions: number; activeDays: number }
}

export type CodebenchBadgeDetail = {
  name: string
  icon: string
  earnedAt: string
}

export type CodebenchLeaderboardEntry = {
  student_id: number
  student_name?: string
  student_code?: string
  section?: string
  xp?: number
  total_activities?: number
  rank?: number
}

export type DailyChallenge = {
  id: string
  title: string
  description: string
  difficulty: string
  xpReward: number
  completed: boolean
  date: string
}

export type CodebenchSubmissions = {
  codeSubmissions: Array<{
    id?: number
    code?: string
    score?: number
    points_awarded?: number
    status?: string
    submitted_at?: string
  }>
  practiceSubmissions: Array<{
    code?: string
    points_awarded?: number
    submitted_at?: string
  }>
  dailyChallengeSubmissions: Array<{
    code?: string
    points_awarded?: number
    submitted_at?: string
  }>
}

export type CodebenchAnalysis = {
  concepts?: Record<string, number>
  weaknesses?: string[]
  strengths?: string[]
  proficiencyScore?: number
  level?: "Beginner" | "Intermediate" | "Advanced"
  mainWeakness?: string
  mostImproved?: string
  recommendedPractice?: string
  recommendations?: string[]
}

export type CodebenchLearningPlan = {
  weekly_plan?: string
  tasks?: string[]
  study_time_minutes?: number
}

export type CodebenchToolPayload = {
  code: string
  language: string
  learningMode?: CodebenchLearningMode
}

export type CodebenchEvaluateQuestion = {
  question: string
  type: "multiple_choice" | "short_answer"
  options?: string[]
  correctAnswer?: string
  explanation?: string
}

export type ClassroomAssignmentOption = {
  id: number
  title: string
  attempted?: boolean
  pending?: boolean
  expires_at?: string
  submission_kind?: string
}

function detailsFlag(details: unknown, key: string): boolean {
  return Boolean(details && typeof details === "object" && (details as Record<string, unknown>)[key] === true)
}

/** Map 402 / creditsInsufficient from CodeBench Cora routes to the shared credit notice. */
export function codebenchAiFailureMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 402 || detailsFlag(err.details, "creditsInsufficient")) {
      return iosInsufficientCoraCreditsNotice()
    }
    return err.message
  }
  return fallback
}

type AiBody = CodebenchToolPayload & { studentId: string }

function aiBody(session: StudentSession, payload: CodebenchToolPayload): AiBody {
  return {
    studentId: session.databaseId,
    code: payload.code,
    language: payload.language,
    learningMode: payload.learningMode ?? "intermediate",
  }
}

export const codebenchApi = {
  getStreak: (session: StudentSession) =>
    request<CodebenchStreak>(
      session,
      `/api/codebench/streak?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  recordStreak: (session: StudentSession) =>
    request<{ success?: boolean }>(session, "/api/codebench/streak", {
      method: "POST",
      body: JSON.stringify({ studentId: session.databaseId }),
    }),

  getBadges: (session: StudentSession) =>
    request<{ badges: Record<string, boolean>; badgeDetails: Record<string, CodebenchBadgeDetail> }>(
      session,
      `/api/codebench/badges?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getLeaderboard: (session: StudentSession) =>
    request<{ leaderboard: CodebenchLeaderboardEntry[] }>(
      session,
      `/api/codebench/leaderboard?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getSubmissions: (session: StudentSession) =>
    request<CodebenchSubmissions>(
      session,
      `/api/codebench/submissions?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getDailyChallenge: (session: StudentSession, learningMode = "intermediate") =>
    request<DailyChallenge>(session, "/api/codebench/daily-challenge", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        code: "",
        learningMode,
      }),
    }),

  analyze: (session: StudentSession, code: string) =>
    request<CodebenchAnalysis>(session, "/api/codebench/analyze", {
      method: "POST",
      body: JSON.stringify({ studentId: session.databaseId, code }),
    }),

  getLearningPlan: (session: StudentSession, code: string) =>
    request<CodebenchLearningPlan>(session, "/api/codebench/learning-plan", {
      method: "POST",
      body: JSON.stringify({ studentId: session.databaseId, code }),
    }),

  explain: (session: StudentSession, payload: CodebenchToolPayload) =>
    request<{ explanation?: string; accessDenied?: boolean }>(session, "/api/explain", {
      method: "POST",
      body: JSON.stringify(aiBody(session, payload)),
    }),

  debug: (session: StudentSession, payload: CodebenchToolPayload) =>
    request<{
      errors?: string[]
      fixes?: string[]
      correctedCode?: string
      explanation?: string
      accessDenied?: boolean
    }>(session, "/api/debug", {
      method: "POST",
      body: JSON.stringify(aiBody(session, payload)),
    }),

  improve: (session: StudentSession, payload: CodebenchToolPayload) =>
    request<{
      improvedCode?: string
      diffSummary?: string
      principles?: string[]
      accessDenied?: boolean
    }>(session, "/api/improve", {
      method: "POST",
      body: JSON.stringify(aiBody(session, payload)),
    }),

  pseudocode: (session: StudentSession, payload: CodebenchToolPayload) =>
    request<{
      pseudocode?: string
      algorithm?: string
      flowchart?: string
      accessDenied?: boolean
    }>(session, "/api/pseudocode", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        code: payload.code,
        language: payload.language,
      }),
    }),

  aiTutor: (
    session: StudentSession,
    payload: {
      message: string
      topic?: string
      code?: string
      learningMode?: CodebenchLearningMode
      conversationHistory?: Array<{ role: string; content: string }>
      isProblemGeneration?: boolean
      prepared?: PreparedCoraRequest
    },
  ) =>
    request<{
      response?: string
      accessDenied?: boolean
      rbacBlocked?: boolean
      blockReason?: string
      error?: string
      /** Set when assessment integrity refused the request; `response` is the refusal text. */
      examBlocked?: boolean
      assessmentIntegrity?: { state?: string; coraPolicy?: string; title?: string | null; reason?: string | null }
    }>(
      session,
      "/api/ai-tutor",
      {
        method: "POST",
        body: JSON.stringify({
          studentId: session.databaseId,
          message: payload.message,
          conversationHistory: payload.conversationHistory,
          context: {
            topic: payload.topic ?? "tutor",
            codeContext: payload.code
              ? `\`\`\`\n${payload.code}\n\`\`\``
              : undefined,
            learningMode: payload.learningMode,
            isProblemGeneration: payload.isProblemGeneration,
          },
          ...(payload.prepared ? payload.prepared.accessBody : {}),
        }),
      },
    ),

  evaluate: (session: StudentSession, payload: CodebenchToolPayload) =>
    request<{ success?: boolean; questions?: CodebenchEvaluateQuestion[] }>(
      session,
      "/api/codebench/evaluate",
      {
        method: "POST",
        body: JSON.stringify(aiBody(session, payload)),
      },
    ),

  replay: (session: StudentSession, payload: CodebenchToolPayload) =>
    request<{ steps?: unknown[]; accessDenied?: boolean; error?: string }>(
      session,
      "/api/codebench/replay",
      {
        method: "POST",
        body: JSON.stringify(aiBody(session, payload)),
      },
    ),

  submit: (
    session: StudentSession,
    payload: {
      code: string
      score?: number
      feedback?: string
      evaluationResponses?: Array<{ question: string; answer: string }>
      submissionId?: number | null
    },
  ) =>
    request<{
      success?: boolean
      message?: string
      pointsAwarded?: number
      evaluation?: { score: number; pointsAwarded: number; feedback: string }
    }>(session, "/api/codebench/submit", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        code: payload.code,
        score: payload.score ?? 0,
        feedback: payload.feedback,
        evaluationResponses: payload.evaluationResponses,
        submissionId: payload.submissionId ?? null,
      }),
    }),

  submitPractice: (
    session: StudentSession,
    payload: {
      code: string
      problem: string
      score?: number
      feedback?: string
      constraints?: string
      sampleInput?: string
      sampleOutput?: string
    },
  ) =>
    request<{ success?: boolean }>(session, "/api/codebench/practice/submit", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        code: payload.code,
        problem: payload.problem,
        feedback: payload.feedback,
        constraints: payload.constraints,
        sampleInput: payload.sampleInput,
        sampleOutput: payload.sampleOutput,
      }),
    }),

  submitDailyChallenge: (
    session: StudentSession,
    payload: {
      code: string
      challengeId: string
      challengeTitle: string
      challengeDescription: string
      score?: number
      feedback?: string
    },
  ) =>
    request<{ success?: boolean; message?: string }>(session, "/api/codebench/daily-challenge/submit", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        code: payload.code,
        challengeId: payload.challengeId,
        challengeTitle: payload.challengeTitle,
        challengeDescription: payload.challengeDescription,
        score: payload.score ?? 0,
        feedback: payload.feedback,
      }),
    }),

  getClassroomAssignments: async (session: StudentSession) => {
    const data = await request<{ submissions?: ClassroomAssignmentOption[] }>(
      session,
      `/api/classroom-points/submissions?session=${encodeURIComponent(session.section)}&studentId=${encodeURIComponent(session.databaseId)}`,
    )
    return filterOpenCodeClassroomAssignments(data.submissions ?? [])
  },
}
