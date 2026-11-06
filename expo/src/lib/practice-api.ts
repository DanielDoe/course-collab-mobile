import {
  mergePracticeLeaderboardEntries,
  normalizePracticeLeaderboardEntry,
  parsePracticeLeaderboardDisplay,
  parsePracticeLeaderboardPrivacy,
  practiceLeaderboardSession,
  type LeaderboardEntry,
  type PracticeLeaderboardDisplay,
  type PracticeLeaderboardPrivacy,
} from "./practice-leaderboard-normalize"
import type { StudentSession } from "./session"
import { studentAuthenticatedRequest } from "./student-api"
import type { PracticeQuestion } from "./practice-session"

const PRACTICE_LEADERBOARD_LIMIT = 100

function practiceContextQuery(
  session: StudentSession,
  extra?: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams({
    studentId: session.databaseId,
  })
  if (session.section) params.set("session", session.section)
  if (session.courseId != null && Number.isFinite(session.courseId)) {
    params.set("courseId", String(session.courseId))
  }
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value != null && value !== "") params.set(key, String(value))
  }
  return params.toString()
}

function practicePath(session: StudentSession, path: string, extra?: Record<string, string | number | undefined>): string {
  const qs = practiceContextQuery(session, extra)
  return path.includes("?") ? `${path}&${qs}` : `${path}?${qs}`
}

export type PracticeAccess = {
  level: "none" | "partial" | "full"
  canOpenTopics: boolean
  canStartPractice: boolean
  unlockFraction: number
  upgradeRequiredTier: "Explorer" | "Trailblazer" | null
}

export type TopicProgress = {
  name: string
  questionCount: number
  unlockedCount?: number
  lockedCount?: number
  completed: number
  correct: number
  accuracy: number
  lastPracticed: string | null
}

export type RecentSession = {
  id?: number
  topic: string
  score: number
  created_at: string
}

export type { LeaderboardEntry, PracticeLeaderboardDisplay, PracticeLeaderboardPrivacy } from "./practice-leaderboard-normalize"

export type PracticeLeaderboardResponse = {
  leaderboard: LeaderboardEntry[]
  currentStudent: LeaderboardEntry | null
  privacyMode: boolean
  privacy: PracticeLeaderboardPrivacy
  display: PracticeLeaderboardDisplay
}

export type EvaluateResult = {
  isCorrect: boolean
  feedback?: string
  aiGraded?: boolean
  requiresManualReview?: boolean
  pointsEarned?: number
  autoApproved?: boolean
  alreadyAttempted?: boolean
  priorAnswer?: string | string[]
  answerReview?: PracticeQuestion["answerReview"]
}

export type SubmitPracticeResult = {
  success: boolean
  attemptId: number
  score: number
  correctCount: number
  totalQuestions: number
}

export type PracticeConfigResponse = {
  numQuestions: number
  membershipTier?: string | null
  access?: PracticeAccess | null
  limits?: {
    dailyQuestionCap?: number | null
    maxQuestionsPerSession?: number | null
    weeklyQuestionCap?: number | null
    weeklyQuestionsUsed?: number | null
    fullTopicAccess?: boolean
    unlockFraction?: number | null
  }
}

export type PracticeGenerateResponse = {
  attemptId: number | null
  reviewOnly?: boolean
  questions: PracticeQuestion[]
  access?: PracticeAccess
  unlockedCount?: number
  totalCount?: number
}

export const practiceApi = {
  getTopicsProgress: (session: StudentSession) =>
    studentAuthenticatedRequest<{
      topics: TopicProgress[]
      access?: PracticeAccess
      courseId?: number
      courseCode?: string
    }>(session, practicePath(session, "/api/practice/topics-progress")),

  getConfig: (session: StudentSession, courseId?: number) =>
    studentAuthenticatedRequest<PracticeConfigResponse>(
      session,
      practicePath(session, "/api/practice/config", {
        courseId: courseId ?? session.courseId,
      }),
    ),

  getRecentSessions: (session: StudentSession, limit = 5) =>
    studentAuthenticatedRequest<{ sessions: RecentSession[] }>(
      session,
      practicePath(session, "/api/practice/recent-sessions", { limit }),
    ),

  getLeaderboard: async (session: StudentSession, limit = PRACTICE_LEADERBOARD_LIMIT) => {
    const section = practiceLeaderboardSession(session)
    const payload = await studentAuthenticatedRequest<Record<string, unknown>>(
      session,
      practicePath(session, "/api/practice/leaderboard", {
        session: section,
        limit,
      }),
    )

    const viewerId = session.databaseId
    const rows = (Array.isArray(payload.leaderboard) ? payload.leaderboard : [])
      .map((row) => normalizePracticeLeaderboardEntry(row, viewerId))
      .filter((row): row is LeaderboardEntry => row !== null)

    const currentStudent = normalizePracticeLeaderboardEntry(payload.currentStudent, viewerId)
    const privacy = parsePracticeLeaderboardPrivacy(payload)
    const display = parsePracticeLeaderboardDisplay(payload)

    return {
      leaderboard: mergePracticeLeaderboardEntries(rows, currentStudent),
      currentStudent,
      privacyMode: privacy.blurPeerNames,
      privacy,
      display,
    } satisfies PracticeLeaderboardResponse
  },

  getPriorAnswers: (session: StudentSession, questionIds: number[]) =>
    studentAuthenticatedRequest<{
      answers: Array<{
        questionId: number
        alreadyAttempted: boolean
        priorAnswer: string | string[] | null
        priorIsCorrect: boolean
        answerReview: PracticeQuestion["answerReview"]
      }>
    }>(
      session,
      practicePath(session, "/api/practice/prior-answers", {
        questionIds: questionIds.filter((id) => Number.isFinite(id)).join(","),
      }),
    ),

  generate: (
    session: StudentSession,
    payload: {
      topics: string[]
      count: number
      difficulty?: string
      courseId?: number
      fullTopic?: boolean
    },
  ) =>
    studentAuthenticatedRequest<PracticeGenerateResponse>(session, "/api/practice/generate", {
      method: "POST",
      body: JSON.stringify({
        studentId: Number(session.databaseId),
        topics: payload.topics,
        count: payload.count,
        difficulty: payload.difficulty,
        courseId: payload.courseId ?? session.courseId,
        fullTopic: payload.fullTopic === true,
      }),
    }),

  evaluate: (
    session: StudentSession,
    payload: {
      questionId: number
      answer: string | string[]
      questionType: string
      attemptId: number
      responseTimeMs: number
      xpEarned: number
      difficulty: string
    },
  ) =>
    studentAuthenticatedRequest<EvaluateResult>(session, "/api/practice/evaluate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  submit: (session: StudentSession, attemptId: number) =>
    studentAuthenticatedRequest<SubmitPracticeResult>(session, "/api/student/practice/submit", {
      method: "POST",
      body: JSON.stringify({ attemptId }),
    }),
}
