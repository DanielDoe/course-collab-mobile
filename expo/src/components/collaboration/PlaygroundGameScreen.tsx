import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { hexToRgba } from "../../constants/app-themes"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { collaborationApi, type PlaygroundQuestion } from "../../lib/collaboration-api"
import { APP_BUTTON_RADIUS } from "../../constants/app-button"
import {
  formatPlaygroundDifficulty,
  letterForOptionIndex,
  playgroundQuestionTypeLabel,
} from "../../lib/playground-question-utils"
import {
  PLAYGROUND_LEAVE_SESSION_MESSAGE,
  PLAYGROUND_LEAVE_SESSION_TITLE,
} from "../../lib/playground-join-guard"
import {
  clearLastPlaygroundClassroomSession,
  completePlaygroundSessionLock,
  clearPlaygroundSessionLock,
  getPlaygroundSessionLock,
  recordPlaygroundAnswerLock,
  setLastPlaygroundClassroomSession,
  upsertPlaygroundSessionLock,
} from "../../lib/playground-session-lock"
import { QuestionContentWebView } from "../rewards/QuestionContent"
import { AppButton } from "../theme/AppButton"
import { CollabFlowHeader } from "./collab-nav"
import { useCollabTheme } from "./collab-module-ui"
import { PlaygroundPointsBurst } from "./PlaygroundPointsBurst"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type AnswerReveal = {
  isCorrect: boolean
  points: number
  correctLetter: string | null
}

function resolveCorrectLetter(
  question: PlaygroundQuestion,
  correctAnswer: unknown,
): string | null {
  if (typeof correctAnswer === "string" && /^[A-F]$/i.test(correctAnswer.trim())) {
    return correctAnswer.trim().toUpperCase()
  }
  const normalized = String(correctAnswer ?? "").trim().toLowerCase()
  if (!normalized) return null
  const matchIndex = question.options.findIndex(
    (option) => option.trim().toLowerCase() === normalized,
  )
  return matchIndex >= 0 ? letterForOptionIndex(matchIndex) : null
}

function firstUnansweredIndex(
  questions: PlaygroundQuestion[],
  answeredIds: number[],
): number {
  const idx = questions.findIndex((question) => !answeredIds.includes(question.id))
  return idx >= 0 ? idx : Math.max(0, questions.length - 1)
}

function PlaygroundProgressBar({
  index,
  total,
  accent,
  track,
}: {
  index: number
  total: number
  accent: string
  track: string
}) {
  const pct = total > 0 ? Math.min(100, Math.round(((index + 1) / total) * 100)) : 0
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: track }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: accent }]} />
      </View>
      <Text style={[styles.progressLabel, { color: accent }]}>
        {index + 1} / {total}
      </Text>
    </View>
  )
}

function PlaygroundOptionRow({
  letter,
  text,
  selected,
  disabled,
  reveal,
  correctLetter,
  onPress,
}: {
  letter: string
  text: string
  selected: boolean
  disabled: boolean
  reveal: AnswerReveal | null
  correctLetter: string | null
  onPress: () => void
}) {
  const theme = useCollabTheme()
  const SN = useThemedStudentNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const isCorrectOption = reveal && correctLetter === letter
  const isWrongSelection = reveal && selected && !reveal.isCorrect

  let borderColor = SN.separator
  let backgroundColor = SN.secondaryGrouped
  if (selected && !reveal) {
    borderColor = theme.primary
    backgroundColor = theme.soft
  }
  if (isCorrectOption) {
    borderColor = tokens.success
    backgroundColor = hexToRgba(tokens.success, tokens.isDark ? 0.18 : 0.1)
  } else if (isWrongSelection) {
    borderColor = tokens.danger
    backgroundColor = hexToRgba(tokens.danger, tokens.isDark ? 0.18 : 0.08)
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.option,
        { borderColor, backgroundColor },
        pressed && !disabled && styles.optionPressed,
        disabled && styles.optionDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View
        style={[
          styles.optionBadge,
          { backgroundColor: SN.groupedBackground },
          selected && !reveal && { backgroundColor: theme.primary },
          isCorrectOption && { backgroundColor: tokens.success },
          isWrongSelection && { backgroundColor: tokens.danger },
        ]}
      >
        <Text
          style={[
            type.caption,
            styles.optionLetter,
            { color: theme.primary },
            (selected || isCorrectOption || isWrongSelection) && styles.optionLetterActive,
          ]}
        >
          {letter}
        </Text>
      </View>
      <View style={styles.optionCopy}>
        <QuestionContentWebView text={text} embedded compact />
      </View>
      {isCorrectOption ? (
        <Ionicons name="checkmark-circle" size={20} color={tokens.success} />
      ) : isWrongSelection ? (
        <Ionicons name="close-circle" size={20} color={tokens.danger} />
      ) : selected ? (
        <Ionicons name="checkmark-circle-outline" size={20} color={theme.primary} />
      ) : null}
    </Pressable>
  )
}

export function PlaygroundGameScreen() {
  const { sessionId, resultId } = useLocalSearchParams<{ sessionId: string; resultId: string }>()
  const session = useStudentSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const theme = useCollabTheme()
  const SN = useThemedStudentNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const sid = Number(sessionId)
  const rid = Number(resultId)

  const [questions, setQuestions] = useState<PlaygroundQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(10)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [finished, setFinished] = useState(false)
  const [reveal, setReveal] = useState<AnswerReveal | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(Date.now())
  const selectedRef = useRef<string | null>(null)
  const answeredIdsRef = useRef<number[]>([])

  const current = questions[index]
  const difficultyLabel = formatPlaygroundDifficulty(current?.difficulty)

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  const promptLeaveSession = useCallback(() => {
    AppAlert.alert(PLAYGROUND_LEAVE_SESSION_TITLE, PLAYGROUND_LEAVE_SESSION_MESSAGE, [
      { text: "Keep playing", style: "cancel" },
      {
        text: "Leave session",
        style: "destructive",
        onPress: () => {
          if (timerRef.current) clearInterval(timerRef.current)
          void clearPlaygroundSessionLock().then(() => {
            router.replace("/module/playground" as never)
          })
        },
      },
    ])
  }, [router])

  const blockExit = useCallback(() => {
    if (finished) return
    promptLeaveSession()
  }, [finished, promptLeaveSession])

  useEffect(() => {
    if (finished) return
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      blockExit()
      return true
    })
    return () => sub.remove()
  }, [blockExit, finished])

  const restoreSessionLock = useCallback(async (loadedQuestions: PlaygroundQuestion[]) => {
    if (!Number.isFinite(sid) || !Number.isFinite(rid) || loadedQuestions.length === 0) {
      setSessionReady(true)
      return
    }

    const existing = await getPlaygroundSessionLock()
    if (
      existing &&
      !existing.completed &&
      existing.sessionId === sid &&
      existing.resultId === rid
    ) {
      answeredIdsRef.current = existing.answeredQuestionIds
      const resumeIndex = firstUnansweredIndex(loadedQuestions, existing.answeredQuestionIds)
      setIndex(resumeIndex)
      setSessionReady(true)
      return
    }

    if (existing && !existing.completed && (existing.sessionId !== sid || existing.resultId !== rid)) {
      AppAlert.alert(
        "Different session active",
        "Finish your current playground session before starting another.",
        [{ text: "OK", onPress: () => router.replace("/module/playground" as never) }],
      )
      setSessionReady(true)
      return
    }

    await upsertPlaygroundSessionLock({
      sessionId: sid,
      resultId: rid,
      mode: "CLASSROOM",
      startedAt: Date.now(),
      answeredQuestionIds: [],
      lockedIndex: 0,
    })
    setSessionReady(true)
  }, [rid, router, sid])

  const redirectAttemptRevoked = useCallback(async () => {
    await clearPlaygroundSessionLock()
    await clearLastPlaygroundClassroomSession(sid)
    AppAlert.alert(
      "Session reset",
      "Your instructor reset attempts for this session. Rejoin from Playground to start again.",
      [{ text: "OK", onPress: () => router.replace("/module/playground" as never) }],
      { tone: "warning", feature: "playground", logError: false },
    )
  }, [router, sid])

  useEffect(() => {
    if (Number.isFinite(sid)) {
      void setLastPlaygroundClassroomSession(sid)
    }
  }, [sid])

  const syncResultFromServer = useCallback(async () => {
    if (!session || !Number.isFinite(sid) || !Number.isFinite(rid)) return true
    try {
      const lobby = await collaborationApi.getPlaygroundLobby(session, sid, rid)
      if (lobby.attemptRevoked || lobby.sessionEnded) {
        await redirectAttemptRevoked()
        return false
      }
      if (lobby.myResult) {
        if (typeof lobby.myResult.score === "number") setScore(lobby.myResult.score)
        if (typeof lobby.myResult.correctAnswers === "number") {
          setCorrectCount(lobby.myResult.correctAnswers)
        }
      }
      return true
    } catch {
      return true
    }
  }, [redirectAttemptRevoked, rid, session, sid])

  const loadQuestions = useCallback(async () => {
    if (!session || !Number.isFinite(sid)) return
    try {
      const res = await collaborationApi.getPlaygroundQuestions(session, sid)
      const loaded = res.questions ?? []
      setQuestions(loaded)
      await restoreSessionLock(loaded)
      await syncResultFromServer()
    } catch (err) {
      if (err instanceof ApiError && /not found|invalid|reset|ended/i.test(err.message)) {
        await clearPlaygroundSessionLock()
        router.replace("/module/playground" as never)
        return
      }
      AppAlert.alert("Error", err instanceof ApiError ? err.message : "Failed to load questions.")
      setSessionReady(true)
    } finally {
      setLoading(false)
    }
  }, [session, sid, restoreSessionLock, syncResultFromServer, router])

  useEffect(() => {
    void loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    setShowHint(false)
    setReveal(null)
    setSelected(null)
  }, [current?.id])

  const finishGame = useCallback(async () => {
    if (!session || !Number.isFinite(rid)) return
    try {
      const res = await collaborationApi.completePlayground(session, rid)
      if (typeof res.score === "number") setScore(res.score)
      if (typeof res.correctAnswers === "number") setCorrectCount(res.correctAnswers)
    } catch {
      // non-critical
    }
    await completePlaygroundSessionLock()
    setFinished(true)
  }, [session, rid])

  const advanceQuestion = useCallback(async () => {
    if (index >= questions.length - 1) {
      await finishGame()
      return
    }
    const nextIndex = index + 1
    setIndex(nextIndex)
    setSelected(null)
    setReveal(null)
    setSubmitting(false)
    startTimeRef.current = Date.now()
    setTimeLeft(10)
    const lock = await getPlaygroundSessionLock()
    if (lock) {
      await upsertPlaygroundSessionLock({ ...lock, lockedIndex: nextIndex })
    }
  }, [finishGame, index, questions.length])

  const submitAnswer = useCallback(
    async (answer: string | null) => {
      if (!session || !current || submitting || reveal) return

      if (answeredIdsRef.current.includes(current.id)) {
        await advanceQuestion()
        return
      }

      setSubmitting(true)
      if (timerRef.current) clearInterval(timerRef.current)

      const elapsed = Date.now() - startTimeRef.current
      let nextReveal: AnswerReveal = {
        isCorrect: false,
        points: 0,
        correctLetter: null,
      }

      try {
        const res = await collaborationApi.submitPlaygroundAnswer(session, {
          resultId: rid,
          questionId: current.id,
          selectedAnswer: answer ?? "",
          responseTimeMs: elapsed,
        })
        if (typeof res.score === "number") setScore(res.score)
        else if (res.points) setScore((value) => value + (res.points ?? 0))
        if (typeof res.correctAnswers === "number") setCorrectCount(res.correctAnswers)
        else if (res.isCorrect) setCorrectCount((value) => value + 1)

        const correctLetter = resolveCorrectLetter(current, res.correctAnswer)
        nextReveal = {
          isCorrect: Boolean(res.isCorrect),
          points: res.points ?? 0,
          correctLetter,
        }
        setReveal(nextReveal)
        answeredIdsRef.current = [...answeredIdsRef.current, current.id]
        await recordPlaygroundAnswerLock(current.id, index + 1)
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404 || /attempt not found|rejoin the session/i.test(err.message)) {
            await redirectAttemptRevoked()
            return
          }
          if (err.message.includes("ended")) {
            await completePlaygroundSessionLock()
            router.replace("/module/playground" as never)
            return
          }
          if (/already answered|duplicate/i.test(err.message)) {
            answeredIdsRef.current = [...answeredIdsRef.current, current.id]
            await recordPlaygroundAnswerLock(current.id, index + 1)
            await advanceQuestion()
            return
          }
        }
        setSubmitting(false)
        return
      }

      setTimeout(() => {
        void advanceQuestion()
      }, nextReveal.isCorrect ? 1100 : 1400)
    },
    [session, current, submitting, reveal, rid, advanceQuestion, router, index, redirectAttemptRevoked],
  )

  useEffect(() => {
    if (!current || finished || loading || reveal || !sessionReady) return

    startTimeRef.current = Date.now()
    setTimeLeft(10)
    timerRef.current = setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          void submitAnswer(selectedRef.current)
          return 0
        }
        return value - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [current?.id, finished, loading, reveal, submitAnswer, sessionReady])

  const headerRight = useMemo(
    () => (
      <View style={[styles.scoreChip, { backgroundColor: theme.soft, borderColor: tokens.border }]}>
        <Ionicons name="flash-outline" size={14} color={theme.primary} />
        <Text style={[type.caption, styles.scoreChipText, { color: theme.primaryDark }]}>{score}</Text>
      </View>
    ),
    [score, theme, type],
  )

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: SN.groupedBackground }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[type.caption, { color: SN.secondaryLabel }]}>Loading questions…</Text>
      </View>
    )
  }

  if (finished) {
    return (
      <View style={[styles.flex, { backgroundColor: SN.groupedBackground }]}>
        <CollabFlowHeader title="Game complete" fallbackHref="/module/playground" />
        <View style={[styles.completeBody, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.completeHeroWrap}>
            <View style={[styles.completeHero, { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator }]}>
              <View style={[styles.completeIconWrap, { backgroundColor: theme.soft }]}>
                <Ionicons name="trophy-outline" size={28} color={theme.primary} />
              </View>
              <Text style={[type.sheetTitle, styles.finalScore, { color: theme.primaryDark }]}>{score}</Text>
              <Text style={[type.body, { color: SN.secondaryLabel }]}>Total points</Text>
              <Text style={[type.caption, { color: SN.tertiaryLabel }]}>
                {correctCount} correct of {questions.length} questions
              </Text>
            </View>
          </View>
          <View style={styles.completeActions}>
            <AppButton
              label="Back to playground"
              onPress={() => router.replace("/module/playground" as never)}
              variant="primary"
              fullWidth
            />
            <AppButton
              label="View leaderboard"
              onPress={() =>
                router.push(`/collaboration/playground/leaderboard?sessionId=${sid}` as never)
              }
              variant="ghost"
              fullWidth
            />
          </View>
        </View>
      </View>
    )
  }

  if (!current) {
    return (
      <View style={[styles.center, { backgroundColor: SN.groupedBackground }]}>
        <Ionicons name="help-circle-outline" size={28} color={SN.secondaryLabel} />
        <Text style={[type.body, { color: SN.secondaryLabel }]}>No questions available.</Text>
      </View>
    )
  }

  return (
    <View style={[styles.flex, { backgroundColor: SN.groupedBackground }]}>
      <CollabFlowHeader
        title={`Question ${index + 1}`}
        subtitle={current.topic ?? playgroundQuestionTypeLabel(current.questionType)}
        fallbackHref="/module/playground"
        rightSlot={headerRight}
        backDisabled={!finished}
        onBlockedBack={blockExit}
      />

      <View style={styles.gameBody}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
        <PlaygroundProgressBar
          index={index}
          total={questions.length}
          accent={theme.primary}
          track={SN.fill}
        />

        <View style={styles.metaRow}>
          <View style={[styles.metaPill, { backgroundColor: SN.fill }]}>
            <Text style={[type.caption, styles.metaPillText, { color: SN.secondaryLabel }]}>
              {playgroundQuestionTypeLabel(current.questionType)}
            </Text>
          </View>
          {difficultyLabel ? (
            <View style={[styles.metaPill, { backgroundColor: hexToRgba(theme.primary, 0.12) }]}>
              <Text style={[type.caption, styles.metaPillText, { color: theme.primaryDark }]}>
                {difficultyLabel}
              </Text>
            </View>
          ) : null}
          <View style={[styles.timerChip, timeLeft <= 3 && styles.timerChipUrgent]}>
            <Ionicons
              name="timer-outline"
              size={16}
              color={timeLeft <= 3 ? tokens.danger : theme.primary}
            />
            <Text
              style={[
                type.bodyEmphasis,
                styles.timerText,
                { color: timeLeft <= 3 ? tokens.danger : theme.primaryDark },
              ]}
            >
              {timeLeft}s
            </Text>
          </View>
        </View>

        {reveal ? (
          <View
            style={[
              styles.feedbackBanner,
              {
                backgroundColor: reveal.isCorrect
                  ? hexToRgba(tokens.success, tokens.isDark ? 0.18 : 0.1)
                  : hexToRgba(tokens.danger, tokens.isDark ? 0.16 : 0.08),
                borderColor: reveal.isCorrect ? tokens.success : tokens.danger,
              },
            ]}
          >
            <Ionicons
              name={reveal.isCorrect ? "checkmark-circle" : "close-circle"}
              size={18}
              color={reveal.isCorrect ? tokens.success : tokens.danger}
            />
            <Text
              style={[
                type.bodyEmphasis,
                { color: reveal.isCorrect ? tokens.success : tokens.danger },
              ]}
            >
              {reveal.isCorrect ? `+${reveal.points} pts` : "Incorrect"}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.questionCard,
            { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator },
          ]}
        >
          <QuestionContentWebView text={current.questionText} embedded />
          {current.hint ? (
            <Pressable style={styles.hintToggle} onPress={() => setShowHint((value) => !value)} hitSlop={8}>
              <Ionicons
                name="bulb-outline"
                size={18}
                color={showHint ? tokens.warning : SN.secondaryLabel}
              />
              <Text style={[type.caption, { color: showHint ? tokens.warning : SN.secondaryLabel }]}>
                {showHint ? "Hide hint" : "Show hint"}
              </Text>
            </Pressable>
          ) : null}
          {showHint && current.hint ? (
            <View style={[styles.hintBox, { backgroundColor: SN.groupedBackground, borderColor: SN.separator }]}>
              <QuestionContentWebView text={current.hint} embedded compact />
            </View>
          ) : null}
        </View>

        {current.options.map((opt, optionIndex) => {
          const letter = letterForOptionIndex(optionIndex)
          return (
            <PlaygroundOptionRow
              key={`${current.id}-${letter}`}
              letter={letter}
              text={opt}
              selected={selected === letter}
              disabled={Boolean(reveal) || submitting}
              reveal={reveal}
              correctLetter={reveal?.correctLetter ?? null}
              onPress={() => setSelected(letter)}
            />
          )
        })}

        <Pressable
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.primary },
            (!selected || submitting || reveal) && styles.primaryBtnDisabled,
          ]}
          onPress={() => void submitAnswer(selected)}
          disabled={!selected || submitting || Boolean(reveal)}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryBtnText}>Submit answer</Text>
          )}
        </Pressable>

        {!finished ? (
          <Pressable style={styles.leaveBtn} onPress={promptLeaveSession}>
            <Text style={[styles.leaveBtnText, { color: SN.secondaryLabel }]}>Leave session</Text>
          </Pressable>
        ) : null}
        </ScrollView>

        <PlaygroundPointsBurst
          points={reveal?.points ?? 0}
          isCorrect={Boolean(reveal?.isCorrect)}
          visible={Boolean(reveal)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gameBody: { flex: 1, position: "relative" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  content: { padding: 16, gap: 12 },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  progressLabel: { fontWeight: "700", minWidth: 48, textAlign: "right" },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaPillText: { fontWeight: "700" },
  timerChip: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timerChipUrgent: {},
  timerText: { fontVariant: ["tabular-nums"] },
  scoreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scoreChipText: { fontWeight: "800", fontVariant: ["tabular-nums"] },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  questionCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  hintToggle: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  hintBox: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  optionPressed: { opacity: 0.92 },
  optionDisabled: { opacity: 0.88 },
  optionBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionLetter: { fontWeight: "800" },
  optionLetterActive: { color: "#ffffff" },
  optionCopy: { flex: 1, minWidth: 0 },
  primaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: APP_BUTTON_RADIUS,
    marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  completeBody: { flex: 1, paddingHorizontal: 16 },
  completeHeroWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 12,
  },
  completeActions: {
    width: "100%",
    gap: 4,
  },
  completeHero: {
    width: "100%",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    gap: 6,
  },
  completeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  finalScore: { fontWeight: "700" },
  leaveBtn: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 4,
  },
  leaveBtnText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
})
