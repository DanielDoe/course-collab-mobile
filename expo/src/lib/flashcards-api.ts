import type { FlashcardDifficulty } from "./flashcard-difficulty"
import type { StudentSession } from "./session"
import { studentAuthenticatedRequest } from "./student-api"
import { studentContentPath } from "./student-content-context"

export type FlashcardDeckKind = "course" | "student"

export type FlashcardDeck = {
  id: number
  title: string
  description: string
  deckKind: FlashcardDeckKind
  courseId: number | null
  session: string | null
  studentId: number | null
  instructorId: number | null
  topic: string | null
  showInPracticeHub: boolean
  isPublished: boolean
  cardCount: number
  requireMcqValidation: boolean
  cardsBeforeQuiz: number
  createdAt: string
  updatedAt: string
  canEdit: boolean
}

export type FlashcardCard = {
  id: number
  deckId: number
  frontText: string
  backText: string
  sortOrder: number
  difficulty: FlashcardDifficulty
  customDistractors?: string[]
  createdAt: string
  updatedAt: string
}

export type FlashcardStudyOutcome = "known" | "learning" | "session_complete"

export type FlashcardStudyRecordResult = {
  recorded: boolean
  pointsEarned: number
  streakBonus: number
  firstKnownThisWeek: boolean
  firstKnownThisSession: boolean
  sessionCompleteBonus: boolean
  pointsSynced: boolean
}

export type FlashcardLevelInfo = {
  level: number
  title: string
  minCards: number
  nextLevelAt: number | null
  progressInLevel: number
  progressToNext: number
}

export type FlashcardGamificationProfile = {
  totalMastered: number
  level: FlashcardLevelInfo
  dailyGoal: number
  dailyProgress: number
  dailyGoalMet: boolean
  dailyStreakDays: number
  weeklyMastered: number
}

export type FlashcardTierAccess = {
  unlockFraction: number
  dailyCardCap: number
  canStudyCourseDeck: boolean
  upgradeRequiredTier: "Explorer" | "Trailblazer" | null
}

export type FlashcardStudySettings = {
  dailyGoal: number
  timedModeSeconds: number
  tierAccess: FlashcardTierAccess
  totalCards: number
  unlockedCards: number
}

export type FlashcardDeckMastery = {
  deckId: number
  mastered: number
  total: number
  pct: number
}

export type FlashcardLeaderboardEntry = {
  rank: number
  studentId: number
  displayName: string
  cardsMastered: number
  isCurrentUser: boolean
}

export const FLASHCARD_DAILY_GOAL = 10
export const FLASHCARD_TIMED_SECONDS = 45

function flashcardPath(session: StudentSession, path: string, extra?: Record<string, string>): string {
  return studentContentPath(session, path, extra)
}

export const flashcardsApi = {
  listDecks(session: StudentSession, practiceHubOnly = false) {
    return studentAuthenticatedRequest<{
      courseDecks: FlashcardDeck[]
      myDecks: FlashcardDeck[]
      courseId: number | null
      session: string | null
      studySettings?: FlashcardStudySettings
    }>(
      session,
      flashcardPath(
        session,
        "/api/student/flashcards/decks",
        practiceHubOnly ? { practiceHub: "true" } : undefined,
      ),
    )
  },

  createDeck(
    session: StudentSession,
    payload: { title?: string; description?: string; topic?: string },
  ) {
    return studentAuthenticatedRequest<{ deck: FlashcardDeck }>(
      session,
      flashcardPath(session, "/api/student/flashcards/decks"),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    )
  },

  getDeck(session: StudentSession, deckId: number) {
    return studentAuthenticatedRequest<{
      deck: FlashcardDeck
      cards: FlashcardCard[]
      studySettings?: FlashcardStudySettings
    }>(session, flashcardPath(session, `/api/student/flashcards/decks/${deckId}`))
  },

  updateDeck(
    session: StudentSession,
    deckId: number,
    payload: {
      title?: string
      description?: string
      topic?: string
      requireMcqValidation?: boolean
      cardsBeforeQuiz?: number
    },
  ) {
    return studentAuthenticatedRequest<{ deck: FlashcardDeck }>(
      session,
      flashcardPath(session, `/api/student/flashcards/decks/${deckId}`),
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    )
  },

  deleteDeck(session: StudentSession, deckId: number) {
    return studentAuthenticatedRequest<{ success: boolean }>(
      session,
      flashcardPath(session, `/api/student/flashcards/decks/${deckId}`),
      {
        method: "DELETE",
      },
    )
  },

  addCard(
    session: StudentSession,
    deckId: number,
    payload: {
      frontText: string
      backText: string
      sortOrder?: number
      difficulty?: FlashcardDifficulty
    },
  ) {
    return studentAuthenticatedRequest<{ card: FlashcardCard }>(
      session,
      flashcardPath(session, `/api/student/flashcards/decks/${deckId}/cards`),
      { method: "POST", body: JSON.stringify(payload) },
    )
  },

  updateCard(
    session: StudentSession,
    cardId: number,
    payload: {
      frontText?: string
      backText?: string
      sortOrder?: number
      difficulty?: FlashcardDifficulty
      customDistractors?: string[]
    },
  ) {
    return studentAuthenticatedRequest<{ card: FlashcardCard }>(
      session,
      flashcardPath(session, `/api/student/flashcards/cards/${cardId}`),
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    )
  },

  deleteCard(session: StudentSession, cardId: number) {
    return studentAuthenticatedRequest<{ success: boolean }>(
      session,
      flashcardPath(session, `/api/student/flashcards/cards/${cardId}`),
      {
        method: "DELETE",
      },
    )
  },

  getStudyProgress(session: StudentSession, deckId: number) {
    return studentAuthenticatedRequest<{ masteredCardIds: number[]; weeklyPoints: number }>(
      session,
      flashcardPath(session, `/api/student/flashcards/decks/${deckId}/study`),
    )
  },

  recordStudyEvent(
    session: StudentSession,
    deckId: number,
    payload: {
      cardId?: number
      outcome: FlashcardStudyOutcome
      sessionId: string
      streak?: number
      bonusType?: "timed" | "boss"
      mcqEarnedFraction?: number
    },
  ) {
    const body: Record<string, unknown> = { ...payload }
    if (
      payload.mcqEarnedFraction != null &&
      Number.isFinite(payload.mcqEarnedFraction)
    ) {
      body.mcqEarnedFraction = Math.max(0, Math.min(1, payload.mcqEarnedFraction))
    }
    return studentAuthenticatedRequest<FlashcardStudyRecordResult>(
      session,
      flashcardPath(session, `/api/student/flashcards/decks/${deckId}/study`),
      { method: "POST", body: JSON.stringify(body) },
    )
  },

  getGamification(session: StudentSession, topic?: string) {
    return studentAuthenticatedRequest<{
      profile: FlashcardGamificationProfile
      deckMastery: Record<string, FlashcardDeckMastery>
      leaderboard: FlashcardLeaderboardEntry[]
    }>(
      session,
      flashcardPath(session, "/api/student/flashcards/gamification", topic ? { topic } : undefined),
    )
  },
}
