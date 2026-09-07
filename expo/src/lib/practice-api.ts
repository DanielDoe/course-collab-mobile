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
import type { PracticeAnswerReview } from "./lecture-types"
import type { StudentSession } from "./session"
import { studentAuthenticatedRequest } from "./student-api"
import { studentContentFields, studentContentPath } from "./student-content-context"
import type { PracticeQuestion } from "./practice-session"

const PRACTICE_LEADERBOARD_LIMIT = 100

function practicePath(session: StudentSession, path: string, extra?: Record<string, string | number | undefined>): string {
  return studentContentPath(session, path, extra)
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
  maxPoints?: number
  score?: number
  answerReview?: PracticeAnswerReview | null
  autoApproved?: boolean
  xpEarned?: number
  locallyVerified?: boolean
  attemptFinalized?: boolean
  attemptProgress?: { answered?: number; total?: number }
}

export type PracticeAttemptStateAnswer = {
  questionId: number
  studentAnswer: string | string[]
  isCorrect: boolean
  questionType?: string
  topic?: string
}

export type PracticeAttemptState = {
  attemptId: number
  totalQuestions: number
  completedAt?: string | null
  answers: PracticeAttemptStateAnswer[]
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
  attemptId: number
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
    studentAuthenticatedRequest<PracticeGenerateResponse>(
      session,
      studentContentPath(session, "/api/practice/generate"),
      {
        method: "POST",
        body: JSON.stringify({
          ...studentContentFields(session),
          topics: payload.topics,
          count: payload.count,
          difficulty: payload.difficulty,
          courseId: payload.courseId ?? session.courseId,
          fullTopic: payload.fullTopic === true,
        }),
      },
    ),

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
      mcqEarnedFraction?: number
    },
  ) => {
    const body: Record<string, unknown> = {
      ...studentContentFields(session),
      ...payload,
    }
    if (
      payload.mcqEarnedFraction != null &&
      Number.isFinite(payload.mcqEarnedFraction)
    ) {
      body.mcqEarnedFraction = Math.max(0, Math.min(1, payload.mcqEarnedFraction))
    }
    return studentAuthenticatedRequest<EvaluateResult>(
      session,
      studentContentPath(session, "/api/practice/evaluate"),
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    )
  },

  getAttemptState: (session: StudentSession, attemptId: number) =>
    studentAuthenticatedRequest<PracticeAttemptState>(
      session,
      practicePath(session, `/api/practice/attempt/${attemptId}/state`),
    ),

  submit: (session: StudentSession, attemptId: number) =>
    studentAuthenticatedRequest<SubmitPracticeResult>(session, "/api/student/practice/submit", {
      method: "POST",
      body: JSON.stringify({ attemptId }),
    }),
}
