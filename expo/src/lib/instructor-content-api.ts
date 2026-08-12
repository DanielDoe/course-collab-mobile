import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import type { CourseDigitalNote } from "./digital-notes-api"
import type { FlashcardCard, FlashcardDeck } from "./flashcards-api"
import type { FlashcardDifficulty } from "./flashcard-difficulty"

export type InstructorScope = {
  instructorId: number
  courseId?: number
}

export type ModuleTopicRow = {
  name: string
  note_count?: number
  deck_count?: number
  card_count?: number
  availability?: Record<string, { is_available: boolean; configured: boolean }>
}

export type ModuleConfigSection = {
  id: number
  code: string
  studentCount: number
}

export type ModuleConfiguration = {
  sections: ModuleConfigSection[]
  topics: Array<{
    name: string
    note_count?: number
    deck_count?: number
    card_count?: number
    availability: Record<string, { is_available: boolean; configured: boolean }>
  }>
  courseCode?: string
  requireMcqValidation?: boolean
  cardsBeforeQuiz?: number
}

export type FlashcardCourseSettings = {
  requireMcqValidation: boolean
  cardsBeforeQuiz: number
}

export type DeletedContent = {
  decks?: FlashcardDeck[]
  cards?: FlashcardCard[]
  notes?: CourseDigitalNote[]
}

async function instructorRequest<T>(
  path: string,
  scope: InstructorScope,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-instructor-id": String(scope.instructorId),
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (scope.courseId != null) headers["x-course-id"] = String(scope.courseId)

  const response = await fetch(url, { ...init, headers })
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

export const instructorCourseNotesApi = {
  listNotes(scope: InstructorScope) {
    return instructorRequest<{ notes: CourseDigitalNote[]; courseCode?: string }>(
      "/api/instructor/course-notes",
      scope,
    )
  },

  createNote(
    scope: InstructorScope,
    payload: {
      title?: string
      bodyText?: string
      inkWorkspace?: unknown | null
      topic?: string | null
      session?: string | null
      isPublished?: boolean
    },
  ) {
    return instructorRequest<{ note: CourseDigitalNote }>("/api/instructor/course-notes", scope, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getNote(scope: InstructorScope, noteId: number) {
    return instructorRequest<{ note: CourseDigitalNote }>(
      `/api/instructor/course-notes/${noteId}`,
      scope,
    )
  },

  updateNote(
    scope: InstructorScope,
    noteId: number,
    payload: {
      title?: string
      bodyText?: string
      inkWorkspace?: unknown | null
      topic?: string | null
      session?: string | null
      isPublished?: boolean
      restore?: boolean
    },
  ) {
    return instructorRequest<{ note: CourseDigitalNote }>(
      `/api/instructor/course-notes/${noteId}`,
      scope,
      { method: "PATCH", body: JSON.stringify(payload) },
    )
  },

  deleteNote(scope: InstructorScope, noteId: number) {
    return instructorRequest<{ success: boolean }>(
      `/api/instructor/course-notes/${noteId}`,
      scope,
      { method: "DELETE" },
    )
  },

  listTopics(scope: InstructorScope, session = "ALL") {
    return instructorRequest<{ topics: ModuleTopicRow[]; session: string; courseCode?: string }>(
      `/api/instructor/course-notes/topics?session=${encodeURIComponent(session)}`,
      scope,
    )
  },

  toggleTopic(scope: InstructorScope, topicName: string, session: string, isAvailable: boolean) {
    return instructorRequest<{ success: boolean }>(
      "/api/instructor/course-notes/topics/toggle",
      scope,
      {
        method: "POST",
        body: JSON.stringify({ topicName, session, isAvailable }),
      },
    )
  },

  getConfiguration(scope: InstructorScope) {
    return instructorRequest<ModuleConfiguration>("/api/instructor/course-notes/configuration", scope)
  },

  listDeleted(scope: InstructorScope) {
    return instructorRequest<{ notes: Array<CourseDigitalNote & { deletedAt?: string }> }>(
      "/api/instructor/course-notes/deleted",
      scope,
    )
  },

  restoreNotes(scope: InstructorScope, noteIds: number[]) {
    return instructorRequest<{ success: boolean; restoredNotes: number }>(
      "/api/instructor/course-notes/deleted",
      scope,
      { method: "PATCH", body: JSON.stringify({ noteIds }) },
    )
  },

  permanentlyDeleteNotes(scope: InstructorScope, noteIds: number[]) {
    return instructorRequest<{ success: boolean }>(
      "/api/instructor/course-notes/deleted",
      scope,
      { method: "DELETE", body: JSON.stringify({ noteIds }) },
    )
  },
}

export const instructorFlashcardsApi = {
  listDecks(scope: InstructorScope, session?: string) {
    const qs = session ? `?session=${encodeURIComponent(session)}` : ""
    return instructorRequest<{ decks: FlashcardDeck[]; courseCode?: string }>(
      `/api/instructor/flashcards/decks${qs}`,
      scope,
    )
  },

  createDeck(
    scope: InstructorScope,
    payload: {
      title?: string
      description?: string
      topic?: string
      session?: string | null
      showInPracticeHub?: boolean
      isPublished?: boolean
      requireMcqValidation?: boolean
      cardsBeforeQuiz?: number
    },
  ) {
    return instructorRequest<{ deck: FlashcardDeck }>("/api/instructor/flashcards/decks", scope, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getDeck(scope: InstructorScope, deckId: number) {
    return instructorRequest<{ deck: FlashcardDeck; cards: FlashcardCard[] }>(
      `/api/instructor/flashcards/decks/${deckId}`,
      scope,
    )
  },

  updateDeck(
    scope: InstructorScope,
    deckId: number,
    payload: {
      title?: string
      description?: string
      topic?: string | null
      session?: string | null
      showInPracticeHub?: boolean
      isPublished?: boolean
      requireMcqValidation?: boolean
      cardsBeforeQuiz?: number
    },
  ) {
    return instructorRequest<{ deck: FlashcardDeck }>(
      `/api/instructor/flashcards/decks/${deckId}`,
      scope,
      { method: "PATCH", body: JSON.stringify(payload) },
    )
  },

  deleteDeck(scope: InstructorScope, deckId: number) {
    return instructorRequest<{ success: boolean }>(
      `/api/instructor/flashcards/decks/${deckId}`,
      scope,
      { method: "DELETE" },
    )
  },

  addCard(
    scope: InstructorScope,
    deckId: number,
    payload: {
      frontText: string
      backText: string
      sortOrder?: number
      difficulty?: FlashcardDifficulty
    },
  ) {
    return instructorRequest<{ card: FlashcardCard }>(
      `/api/instructor/flashcards/decks/${deckId}/cards`,
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    )
  },

  updateCard(
    scope: InstructorScope,
    cardId: number,
    payload: {
      frontText?: string
      backText?: string
      sortOrder?: number
      difficulty?: FlashcardDifficulty
      customDistractors?: string[]
    },
  ) {
    return instructorRequest<{ card: FlashcardCard }>(
      `/api/instructor/flashcards/cards/${cardId}`,
      scope,
      { method: "PATCH", body: JSON.stringify(payload) },
    )
  },

  deleteCard(scope: InstructorScope, cardId: number) {
    return instructorRequest<{ success: boolean }>(
      `/api/instructor/flashcards/cards/${cardId}`,
      scope,
      { method: "DELETE" },
    )
  },

  listTopics(scope: InstructorScope, session = "ALL") {
    return instructorRequest<{ topics: ModuleTopicRow[]; session: string; courseCode?: string }>(
      `/api/instructor/flashcards/topics?session=${encodeURIComponent(session)}`,
      scope,
    )
  },

  toggleTopic(scope: InstructorScope, topicName: string, session: string, isAvailable: boolean) {
    return instructorRequest<{ success: boolean }>(
      "/api/instructor/flashcards/topics/toggle",
      scope,
      {
        method: "POST",
        body: JSON.stringify({ topicName, session, isAvailable }),
      },
    )
  },

  getConfiguration(scope: InstructorScope) {
    return instructorRequest<ModuleConfiguration>(
      "/api/instructor/flashcards/configuration",
      scope,
    )
  },

  updateConfiguration(
    scope: InstructorScope,
    payload: { requireMcqValidation?: boolean; cardsBeforeQuiz?: number },
  ) {
    return instructorRequest<FlashcardCourseSettings>(
      "/api/instructor/flashcards/configuration",
      scope,
      { method: "PATCH", body: JSON.stringify(payload) },
    )
  },

  listDeleted(scope: InstructorScope) {
    return instructorRequest<DeletedContent>("/api/instructor/flashcards/deleted", scope)
  },

  restoreDeleted(scope: InstructorScope, payload: { deckIds?: number[]; cardIds?: number[] }) {
    return instructorRequest<{ success: boolean }>("/api/instructor/flashcards/deleted", scope, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  },

  permanentlyDeleteDeleted(scope: InstructorScope, payload: { deckIds?: number[]; cardIds?: number[] }) {
    return instructorRequest<{ success: boolean }>("/api/instructor/flashcards/deleted", scope, {
      method: "DELETE",
      body: JSON.stringify(payload),
    })
  },

  generateFromBank(
    scope: InstructorScope,
    payload: { topicName: string; session?: string | null; deckId?: number | null; maxCards?: number },
  ) {
    return instructorRequest<{
      success: boolean
      deckId: number
      cardsAdded: number
      skipped: number
      deck: FlashcardDeck | null
      cards: FlashcardCard[]
    }>("/api/instructor/flashcards/generate-from-bank", scope, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
}
