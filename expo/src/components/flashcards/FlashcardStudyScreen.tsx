import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  flashcardDeckLockedCountForAccess,
  flashcardUpgradeMessageForAccess,
  isFlashcardDeckStudyLockedForAccess,
} from "../../lib/flashcard-access"
import {
  DEFAULT_FLASHCARD_BATCH_SIZE,
  splitFlashcardBatches,
  usesFlashcardBatchQuiz,
  type FlashcardBatchStudyPhase,
} from "../../lib/flashcard-batch-study"
import { buildFlashcardMcq, canUseFlashcardMcq } from "../../lib/flashcard-quiz"
import {
  flashcardsApi,
  FLASHCARD_TIMED_SECONDS,
  type FlashcardCard,
  type FlashcardDeck,
  type FlashcardStudyRecordResult,
  type FlashcardStudySettings,
} from "../../lib/flashcards-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { safeRouterBack } from "../../lib/safe-router-back"
import { FlashcardFlipCard, FlashcardTimerBar } from "./FlashcardFlipCard"
import { FlashcardDifficultyBadge } from "./FlashcardDifficultyBadge"
import { normalizeFlashcardDifficulty } from "../../lib/flashcard-difficulty"
import {
  FlashcardKnownCelebration,
  type FlashcardCelebrationPayload,
} from "./FlashcardKnownCelebration"
import { FlashcardInvalidRoute } from "./FlashcardInvalidRoute"
import { FlashcardMcqChoices, FlashcardMcqPrompt } from "./FlashcardMcqUI"
import { WaterBreakDurationDialog, WaterBreakOverlay } from "./FlashcardWaterBreak"
import { FLASHCARD_WABI_STAGE_HEIGHT, FLASHCARD_WABI_SPRING } from "../../lib/flashcard-wabi-theme"
import { MobbinPillSegmentControl } from "../theme/MobbinPillSegmentControl"
import { AppButton } from "../theme/AppButton"

type StudyMode = "normal" | "timed" | "quiz"
const FLASHCARDS_HOME = "/module/flashcards"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function shuffleCards(cards: FlashcardCard[]): FlashcardCard[] {
  const copy = [...cards]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function FlashcardStudyScreen() {
  const { deckId: deckIdRaw } = useLocalSearchParams<{ deckId: string }>()
  const deckId = Number(deckIdRaw)
  const session = useStudentSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const { membershipTierLoaded } = useStudentShell()
  const sessionIdRef = useRef(`fc-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const answeringRef = useRef(false)
  const knownExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [accessLocked, setAccessLocked] = useState(false)
  const [deck, setDeck] = useState<FlashcardDeck | null>(null)
  const [cards, setCards] = useState<FlashcardCard[]>([])
  const [totalCardCount, setTotalCardCount] = useState(0)
  const [queue, setQueue] = useState<FlashcardCard[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [finished, setFinished] = useState(false)
  const [streak, setStreak] = useState(0)
  const [sessionXp, setSessionXp] = useState(0)
  const [studyMode, setStudyMode] = useState<StudyMode>("normal")
  const [timedModeSeconds, setTimedModeSeconds] = useState(FLASHCARD_TIMED_SECONDS)
  const [cardTimer, setCardTimer] = useState(FLASHCARD_TIMED_SECONDS)
  const [studySettings, setStudySettings] = useState<FlashcardStudySettings | null>(null)
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set())
  const [sessionMastered, setSessionMastered] = useState<Set<number>>(new Set())
  const [celebration, setCelebration] = useState<FlashcardCelebrationPayload | null>(null)
  const [knownExiting, setKnownExiting] = useState(false)
  const pendingKnownAdvanceRef = useRef<(() => void) | null>(null)
  const xpPulse = useSharedValue(1)

  const [batchIndex, setBatchIndex] = useState(0)
  const [learnIndex, setLearnIndex] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [studyPhase, setStudyPhase] = useState<FlashcardBatchStudyPhase>("learn")
  const [waterBreakPickerOpen, setWaterBreakPickerOpen] = useState(false)
  const [waterBreakSeconds, setWaterBreakSeconds] = useState(0)
  const [mcqFeedback, setMcqFeedback] = useState<"correct" | "incorrect" | null>(null)
  const [mcqSelectedId, setMcqSelectedId] = useState<string | null>(null)
  const [mcqLocked, setMcqLocked] = useState(false)

  const batches = useMemo(
    () => splitFlashcardBatches(cards, deck?.cardsBeforeQuiz ?? DEFAULT_FLASHCARD_BATCH_SIZE),
    [cards, deck?.cardsBeforeQuiz],
  )
  const batchMode =
    deck != null && usesFlashcardBatchQuiz(deck.requireMcqValidation !== false, cards.length)
  const currentBatch = batchMode ? (batches[batchIndex] ?? []) : []

  const current = batchMode
    ? studyPhase === "batch_quiz"
      ? currentBatch[quizIndex]
      : studyPhase === "learn"
        ? currentBatch[learnIndex]
        : undefined
    : queue[index]

  const cardPositionIndex = batchMode
    ? studyPhase === "batch_quiz"
      ? quizIndex
      : learnIndex
    : index
  const cardPositionTotal = batchMode ? currentBatch.length : queue.length
  const upcomingStackDifficulties = useMemo(() => {
    if (batchMode) {
      if (studyPhase !== "learn") return []
      return currentBatch
        .slice(learnIndex + 1, learnIndex + 4)
        .map((card) => normalizeFlashcardDifficulty(card.difficulty))
    }
    return queue
      .slice(index + 1, index + 4)
      .map((card) => normalizeFlashcardDifficulty(card.difficulty))
  }, [batchMode, studyPhase, currentBatch, learnIndex, queue, index])
  const progressLabel =
    cardPositionTotal > 0
      ? `${Math.min(cardPositionIndex + 1, cardPositionTotal)} / ${cardPositionTotal}`
      : "0 / 0"

  const isTimed = studyMode === "timed"
  const isBossCard = !batchMode && !finished && queue.length === 1 && current != null
  const batchQuizActive = batchMode && studyPhase === "batch_quiz"
  const inlineMcqEnabled =
    !batchMode && deck?.requireMcqValidation !== false && canUseFlashcardMcq(cards)
  const mcqEnabled = inlineMcqEnabled || batchQuizActive
  const currentMcq = useMemo(() => {
    if (!current || !mcqEnabled) return null
    return buildFlashcardMcq(current, cards)
  }, [cards, current, mcqEnabled])

  const batchStatusLabel =
    batchMode && !finished
      ? studyPhase === "learn"
        ? `Batch ${batchIndex + 1}/${batches.length} · Learn ${progressLabel} · streak ${streak}`
        : studyPhase === "batch_quiz"
          ? `Batch ${batchIndex + 1}/${batches.length} · Quiz ${progressLabel} · streak ${streak}`
          : `Batch ${batchIndex + 1}/${batches.length} · Water break`
      : null

  const lockedCardCount = useMemo(() => {
    if (studySettings && deck?.deckKind === "course") {
      return flashcardDeckLockedCountForAccess(studySettings.totalCards, studySettings.tierAccess)
    }
    return Math.max(0, totalCardCount - cards.length)
  }, [cards.length, deck?.deckKind, studySettings, totalCardCount])

  const resetBatchStudy = useCallback(() => {
    setBatchIndex(0)
    setLearnIndex(0)
    setQuizIndex(0)
    setStudyPhase("learn")
    setWaterBreakPickerOpen(false)
    setWaterBreakSeconds(0)
    setMcqFeedback(null)
    setMcqSelectedId(null)
    setMcqLocked(false)
  }, [])

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(deckId)) return
    const [deckRes, progressRes] = await Promise.all([
      flashcardsApi.getDeck(session, deckId),
      flashcardsApi.getStudyProgress(session, deckId),
    ])
    const loadedCards = deckRes.cards ?? []
    if (loadedCards.length === 0) throw new ApiError("This deck has no cards.", 400)

    const settings = deckRes.studySettings ?? null
    const timedSeconds = settings?.timedModeSeconds ?? FLASHCARD_TIMED_SECONDS
    setTimedModeSeconds(timedSeconds)
    setCardTimer(timedSeconds)
    setStudySettings(settings)

    if (
      deckRes.deck.deckKind === "course" &&
      settings &&
      isFlashcardDeckStudyLockedForAccess(settings.totalCards, settings.tierAccess)
    ) {
      setAccessLocked(true)
      throw new ApiError(flashcardUpgradeMessageForAccess(settings.tierAccess), 403)
    }

    setAccessLocked(false)
    setTotalCardCount(settings?.totalCards ?? loadedCards.length)
    setDeck(deckRes.deck)
    setCards(loadedCards)
    setQueue(shuffleCards(loadedCards))
    setMasteredIds(new Set(progressRes.masteredCardIds ?? []))
    setSessionMastered(new Set())
    resetBatchStudy()
    if (deckRes.deck.requireMcqValidation === false) {
      setStudyMode((m) => (m === "quiz" ? "normal" : m))
    }
  }, [session, deckId, resetBatchStudy])

  useEffect(() => {
    if (!session || !Number.isFinite(deckId) || !membershipTierLoaded) return
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not start study session."))
      .finally(() => setLoading(false))
  }, [session, deckId, load, membershipTierLoaded])

  useEffect(() => {
    setFlipped(false)
    setMcqFeedback(null)
    setMcqSelectedId(null)
    setMcqLocked(false)
    if (isTimed) setCardTimer(timedModeSeconds)
  }, [current?.id, cardPositionIndex, studyPhase, isTimed, timedModeSeconds])

  useEffect(() => {
    if (!isTimed || finished || !current || batchQuizActive) return
    const interval = setInterval(() => {
      setCardTimer((prev) => (prev <= 0 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [isTimed, finished, current?.id, cardPositionIndex, batchQuizActive])

  const recordStudy = useCallback(
    async (payload: {
      cardId?: number
      outcome: "known" | "learning" | "session_complete"
      streak?: number
      bonusType?: "timed" | "boss"
    }) => {
      if (!session) return null
      try {
        const res = await flashcardsApi.recordStudyEvent(session, deckId, {
          ...payload,
          sessionId: sessionIdRef.current,
        })
        if (res.pointsEarned > 0) {
          setSessionXp((x) => x + res.pointsEarned)
        }
        return res
      } catch {
        return null
      }
    },
    [session, deckId],
  )

  const persistKnownCard = useCallback(
    async (
      cardId: number,
      nextStreak: number,
      bonusType?: "timed" | "boss",
    ): Promise<FlashcardStudyRecordResult | null> => {
      const res = await recordStudy({
        cardId,
        outcome: "known",
        streak: nextStreak,
        bonusType,
      })
      if (!res || res.recorded === false) {
        AppAlert.alert(
          "Save failed",
          "Your progress could not be saved. Check your connection and try again.",
        )
        return null
      }
      setMasteredIds((prev) => new Set(prev).add(cardId))
      setSessionMastered((prev) => new Set(prev).add(cardId))
      return res
    },
    [recordStudy],
  )

  const finishSession = useCallback(
    async (finalStreak?: number) => {
      setFinished(true)
      await recordStudy({ outcome: "session_complete", streak: finalStreak ?? streak })
    },
    [recordStudy, streak],
  )

  const startNextBatchOrFinish = useCallback(
    async (masteredCount: number) => {
      const nextBatch = batchIndex + 1
      if (nextBatch >= batches.length) {
        await finishSession()
        return
      }
      setBatchIndex(nextBatch)
      setLearnIndex(0)
      setQuizIndex(0)
      setStudyPhase("learn")
      setFlipped(false)
    },
    [batchIndex, batches.length, finishSession],
  )

  const beginBatchQuiz = useCallback(() => {
    setWaterBreakPickerOpen(false)
    setStudyPhase("batch_quiz")
    setQuizIndex(0)
    setFlipped(false)
    setMcqFeedback(null)
    setMcqSelectedId(null)
    setMcqLocked(false)
  }, [])

  const completeLearnBatch = useCallback(() => {
    setFlipped(false)
    setStudyPhase("water_break_picker")
    setWaterBreakPickerOpen(true)
  }, [])

  const completeCelebration = useCallback(() => {
    setCelebration(null)
  }, [])

  const completeKnownExit = useCallback(() => {
    if (knownExitTimerRef.current) {
      clearTimeout(knownExitTimerRef.current)
      knownExitTimerRef.current = null
    }
    setKnownExiting(false)
    const advance = pendingKnownAdvanceRef.current
    pendingKnownAdvanceRef.current = null
    advance?.()
  }, [])

  const scheduleKnownAdvance = useCallback(
    (advance: () => void) => {
      pendingKnownAdvanceRef.current = advance
      setKnownExiting(true)
      if (knownExitTimerRef.current) clearTimeout(knownExitTimerRef.current)
      knownExitTimerRef.current = setTimeout(() => {
        knownExitTimerRef.current = null
        if (pendingKnownAdvanceRef.current) {
          completeKnownExit()
        }
      }, FLASHCARD_WABI_SPRING.knownExit.duration + 100)
    },
    [completeKnownExit],
  )

  useEffect(
    () => () => {
      if (knownExitTimerRef.current) clearTimeout(knownExitTimerRef.current)
    },
    [],
  )

  function pulseSessionXp() {
    xpPulse.value = withSequence(
      withSpring(1.14, { damping: 8, stiffness: 280 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    )
  }

  const xpLabelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpPulse.value }],
  }))

  function buildCelebrationPayload(
    res: FlashcardStudyRecordResult | null,
    nextStreak: number,
    bonusType?: "timed" | "boss",
  ): FlashcardCelebrationPayload {
    return {
      pointsEarned: res?.pointsEarned ?? 0,
      streakBonus: res?.streakBonus ?? 0,
      streak: nextStreak,
      bonusType,
      firstKnownThisWeek: res?.firstKnownThisWeek,
    }
  }

  const advanceLearnBatch = useCallback(
    async (known: boolean) => {
      if (!current || !currentBatch.length) return
      const nextStreak = known ? streak + 1 : 0
      const nextLearn = learnIndex + 1

      if (known) {
        const res = await persistKnownCard(current.id, nextStreak)
        if (!res) return

        setStreak(nextStreak)
        if (res.pointsEarned > 0) {
          pulseSessionXp()
          setCelebration(buildCelebrationPayload(res, nextStreak))
        }
        setFlipped(false)
        if (nextLearn >= currentBatch.length) {
          completeLearnBatch()
        } else {
          setLearnIndex(nextLearn)
        }
        return
      }

      setStreak(0)
      void recordStudy({ cardId: current.id, outcome: "learning" })
      setFlipped(false)
      if (nextLearn >= currentBatch.length) {
        completeLearnBatch()
      } else {
        setLearnIndex(nextLearn)
      }
    },
    [completeLearnBatch, current, currentBatch.length, learnIndex, persistKnownCard, recordStudy, streak],
  )

  async function answer(outcome: "known" | "learning", bonusType?: "timed" | "boss") {
    if (!session || !current || finished || knownExiting || answeringRef.current) return
    if (batchMode && studyPhase === "learn") {
      if (!flipped) return
      answeringRef.current = true
      try {
        await advanceLearnBatch(outcome === "known")
      } finally {
        answeringRef.current = false
      }
      return
    }
    if (currentMcq) return
    if (!flipped) return

    answeringRef.current = true
    try {
      const isLast = index >= queue.length - 1
      const nextStreak = outcome === "known" ? streak + 1 : 0

      if (outcome === "known") {
        const res = await persistKnownCard(current.id, nextStreak, bonusType)
        if (!res) return

        setStreak(nextStreak)
        if (res.pointsEarned > 0) {
          pulseSessionXp()
          setCelebration(buildCelebrationPayload(res, nextStreak, bonusType))
        }

        scheduleKnownAdvance(() => {
          setFlipped(false)
          if (isLast) {
            void finishSession(nextStreak)
          } else {
            setIndex((prev) => prev + 1)
          }
        })
        return
      }

      await recordStudy({
        cardId: current.id,
        outcome,
        streak: nextStreak,
        bonusType,
      })

      setStreak(nextStreak)
      setFlipped(false)

      if (isLast) {
        await finishSession()
        return
      }

      const card = queue[index]
      const newQueue = [...queue.slice(0, index), ...queue.slice(index + 1), card]
      setQueue(newQueue)
      if (index >= newQueue.length) setIndex(Math.max(0, newQueue.length - 1))
    } finally {
      answeringRef.current = false
    }
  }

  const advanceBatchQuiz = useCallback(
    async (correct: boolean) => {
      if (!current || !currentBatch.length) return
      const isLastInBatch = quizIndex >= currentBatch.length - 1
      let nextStreak = streak

      if (correct) {
        nextStreak = streak + 1
        const res = await persistKnownCard(current.id, nextStreak)
        if (!res) return

        setStreak(nextStreak)
        if (res.pointsEarned > 0) {
          pulseSessionXp()
          setCelebration(buildCelebrationPayload(res, nextStreak))
        }
        setMcqFeedback(null)
        setMcqSelectedId(null)
        setMcqLocked(false)
        setFlipped(false)

        if (isLastInBatch) {
          await startNextBatchOrFinish(sessionMastered.size + 1)
        } else {
          setQuizIndex((prev) => prev + 1)
        }
        return
      }

      setStreak(0)
      await recordStudy({ cardId: current.id, outcome: "learning" })
      setMcqFeedback(null)
      setMcqSelectedId(null)
      setMcqLocked(false)
      if (isLastInBatch) {
        await startNextBatchOrFinish(sessionMastered.size)
      } else {
        setQuizIndex((prev) => prev + 1)
      }
    },
    [current, currentBatch.length, persistKnownCard, quizIndex, recordStudy, sessionMastered.size, startNextBatchOrFinish, streak],
  )

  const handleMcqAnswer = useCallback(
    (choiceId: string) => {
      if (mcqLocked || !currentMcq) return
      const choice = currentMcq.choices.find((c) => c.id === choiceId)
      if (!choice) return
      setMcqSelectedId(choiceId)
      setMcqLocked(true)
      setMcqFeedback(choice.isCorrect ? "correct" : "incorrect")
      setTimeout(() => {
        if (batchQuizActive) {
          void advanceBatchQuiz(choice.isCorrect)
        } else {
          void answer(choice.isCorrect ? "known" : "learning")
        }
      }, choice.isCorrect ? 700 : 1600)
    },
    [advanceBatchQuiz, answer, batchQuizActive, currentMcq, mcqLocked],
  )

  function reshuffle() {
    const shuffled = shuffleCards(cards)
    setCards(shuffled)
    setQueue(shuffled)
    setIndex(0)
    setFlipped(false)
    setFinished(false)
    setStreak(0)
    setSessionMastered(new Set())
    setCardTimer(timedModeSeconds)
    setKnownExiting(false)
    pendingKnownAdvanceRef.current = null
    resetBatchStudy()
    sessionIdRef.current = `fc-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  function selectMode(mode: StudyMode) {
    setStudyMode(mode)
    setFlipped(false)
    setCardTimer(timedModeSeconds)
  }

  const modeOptions = useMemo(() => {
    const options: Array<{ id: StudyMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
      { id: "normal", label: "Normal", icon: "albums-outline" },
      { id: "timed", label: "Timed", icon: "timer-outline" },
    ]
    if (deck?.requireMcqValidation !== false && canUseFlashcardMcq(cards)) {
      options.push({ id: "quiz", label: "Quiz", icon: "list-outline" })
    }
    return options
  }, [cards, deck?.requireMcqValidation])

  const masteredCount = sessionMastered.size

  if (!Number.isFinite(deckId) || deckId < 1) {
    return <FlashcardInvalidRoute />
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    )
  }

  if (error || !deck) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.body, { color: tokens.danger, textAlign: "center" }]}>
          {error || "Deck unavailable."}
        </Text>
        {accessLocked ? (
          <Pressable onPress={() => router.push("/membership" as never)} style={{ marginTop: 12 }}>
            <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>View plans</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => safeRouterBack(router, FLASHCARDS_HOME)}>
            <Text style={[type.bodyEmphasis, { color: tokens.accent, marginTop: 12 }]}>Go back</Text>
          </Pressable>
        )}
      </View>
    )
  }

  const showStudyBody = !finished && studyPhase !== "water_break" && current
  const showWaterBreak = !finished && studyPhase === "water_break"

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: native.separator }]}>
        <Pressable
          onPress={() => safeRouterBack(router, FLASHCARDS_HOME)}
          hitSlop={8}
          style={styles.topBack}
          accessibilityRole="button"
          accessibilityLabel="Back to flashcards"
        >
          <Ionicons name="chevron-back" size={24} color={tokens.accent} />
        </Pressable>

        <View style={styles.topCopy}>
          <Text style={[type.bodyEmphasis, styles.topTitle, { color: native.label }]} numberOfLines={1}>
            {deck.title}
          </Text>
        </View>

        <View style={styles.topActions}>
          <View
            style={[
              styles.xpPill,
              { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder },
            ]}
          >
            <Ionicons name="flash-outline" size={12} color={tokens.accent} />
            <Animated.Text
              style={[type.caption, xpLabelStyle, styles.xpLabel, { color: tokens.accent }]}
              numberOfLines={1}
            >
              {sessionXp} XP
            </Animated.Text>
          </View>
          <Pressable
            onPress={reshuffle}
            hitSlop={8}
            style={[styles.topActionBtn, { backgroundColor: native.fill }]}
            accessibilityRole="button"
            accessibilityLabel="Shuffle deck"
          >
            <Ionicons name="shuffle-outline" size={20} color={tokens.accent} />
          </Pressable>
        </View>
      </View>

      <View style={styles.modeTabs}>
        <MobbinPillSegmentControl
          options={modeOptions}
          value={studyMode}
          onChange={selectMode}
        />
      </View>

      {lockedCardCount > 0 ? (
        <View
          style={[
            styles.accessBanner,
            { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder },
          ]}
        >
          <Ionicons name="lock-closed-outline" size={16} color={tokens.accent} />
          <View style={styles.accessCopy}>
            <Text style={[type.caption, styles.accessTitle, { color: native.label }]}>
              {cards.length} of {totalCardCount} cards unlocked
            </Text>
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 17 }]}>
              Explorer unlocks half of each deck. Trailblazer unlocks every card.
            </Text>
          </View>
          <Pressable onPress={() => router.push("/membership" as never)} hitSlop={8}>
            <Text style={[type.caption, { color: tokens.accent, fontWeight: "700" }]}>Upgrade</Text>
          </Pressable>
        </View>
      ) : null}

      {isTimed && !finished && !batchQuizActive && studyPhase === "learn" ? (
        <View style={styles.timedMeta}>
          <FlashcardTimerBar secondsLeft={cardTimer} totalSeconds={timedModeSeconds} />
          <Text style={[type.caption, styles.timedHint, { color: native.secondaryLabel }]}>
            {cardTimer > 0
              ? "Flip and mark Known before time runs out for bonus XP"
              : "Time's up — no speed bonus on this card"}
          </Text>
        </View>
      ) : null}

      {isBossCard && !finished ? (
        <View
          style={[
            styles.bossBanner,
            { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder },
          ]}
        >
          <Ionicons name="trophy-outline" size={16} color={tokens.accent} />
          <Text style={[type.caption, { color: tokens.accent, fontWeight: "600" }]}>
            Boss card — master it for bonus XP
          </Text>
        </View>
      ) : null}

      {finished ? (
        <View style={styles.doneBox}>
          <Ionicons name="checkmark-circle-outline" size={48} color={tokens.success} />
          <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 22 }]}>Session complete</Text>
          <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center" }]}>
            {masteredCount} cards mastered this session · {sessionXp} XP earned
          </Text>
          <AppButton label="Study again" onPress={reshuffle} variant="primary" />
          {deck.canEdit ? (
            <Pressable onPress={() => router.push(`/flashcards/${deck.id}/edit`)}>
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Edit deck</Text>
            </Pressable>
          ) : null}
        </View>
      ) : showWaterBreak ? (
        <WaterBreakOverlay
          totalSeconds={waterBreakSeconds}
          onResume={beginBatchQuiz}
          resumeLabel="Continue to quiz"
          activeHint="Take a breather — batch quiz questions are up next."
          completeHint="Ready for your batch quiz?"
        />
      ) : showStudyBody ? (
        currentMcq ? (
          <ScrollView
            contentContainerStyle={[styles.studyScroll, { paddingBottom: insets.bottom + 16 }]}
            keyboardShouldPersistTaps="handled"
          >
            <FlashcardMcqPrompt
              mcq={currentMcq}
              badge={`${batchQuizActive || studyMode === "quiz" ? "Quiz" : "Check"} · ${progressLabel}`}
              variant={batchQuizActive || studyMode === "quiz" ? "quiz" : "check"}
            />
            <FlashcardMcqChoices
              mcq={currentMcq}
              feedback={mcqFeedback}
              selectedChoiceId={mcqSelectedId}
              locked={mcqLocked}
              onSelect={handleMcqAnswer}
            />
            <Text style={[type.caption, styles.mcqHint, { color: native.secondaryLabel }]}>
              {batchQuizActive
                ? "Answer each question to earn engagement points"
                : studyMode === "quiz"
                  ? "Quiz mode — wrong answers send the card back into your queue"
                  : "Answer the check question to prove you know this card"}
            </Text>
          </ScrollView>
        ) : (
          <View style={[styles.studyBody, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.cardStage}>
              <View style={styles.cardWrap}>
                <FlashcardFlipCard
                  frontText={current.frontText}
                  backText={current.backText}
                  flipped={flipped}
                  onFlip={() => setFlipped((prev) => !prev)}
                  cardKey={current.id}
                  cardIndex={cardPositionIndex}
                  difficulty={current.difficulty}
                  stackDifficulties={upcomingStackDifficulties}
                  exiting={knownExiting}
                  onExitComplete={completeKnownExit}
                />
              </View>
              {celebration ? (
                <FlashcardKnownCelebration payload={celebration} onComplete={completeCelebration} />
              ) : null}
            </View>

            {current && !finished ? (
              <View style={styles.studyMeta}>
                <FlashcardDifficultyBadge difficulty={current.difficulty} />
                {batchMode && batchStatusLabel ? (
                  <Text
                    style={[type.caption, styles.studyPositionLabel, { color: native.secondaryLabel }]}
                    numberOfLines={1}
                  >
                    {batchStatusLabel}
                  </Text>
                ) : !batchMode ? (
                  <Text
                    style={[type.caption, styles.studyPositionLabel, { color: native.secondaryLabel }]}
                    numberOfLines={1}
                  >
                    {progressLabel}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.actions}>
              <AppButton
                label="Still learning"
                onPress={() => void answer("learning")}
                variant="secondary"
                icon="refresh-outline"
                iconPosition="left"
                disabled={!flipped || knownExiting}
                style={styles.actionFlex}
              />
              <AppButton
                label="Known"
                onPress={() =>
                  void answer(
                    "known",
                    isTimed && cardTimer > 0 ? "timed" : isBossCard ? "boss" : undefined,
                  )
                }
                variant="primary"
                icon="checkmark-outline"
                iconPosition="left"
                disabled={!flipped || knownExiting}
                style={styles.actionFlex}
              />
            </View>
            {!flipped ? (
              <Text style={[type.caption, styles.mcqHint, { color: native.secondaryLabel }]}>
                {batchMode && studyPhase === "learn"
                  ? "Learn this batch — quiz comes after your water break"
                  : "Flip the card first, then rate yourself"}
              </Text>
            ) : null}
          </View>
        )
      ) : null}

      <WaterBreakDurationDialog
        visible={waterBreakPickerOpen}
        onDismiss={beginBatchQuiz}
        onStart={(minutes) => {
          setWaterBreakPickerOpen(false)
          setWaterBreakSeconds(minutes * 60)
          setStudyPhase("water_break")
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBack: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  topCopy: { flex: 1, minWidth: 0 },
  topTitle: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 88,
  },
  xpLabel: { fontWeight: "700", lineHeight: 16 },
  topActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabs: {
    width: "100%",
    alignSelf: "center",
    marginBottom: 16,
  },
  accessBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  accessCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  accessTitle: {
    fontWeight: "600",
    lineHeight: 18,
  },
  timedMeta: { paddingTop: 4, gap: 6 },
  timedHint: { textAlign: "center", paddingHorizontal: 20, lineHeight: 17 },
  bossBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  studyScroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  studyBody: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    gap: 16,
  },
  cardStage: {
    width: "100%",
    height: FLASHCARD_WABI_STAGE_HEIGHT,
    position: "relative",
    alignItems: "center",
  },
  cardWrap: {
    width: "100%",
    alignItems: "center",
    height: FLASHCARD_WABI_STAGE_HEIGHT,
    paddingHorizontal: 8,
  },
  studyPositionLabel: {
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "600",
    marginTop: -4,
  },
  studyMeta: {
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  actions: { flexDirection: "row", gap: 10 },
  actionFlex: { flex: 1 },
  mcqHint: { textAlign: "center", lineHeight: 17 },
  doneBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
})
