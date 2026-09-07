import { useQuery } from "@tanstack/react-query"
import { instructorApi } from "../../lib/instructor-api"
import { instructorFlashcardsApi, type InstructorScope } from "../../lib/instructor-content-api"
import { fetchFacultyTermSessions } from "../../lib/faculty-section-scope"
import { filterMisplacedCircuitFlashcardDecks } from "../../lib/faculty-misplaced-circuit-content"
import { facultyQueryScopeFromInstructor, queryKeys, STALE_BY_RESOURCE } from "../../lib/query"
import { keepSameCoursePlaceholder } from "../../lib/query/same-course-placeholder"
import { DEFAULT_FLASHCARD_BATCH_SIZE } from "../../lib/flashcard-batch-study"

export async function fetchFacultyFlashcardsBundle(
  scope: InstructorScope,
  deckApiSession: string | undefined,
  topicApiSession: string | undefined,
) {
  const topicSentinel = topicApiSession ?? "ALL"
  const [decksRes, deletedRes, topicsRes, configRes, bankTopicsRes, sessionsRes] = await Promise.all([
    instructorFlashcardsApi.listDecks(scope, deckApiSession),
    instructorFlashcardsApi.listDeleted(scope),
    instructorFlashcardsApi.listTopics(scope, topicSentinel),
    instructorFlashcardsApi.getConfiguration(scope),
    instructorApi.getQuestionBankTopics(scope),
    fetchFacultyTermSessions(scope).catch(() => []),
  ])
  return {
    decks: filterMisplacedCircuitFlashcardDecks(decksRes.decks ?? []),
    deletedDecks: deletedRes.decks ?? [],
    deletedCards: deletedRes.cards ?? [],
    topics: topicsRes.topics ?? [],
    bankTopics: bankTopicsRes,
    config: configRes,
    sessions: sessionsRes,
    configBatchSize: String(configRes.cardsBeforeQuiz ?? DEFAULT_FLASHCARD_BATCH_SIZE),
  }
}

export function useFacultyFlashcards(
  scope: InstructorScope | null,
  deckApiSession: string,
  topicApiSession: string,
) {
  const queryKey = scope
    ? queryKeys.faculty.flashcards.bundle(
        facultyQueryScopeFromInstructor(scope),
        deckApiSession || "ALL",
        topicApiSession || "ALL",
      )
    : (["faculty", "flashcards", "idle", "bundle", deckApiSession, topicApiSession] as const)
  const query = useQuery({
    queryKey,
    queryFn: () => fetchFacultyFlashcardsBundle(scope!, deckApiSession || undefined, topicApiSession || undefined),
    enabled: Boolean(scope?.courseId),
    staleTime: STALE_BY_RESOURCE.facultyFlashcards,
    placeholderData: (previous, previousQuery) => keepSameCoursePlaceholder(previous, previousQuery, queryKey),
  })
  const hasData = query.data != null
  return {
    decks: query.data?.decks ?? [],
    deletedDecks: query.data?.deletedDecks ?? [],
    deletedCards: query.data?.deletedCards ?? [],
    topics: query.data?.topics ?? [],
    bankTopics: query.data?.bankTopics ?? [],
    config: query.data?.config ?? null,
    sessions: query.data?.sessions ?? [],
    configBatchSize: query.data?.configBatchSize ?? String(DEFAULT_FLASHCARD_BATCH_SIZE),
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
