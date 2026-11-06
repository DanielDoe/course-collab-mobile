import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  flashcardsApi,
  type FlashcardCard,
  type FlashcardDeck,
  type FlashcardGamificationProfile,
  type FlashcardStudySettings,
} from "../../lib/flashcards-api"
import {
  beginOptimistic,
  commitIfCurrent,
  createTempNumericId,
  queryKeys,
  removeById,
  replaceTempWithAuthoritative,
  resourceVersionKey,
  rollbackIfCurrent,
  studentQueryScope,
  STALE_BY_RESOURCE,
  upsertById,
} from "../../lib/query"
import type { StudentSession } from "../../lib/session"

type DecksData = {
  courseDecks: FlashcardDeck[]
  myDecks: FlashcardDeck[]
  courseId: number | null
  session: string | null
}

type DeckDetail = {
  deck: FlashcardDeck
  cards: FlashcardCard[]
  studySettings?: FlashcardStudySettings
}

type GamData = {
  profile: FlashcardGamificationProfile
  deckMastery?: Record<string, { pct: number }>
  leaderboard?: Array<{
    rank: number
    displayName: string
    cardsMastered: number
    isCurrentUser: boolean
  }>
}

export function useStudentFlashcardDecks(session: StudentSession | null) {
  const decks = useQuery({
    queryKey: session
      ? queryKeys.student.flashcards.decks(studentQueryScope(session))
      : ["student", "flashcards", "idle", "decks"],
    queryFn: () => flashcardsApi.listDecks(session!),
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.studentFlashcards,
  })
  const gam = useQuery({
    queryKey: session
      ? queryKeys.student.flashcards.gamification(studentQueryScope(session))
      : ["student", "flashcards", "idle", "gamification"],
    queryFn: () => flashcardsApi.getGamification(session!),
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.studentFlashcardGamification,
  })

  const hasData = decks.data != null
  return {
    courseDecks: decks.data?.courseDecks ?? [],
    myDecks: decks.data?.myDecks ?? [],
    studySettings: decks.data?.studySettings ?? null,
    profile: gam.data?.profile ?? null,
    deckMastery: gam.data?.deckMastery ?? {},
    leaderboard: gam.data?.leaderboard ?? [],
    isInitialLoading: !hasData && decks.isLoading,
    isRefreshing: decks.isFetching || gam.isFetching,
    refreshFailed: decks.isError && hasData,
    error: !hasData ? decks.error : null,
    refetch: async () => {
      await Promise.all([decks.refetch(), gam.refetch()])
    },
  }
}

export function useStudentFlashcardDeck(session: StudentSession | null, deckId: number) {
  const queryClient = useQueryClient()
  const scope = session ? studentQueryScope(session) : null
  const cachedDeck = (() => {
    if (!scope) return undefined
    const lists = queryClient.getQueryData<DecksData>(queryKeys.student.flashcards.decks(scope))
    return lists?.myDecks.find((deck) => deck.id === deckId) ?? lists?.courseDecks.find((deck) => deck.id === deckId)
  })()

  return useQuery({
    queryKey: scope
      ? queryKeys.student.flashcards.deck(scope, deckId)
      : ["student", "flashcards", "idle", "deck", deckId],
    queryFn: () => flashcardsApi.getDeck(session!, deckId),
    enabled: Boolean(session && scope && Number.isFinite(deckId) && deckId > 0),
    staleTime: STALE_BY_RESOURCE.studentFlashcards,
    initialData: cachedDeck ? { deck: cachedDeck, cards: [] } : undefined,
  })
}

export function useCreateStudentFlashcardDeck(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["student", "flashcards", "createDeck"],
    mutationFn: async (input: { tempId: number; title?: string }) => {
      if (!session) throw new Error("Not signed in")
      return flashcardsApi.createDeck(session, { title: input.title ?? "Untitled deck" })
    },
    onMutate: async (input) => {
      if (!session) return
      const scope = studentQueryScope(session)
      const queryKey = queryKeys.student.flashcards.decks(scope)
      await queryClient.cancelQueries({ queryKey })
      const now = new Date().toISOString()
      const optimistic: FlashcardDeck = {
        id: input.tempId,
        title: input.title ?? "Untitled deck",
        description: "",
        deckKind: "student",
        courseId: session.courseId ?? null,
        session: session.section ?? null,
        studentId: Number(session.databaseId) || null,
        instructorId: null,
        topic: null,
        showInPracticeHub: false,
        isPublished: false,
        cardCount: 0,
        requireMcqValidation: false,
        cardsBeforeQuiz: 0,
        createdAt: now,
        updatedAt: now,
        canEdit: true,
      }
      const ctx = beginOptimistic<DecksData>(
        queryClient,
        queryKey,
        resourceVersionKey("deck", input.tempId),
        (current) => ({
          courseDecks: current?.courseDecks ?? [],
          myDecks: [optimistic, ...(current?.myDecks ?? [])],
          courseId: current?.courseId ?? session.courseId ?? null,
          session: current?.session ?? session.section ?? null,
        }),
      )
      return { ...ctx, queryKey, scope }
    },
    onError: (_err, input, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.queryKey, resourceVersionKey("deck", input.tempId), ctx.version, ctx.previous)
    },
    onSuccess: (data, input, ctx) => {
      if (!ctx || !data.deck) return
      commitIfCurrent(queryClient, ctx.queryKey, resourceVersionKey("deck", input.tempId), ctx.version, {
        courseDecks: ctx.previous?.courseDecks ?? [],
        myDecks: replaceTempWithAuthoritative(ctx.previous?.myDecks ?? [], input.tempId, data.deck),
        courseId: ctx.previous?.courseId ?? null,
        session: ctx.previous?.session ?? null,
      })
      queryClient.setQueryData(queryKeys.student.flashcards.deck(ctx.scope, data.deck.id), {
        deck: data.deck,
        cards: [],
      })
    },
  })
}

export function useUpdateStudentFlashcardDeck(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      deckId: number
      title?: string
      description?: string
      topic?: string
    }) => {
      if (!session) throw new Error("Not signed in")
      return flashcardsApi.updateDeck(session, input.deckId, input)
    },
    onMutate: async (input) => {
      if (!session) return
      const scope = studentQueryScope(session)
      const listKey = queryKeys.student.flashcards.decks(scope)
      const detailKey = queryKeys.student.flashcards.deck(scope, input.deckId)
      const resourceKey = resourceVersionKey("deck", input.deckId)
      await queryClient.cancelQueries({ queryKey: listKey })
      const listCtx = beginOptimistic<DecksData>(queryClient, listKey, resourceKey, (current) => ({
        courseDecks: current?.courseDecks ?? [],
        myDecks: (current?.myDecks ?? []).map((deck) =>
          deck.id === input.deckId
            ? {
                ...deck,
                title: input.title ?? deck.title,
                description: input.description ?? deck.description,
                topic: input.topic ?? deck.topic,
              }
            : deck,
        ),
        courseId: current?.courseId ?? null,
        session: current?.session ?? null,
      }))
      const prevDetail = queryClient.getQueryData<DeckDetail>(detailKey)
      if (prevDetail) {
        queryClient.setQueryData(detailKey, {
          ...prevDetail,
          deck: {
            ...prevDetail.deck,
            title: input.title ?? prevDetail.deck.title,
            description: input.description ?? prevDetail.deck.description,
            topic: input.topic ?? prevDetail.deck.topic,
          },
        })
      }
      return { listCtx, prevDetail, listKey, detailKey, resourceKey }
    },
    onError: (_err, _input, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.listKey, ctx.resourceKey, ctx.listCtx.version, ctx.listCtx.previous)
      queryClient.setQueryData(ctx.detailKey, ctx.prevDetail)
    },
    onSuccess: (data, _input, ctx) => {
      if (!ctx || !data.deck) return
      const previous = ctx.listCtx.previous
      commitIfCurrent(queryClient, ctx.listKey, ctx.resourceKey, ctx.listCtx.version, {
        courseDecks: previous?.courseDecks ?? [],
        myDecks: upsertById(previous?.myDecks ?? [], data.deck),
        courseId: previous?.courseId ?? null,
        session: previous?.session ?? null,
      })
    },
  })
}

export function useDeleteStudentFlashcardDeck(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (deckId: number) => {
      if (!session) throw new Error("Not signed in")
      return flashcardsApi.deleteDeck(session, deckId)
    },
    onMutate: async (deckId) => {
      if (!session) return
      const scope = studentQueryScope(session)
      const listKey = queryKeys.student.flashcards.decks(scope)
      const resourceKey = resourceVersionKey("deck-del", deckId)
      await queryClient.cancelQueries({ queryKey: listKey })
      const ctx = beginOptimistic<DecksData>(queryClient, listKey, resourceKey, (current) => ({
        courseDecks: current?.courseDecks ?? [],
        myDecks: removeById(current?.myDecks ?? [], deckId),
        courseId: current?.courseId ?? null,
        session: current?.session ?? null,
      }))
      queryClient.removeQueries({ queryKey: queryKeys.student.flashcards.deck(scope, deckId) })
      return { ...ctx, listKey, resourceKey }
    },
    onError: (_err, _deckId, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.listKey, ctx.resourceKey, ctx.version, ctx.previous)
    },
  })
}

export function useAddStudentFlashcardCard(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      deckId: number
      tempId: number
      frontText: string
      backText: string
      sortOrder?: number
      difficulty?: FlashcardCard["difficulty"]
    }) => {
      if (!session) throw new Error("Not signed in")
      return flashcardsApi.addCard(session, input.deckId, {
        frontText: input.frontText,
        backText: input.backText,
        sortOrder: input.sortOrder,
        difficulty: input.difficulty,
      })
    },
    onMutate: async (input) => {
      if (!session) return
      const scope = studentQueryScope(session)
      const detailKey = queryKeys.student.flashcards.deck(scope, input.deckId)
      const resourceKey = resourceVersionKey("card", input.tempId)
      const now = new Date().toISOString()
      const optimistic: FlashcardCard = {
        id: input.tempId,
        deckId: input.deckId,
        frontText: input.frontText,
        backText: input.backText,
        sortOrder: input.sortOrder ?? 0,
        difficulty: input.difficulty ?? "medium",
        createdAt: now,
        updatedAt: now,
      }
      const ctx = beginOptimistic<DeckDetail>(queryClient, detailKey, resourceKey, (current) => {
        const deck = current?.deck
        if (!deck) return current as unknown as DeckDetail
        return {
          ...current,
          deck: { ...deck, cardCount: deck.cardCount + 1 },
          cards: [...(current.cards ?? []), optimistic],
        }
      })
      return { ...ctx, detailKey, resourceKey, scope }
    },
    onError: (_err, input, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.detailKey, ctx.resourceKey, ctx.version, ctx.previous)
    },
    onSuccess: (data, input, ctx) => {
      if (!ctx || !data.card || !ctx.previous) return
      commitIfCurrent(queryClient, ctx.detailKey, ctx.resourceKey, ctx.version, {
        ...ctx.previous,
        deck: { ...ctx.previous.deck, cardCount: ctx.previous.deck.cardCount + 1 },
        cards: replaceTempWithAuthoritative(ctx.previous.cards ?? [], input.tempId, data.card),
      })
    },
  })
}

export function useDeleteStudentFlashcardCard(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { deckId: number; cardId: number }) => {
      if (!session) throw new Error("Not signed in")
      return flashcardsApi.deleteCard(session, input.cardId)
    },
    onMutate: async (input) => {
      if (!session) return
      const scope = studentQueryScope(session)
      const detailKey = queryKeys.student.flashcards.deck(scope, input.deckId)
      const resourceKey = resourceVersionKey("card-del", input.cardId)
      const ctx = beginOptimistic<DeckDetail>(queryClient, detailKey, resourceKey, (current) => {
        if (!current) return current as unknown as DeckDetail
        return {
          ...current,
          deck: { ...current.deck, cardCount: Math.max(0, current.deck.cardCount - 1) },
          cards: removeById(current.cards ?? [], input.cardId),
        }
      })
      return { ...ctx, detailKey, resourceKey }
    },
    onError: (_err, _input, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.detailKey, ctx.resourceKey, ctx.version, ctx.previous)
    },
  })
}

export function prepareTempDeckId(): number {
  return createTempNumericId()
}

export function prepareTempCardId(): number {
  return createTempNumericId()
}

export type { GamData }
