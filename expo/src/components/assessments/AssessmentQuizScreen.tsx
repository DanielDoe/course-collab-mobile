import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native"
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { hexToRgba } from "../../constants/app-themes"
import { SYSTEM } from "../../constants/faculty-native-theme"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useThemedStudentNative, semanticSoft } from "../../lib/themed-module-theme"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"
import { parseQuestionMedia } from "../../lib/classroom-submission"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { QuestionPrepareGate } from "../questions/QuestionPrepareGate"
import { useAssessmentFocusGuard } from "../../hooks/useAssessmentFocusGuard"
import { useQuestionPaintReady } from "../../hooks/useQuestionPaintReady"
import { useKeyboardHeight } from "../ui/KeyboardAwareForm"
import { countQuestionPaintTargets } from "../../lib/question-paint-ready"
import { extractAssessmentQuizQuestionTexts } from "../../lib/question-prepare"
import {
  buildPartialCreditFallbackReview,
  isEvalPartialCredit,
  practiceAnswerReviewOptionState,
  practiceHubFeedbackSummary,
  resolveObjectiveAnswerReview,
} from "../../lib/lecture-sample-practice-grading"
import type { PracticeAnswerReview } from "../../lib/lecture-types"
import { assessmentQuizApi } from "../../lib/assessment-quiz/assessment-quiz-api"
import {
  buildAnswerForSubmit,
  codeWriteSubmissionReady,
  coerceSavedAnswerRaw,
  getQuestionOptions,
  isAssessmentMultiSelectQuestion,
  isCircuitSubmissionQuestion,
  isCodeWritePlotQuestion,
  isNativeCodeQuestion,
  isUnsupportedQuestion,
  restoreCodeWriteFromSaved,
  restoreSelectionFromSavedAnswer,
  resolveAssessmentQuestionMcqEarnedFraction,
  unsupportedQuestionLabel,
} from "../../lib/assessment-quiz/assessment-answer-mapper"
import {
  circuitSubmissionHasRequiredUpload,
  compactCircuitSubmissionForAutoSave,
  emptyCircuitSubmissionAnswer,
  parseCircuitSubmissionAnswer,
  parseCircuitSubmissionConfig,
} from "../../lib/circuit-submission-utils"
import {
  CircuitSubmissionPanel,
  prepareCircuitAnswerForSubmit,
} from "./CircuitSubmissionPanel"
import { CodeWriteAnswerPanel } from "./CodeWriteAnswerPanel"
import { normalizeAssessmentType } from "../../lib/assessment-quiz/normalize-assessment-type"
import type {
  AssessmentQuestion,
  AssessmentQuizSession,
  SavedAnswer,
} from "../../lib/assessment-quiz/assessment-quiz-types"
import { formatAssessmentType } from "./assessment-config"
import { exitAssessmentQuiz, openAssessmentResults } from "./assessment-navigation"
import type { AssessmentTakeAction } from "../../constants/module-web-paths"
import { WaterBreakDurationDialog, WaterBreakOverlay } from "../flashcards/FlashcardWaterBreak"
import { triggerMotionHaptic } from "../../lib/motion/haptics"
import { quizCodeEditorHeightForKeyboard, quizKeyboardScrollDelta } from "../../lib/quiz-keyboard-scroll"
import { useModuleContentStyle } from "../../lib/responsive-layout"
import { useStudentSubmissionLayout } from "../../lib/circuit-submission-layout"
import { useAssessmentQuizTimer } from "../../hooks/useAssessmentQuizTimer"
import {
  assessmentPlatformBlockedMessage,
  isAssessmentPlatformError,
} from "../../lib/assessment-platform-access"
import {
  buildKeystrokePayload,
  looksLikePastedAnswer,
  parseAssessmentAntiCheatConfig,
  recordTextChange,
  type AssessmentKeystrokeEvent,
} from "../../lib/assessment-quiz/assessment-anti-cheat"
import { buildAssessmentAnswerCelebration } from "../../lib/assessment-quiz/assessment-answer-celebration"
import { formatEvaluateAnswerFeedback } from "../../lib/assessment-quiz/assessment-feedback"
import { isProvisionalAiEvaluation } from "../../lib/assessment-quiz/assessment-ai-eval"
import {
  FlashcardKnownCelebration,
  type FlashcardCelebrationPayload,
} from "../flashcards/FlashcardKnownCelebration"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type Props = {
  quizId: number
  assessmentType: string
  takeAction: AssessmentTakeAction
}

type QuizActionTone = "default" | "teal" | "accent" | "danger"

function QuizActionButton({
  icon,
  label,
  onPress,
  active,
  tone = "default",
  disabled,
  accentColor,
  dangerColor,
  mutedColor,
  textColor,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  active?: boolean
  tone?: QuizActionTone
  disabled?: boolean
  accentColor: string
  dangerColor: string
  mutedColor: string
  textColor: string
}) {
  const toneColor =
    tone === "teal" ? "#2dd4bf" : tone === "accent" ? accentColor : tone === "danger" ? dangerColor : mutedColor
  const iconColor = active ? accentColor : toneColor
  const labelColor = active ? accentColor : tone === "default" ? textColor : toneColor

  return (
    <Pressable
      style={({ pressed }) => [
        styles.quizActionBtn,
        active && { backgroundColor: hexToRgba(accentColor, 0.12) },
        pressed && !disabled && { opacity: 0.78 },
        disabled && styles.quizActionBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
    >
      <Ionicons name={icon} size={20} color={disabled ? mutedColor : iconColor} />
      <Text style={[styles.quizActionLabel, { color: disabled ? mutedColor : labelColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

export function AssessmentQuizScreen({ quizId, assessmentType, takeAction }: Props) {
  const session = useStudentSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const moduleContent = useModuleContentStyle()
  const submissionLayout = useStudentSubmissionLayout()

  const apiType = normalizeAssessmentType(assessmentType)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [quizSession, setQuizSession] = useState<AssessmentQuizSession | null>(null)
  const [savedAnswersByQuestion, setSavedAnswersByQuestion] = useState<Map<number, SavedAnswer>>(new Map())

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showQuestionNav, setShowQuestionNav] = useState(false)
  const [showContinueLaterModal, setShowContinueLaterModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [waterBreakPickerOpen, setWaterBreakPickerOpen] = useState(false)
  const [waterBreakActive, setWaterBreakActive] = useState(false)
  const [waterBreakSeconds, setWaterBreakSeconds] = useState(0)

  const [selectedLetter, setSelectedLetter] = useState("")
  const [selectedLetters, setSelectedLetters] = useState<string[]>([])
  const [textAnswer, setTextAnswer] = useState("")
  const [plotImage, setPlotImage] = useState("")
  const [circuitAnswerJson, setCircuitAnswerJson] = useState(() => emptyCircuitSubmissionAnswer())
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [celebration, setCelebration] = useState<FlashcardCelebrationPayload | null>(null)
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [submittingFinal, setSubmittingFinal] = useState(false)
  const [savingLater, setSavingLater] = useState(false)
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set())
  const [answerReviews, setAnswerReviews] = useState<Record<number, PracticeAnswerReview>>({})
  const [initialQuestionTimeRemaining, setInitialQuestionTimeRemaining] = useState<
    Record<string, number> | undefined
  >()
  const [initialSectionTimeRemaining, setInitialSectionTimeRemaining] = useState<
    Record<string, number> | undefined
  >()
  const questionStartRef = useRef<Record<number, number>>({})
  const submitAnswerRef = useRef<(opts?: { timerExpiry?: boolean }) => Promise<void>>(async () => {})
  const bootstrapRunRef = useRef(0)
  const answeredIdsRef = useRef<Set<number>>(new Set())
  const afterCelebrationRef = useRef<(() => void) | null>(null)
  const keystrokeEventsRef = useRef<AssessmentKeystrokeEvent[]>([])
  const finalizeRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    answeredIdsRef.current = answeredIds
  }, [answeredIds])

  const questions = quizSession?.questions ?? []
  const safeQuestionIndex =
    questions.length > 0
      ? Math.min(Math.max(currentIndex, 0), questions.length - 1)
      : 0
  const currentQuestion = questions[safeQuestionIndex]
  const [answerFieldFocused, setAnswerFieldFocused] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const answerFieldRef = useRef<View>(null)
  const scrollYRef = useRef(0)
  const keyboardHeight = useKeyboardHeight()
  const keyboardOpen = keyboardHeight > 0
  const windowHeight = useWindowDimensions().height

  const bringAnswerFieldIntoView = useCallback(() => {
    const field = answerFieldRef.current
    const scroller = scrollRef.current
    if (!field || !scroller || keyboardHeight <= 0) return
    scroller.measureInWindow((_sx, sy, _sw, sh) => {
      field.measureInWindow((_fx, fy, _fw, fh) => {
        const visibleTop = sy + 10
        const visibleBottom = Math.min(sy + sh, windowHeight - keyboardHeight) - 12
        const delta = quizKeyboardScrollDelta({
          fieldTop: fy,
          fieldHeight: fh,
          visibleTop,
          visibleBottom,
        })
        if (delta === 0) return
        scroller.scrollTo({ y: Math.max(0, scrollYRef.current + delta), animated: true })
      })
    })
  }, [keyboardHeight, windowHeight])

  const paintOptionTexts = useMemo(() => {
    if (!currentQuestion) return []
    if (
      isUnsupportedQuestion(currentQuestion) ||
      isCircuitSubmissionQuestion(currentQuestion) ||
      isNativeCodeQuestion(currentQuestion)
    ) {
      return []
    }
    const qType = currentQuestion.question_type.toLowerCase()
    if (
      qType === "fill_blank" ||
      qType === "fill_in_blank" ||
      qType === "short_answer" ||
      qType === "code_output" ||
      qType === "trace_output"
    ) {
      return []
    }
    return getQuestionOptions(currentQuestion).map((option) => option.text)
  }, [currentQuestion])

  const { ready: questionPaintReady, markReady: markQuestionPaintReady } = useQuestionPaintReady(
    currentQuestion?.id,
    countQuestionPaintTargets({
      promptText: currentQuestion?.question_text,
      optionTexts: paintOptionTexts,
    }),
  )

  useEffect(() => {
    if (!questionPaintReady || !currentQuestion) return
    triggerMotionHaptic("light")
  }, [questionPaintReady, currentQuestion?.id])

  useEffect(() => {
    if (questions.length === 0) return
    if (currentIndex !== safeQuestionIndex) {
      setCurrentIndex(safeQuestionIndex)
    }
  }, [questions.length, currentIndex, safeQuestionIndex])

  useEffect(() => {
    if (!keyboardOpen) {
      setAnswerFieldFocused(false)
      return
    }
    if (showQuestionNav) setShowQuestionNav(false)
    if (!answerFieldFocused) return
    const timer = setTimeout(() => bringAnswerFieldIntoView(), 60)
    return () => clearTimeout(timer)
  }, [answerFieldFocused, bringAnswerFieldIntoView, keyboardOpen, showQuestionNav])

  const bootstrap = useCallback(async () => {
    if (!session || !Number.isFinite(quizId)) {
      setLoading(false)
      if (!Number.isFinite(quizId)) {
        setLoadError("Invalid assessment.")
      }
      return
    }

    const runId = ++bootstrapRunRef.current
    setLoading(true)
    setLoadError(null)

    try {
      const start = await assessmentQuizApi.startQuiz(session, {
        quizId,
        forceRestart: takeAction === "retake",
      })

      if (start.inWaitingList) {
        if (runId !== bootstrapRunRef.current) return
        setLoadError(
          start.message ??
            "You are in the waiting room. A spot will open automatically — try again shortly.",
        )
        return
      }

      if (!start.attemptId) {
        throw new ApiError(start.error ?? "Could not start assessment.", 400, start)
      }

      const take = await assessmentQuizApi.take(session, apiType, quizId, {
        attemptId: start.attemptId,
      })

      if (runId !== bootstrapRunRef.current) return

      if (!take.questions?.length) {
        throw new ApiError("This assessment has no questions.", 400)
      }

      const sessionData: AssessmentQuizSession = {
        attemptId: take.attemptId ?? start.attemptId,
        quizId,
        assessmentType,
        apiType,
        quiz: take.quiz,
        questions: take.questions,
        hasSaveAndFinishLaterAccess: !!take.hasSaveAndFinishLaterAccess,
      }
      setQuizSession(sessionData)

      let resumeIndex = 0
      const savedMap = new Map<number, SavedAnswer>()

      if (takeAction === "continue" || start.reused) {
        try {
          const [state, savedAnswersRaw] = await Promise.all([
            assessmentQuizApi.getAttemptState(session, quizId, { attemptId: sessionData.attemptId }),
            assessmentQuizApi.getSavedAnswers(session, sessionData.attemptId),
          ])
          const savedAnswers = Array.isArray(savedAnswersRaw) ? savedAnswersRaw : []

          for (const row of savedAnswers) {
            savedMap.set(row.questionId, row)
          }
          setSavedAnswersByQuestion(savedMap)

          if (typeof state.currentQuestionIndex === "number" && state.currentQuestionIndex >= 0) {
            resumeIndex = Math.min(state.currentQuestionIndex, take.questions.length - 1)
          }

          if (state.questionTimeRemaining) {
            setInitialQuestionTimeRemaining(state.questionTimeRemaining)
          }
          if (state.sectionTimeRemaining) {
            setInitialSectionTimeRemaining(state.sectionTimeRemaining)
          }

          // answeredQuestionIds includes autosave drafts. Only finalized / locked
          // rows should block editing — same rule as web quiz-taker.
          const submitted = [
            ...(state.submittedQuestionIds ?? []),
            ...(state.lockedQuestionIds ?? []),
          ]
          const submittedSet = new Set<number>()
          for (const qid of submitted) submittedSet.add(Number(qid))
          answeredIdsRef.current = submittedSet
          setAnsweredIds(submittedSet)
          if (submittedSet.has(take.questions[resumeIndex]?.id)) {
            const nextOpen = take.questions.findIndex((q) => !submittedSet.has(q.id))
            if (nextOpen >= 0) resumeIndex = nextOpen
          }
          setCurrentIndex(resumeIndex)

          const restoredReviews: Record<number, PracticeAnswerReview> = {}
          for (const row of savedAnswers) {
            if (!submittedSet.has(row.questionId)) continue
            const question = take.questions.find((q) => q.id === row.questionId)
            if (!question || !row.answer) continue
            const sel = restoreSelectionFromSavedAnswer(
              question,
              coerceSavedAnswerRaw(row) ?? row.answer ?? "",
            )
            const maxPoints = question.max_points ?? question.points ?? 1
            const evalMeta = {
              isCorrect: row.isCorrect,
              pointsEarned: row.pointsEarned,
              maxPoints,
              score:
                row.pointsEarned != null && maxPoints > 0
                  ? (row.pointsEarned / maxPoints) * 100
                  : undefined,
            }
            let review = resolveObjectiveAnswerReview({
              question,
              selectedLetters: sel.letters,
              selectedLetter: sel.letter,
              serverReview: null,
              evalResult: evalMeta,
            })
            if (!review) {
              review = buildPartialCreditFallbackReview({
                question,
                selectedLetters: sel.letters,
                evalResult: evalMeta,
              })
            }
            if (review) restoredReviews[row.questionId] = review
          }
          setAnswerReviews(restoredReviews)
          applyQuestionUi(
            take.questions[resumeIndex],
            savedMap.get(take.questions[resumeIndex]?.id),
            restoredReviews,
            submittedSet,
          )
        } catch {
          /* resume metadata optional */
        }
      }

      if (take.questions[resumeIndex]) {
        questionStartRef.current[take.questions[resumeIndex].id] = Date.now()
      }
    } catch (err) {
      if (runId !== bootstrapRunRef.current) return
      if (isAssessmentPlatformError(err)) {
        setLoadError(assessmentPlatformBlockedMessage(assessmentType, "mobile"))
      } else {
        setLoadError(err instanceof ApiError ? err.message : "Could not load assessment.")
      }
    } finally {
      if (runId === bootstrapRunRef.current) {
        setLoading(false)
      }
    }
  }, [session, quizId, apiType, assessmentType, takeAction])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (currentQuestion && !questionStartRef.current[currentQuestion.id]) {
      questionStartRef.current[currentQuestion.id] = Date.now()
    }
  }, [currentQuestion])

  const antiCheat = useMemo(
    () => parseAssessmentAntiCheatConfig(quizSession?.quiz ?? null),
    [quizSession?.quiz],
  )

  // Anti-cheat: task-switching out of the app mid-attempt is logged against the attempt.
  useAssessmentFocusGuard({
    session,
    attemptId: quizSession?.attemptId ?? null,
    enabled: Boolean(quizSession) && !submittingFinal && !waterBreakActive,
    antiCheat,
    onMaxViolations: () => void finalizeRef.current(),
  })

  const handleTimerExpire = useCallback(() => {
    if (showFeedback || celebration || submittingAnswer) return
    void submitAnswerRef.current({ timerExpiry: true })
  }, [showFeedback, celebration, submittingAnswer])

  const quizTimer = useAssessmentQuizTimer({
    assessmentType,
    quiz: quizSession?.quiz ?? null,
    questions,
    currentIndex,
    waterBreakActive,
    enabled: Boolean(quizSession) && !loading,
    initialQuestionTimeRemaining,
    initialSectionTimeRemaining,
    onQuestionTimerExpire: handleTimerExpire,
  })

  const persistTimerProgress = useCallback(async () => {
    if (!session || !quizSession) return
    const { questionTimeRemaining } = quizTimer.getPersistedTimerState()
    if (!Object.keys(questionTimeRemaining).length) return
    try {
      await assessmentQuizApi.saveProgress(session, {
        attemptId: quizSession.attemptId,
        currentQuestionIndex: currentIndex,
        questionTimeRemaining,
      })
    } catch {
      /* non-blocking */
    }
  }, [session, quizSession, quizTimer, currentIndex])

  const applyQuestionUi = (
    question: AssessmentQuestion | undefined,
    saved: SavedAnswer | undefined,
    reviews: Record<number, PracticeAnswerReview>,
    answered: Set<number>,
  ) => {
    resetSelection(question)
    if (!question) return

    if (saved?.answer || saved?.answerData) {
      if (isCircuitSubmissionQuestion(question)) {
        setCircuitAnswerJson(coerceSavedAnswerRaw(saved) ?? saved.answer ?? "")
      } else if (isNativeCodeQuestion(question)) {
        const parsed = restoreCodeWriteFromSaved(saved)
        setTextAnswer(parsed.code)
        setPlotImage(parsed.plotImage)
      } else if (!isUnsupportedQuestion(question)) {
        const sel = restoreSelectionFromSavedAnswer(question, coerceSavedAnswerRaw(saved))
        setSelectedLetter(sel.letter)
        setSelectedLetters(sel.letters)
        setTextAnswer(sel.text)
      }
    }

    if (answered.has(question.id)) {
      const review = reviews[question.id]
      const maxPoints = question.max_points ?? question.points ?? 1
      const evalMeta = {
        isCorrect: saved?.isCorrect,
        pointsEarned: saved?.pointsEarned,
        maxPoints,
        score:
          saved?.pointsEarned != null && maxPoints > 0
            ? (saved.pointsEarned / maxPoints) * 100
            : review?.score,
      }
      const partial = isEvalPartialCredit(evalMeta, review)
      setShowFeedback(true)
      setIsCorrect(review?.isCorrect ?? saved?.isCorrect ?? false)
      setFeedbackText(
        formatEvaluateAnswerFeedback(
          {
            feedback: undefined,
            aiFeedback: saved?.aiFeedback,
            isCorrect: saved?.isCorrect,
            requiresManualReview: false,
          },
          practiceHubFeedbackSummary(
            review,
            partial ? "Partial credit." : saved?.isCorrect ? "Correct!" : "Answer recorded.",
            evalMeta,
          ),
        ),
      )
    }
  }

  const applySavedSelection = (question: AssessmentQuestion | undefined, saved?: SavedAnswer) => {
    applyQuestionUi(question, saved, answerReviews, answeredIds)
  }

  const nativeQuestions = useMemo(
    () => questions.filter((q) => !isUnsupportedQuestion(q)),
    [questions],
  )

  const unsupportedUnansweredCount = useMemo(
    () => questions.filter((q) => isUnsupportedQuestion(q) && !answeredIds.has(q.id)).length,
    [questions, answeredIds],
  )

  const unansweredCount = questions.length - answeredIds.size

  const progressPct = useMemo(() => {
    if (!questions.length) return 0
    return Math.round((answeredIds.size / questions.length) * 100)
  }, [answeredIds.size, questions.length])

  const allNativeAnswered =
    nativeQuestions.length > 0 && nativeQuestions.every((q) => answeredIds.has(q.id))

  const allAnswered = answeredIds.size >= questions.length && questions.length > 0

  const canShowSubmit =
    allNativeAnswered || (allAnswered && unsupportedUnansweredCount === 0)

  const resetSelection = useCallback((question: AssessmentQuestion | undefined) => {
    setSelectedLetter("")
    setSelectedLetters([])
    setTextAnswer("")
    setPlotImage("")
    setCircuitAnswerJson(emptyCircuitSubmissionAnswer())
    setShowFeedback(false)
    keystrokeEventsRef.current = []
    if (question) {
      questionStartRef.current[question.id] = Date.now()
    }
  }, [])

  const leaveQuiz = useCallback(() => {
    exitAssessmentQuiz(router, { quizId, assessmentType })
  }, [router, quizId, assessmentType])

  const goToIndex = async (index: number, opts?: { skipDraftSave?: boolean }) => {
    if (!session || !quizSession || index < 0 || index >= questions.length) return
    // Review is always allowed. Expired / submitted questions stay locked for answering.
    if (!opts?.skipDraftSave) {
      try {
        await persistDraftAnswer()
      } catch {
        /* draft save is best-effort */
      }
    }
    setCurrentIndex(index)
    applySavedSelection(questions[index], savedAnswersByQuestion.get(questions[index]?.id))
    setShowQuestionNav(false)

    try {
      const { questionTimeRemaining } = quizTimer.getPersistedTimerState()
      await assessmentQuizApi.saveProgress(session, {
        attemptId: quizSession.attemptId,
        currentQuestionIndex: index,
        ...(Object.keys(questionTimeRemaining).length ? { questionTimeRemaining } : {}),
      })
    } catch {
      /* non-blocking */
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) void goToIndex(currentIndex - 1)
  }

  const goToNext = () => {
    if (currentIndex < questions.length - 1) void goToIndex(currentIndex + 1)
  }

  const submitAnswer = async (opts?: { timerExpiry?: boolean }) => {
    if (!session || !quizSession || !currentQuestion || submittingAnswer) return
    if (answeredIds.has(currentQuestion.id)) return
    if (isUnsupportedQuestion(currentQuestion)) return

    const timerExpiry = opts?.timerExpiry === true
    const qType = currentQuestion.question_type.toLowerCase()
    const isCircuit = isCircuitSubmissionQuestion(currentQuestion)
    const isCode = isNativeCodeQuestion(currentQuestion)
    const isMulti = isAssessmentMultiSelectQuestion(currentQuestion)
    const isFillBlank =
      qType === "fill_blank" || qType === "fill_in_blank" || qType === "short_answer"
    const isTextType = isFillBlank || qType === "code_output" || qType === "trace_output" || isCode
    const enforceTypedPlayback = isTextType && !isCode

    if (!timerExpiry) {
      if (isCircuit) {
        if (!circuitSubmissionHasRequiredUpload(circuitAnswerJson, parseCircuitSubmissionConfig(currentQuestion.solution_upload_config))) {
          AppAlert.alert(
            "Submission required",
            "Upload a file, take a photo, or draw in the workspace before submitting.",
          )
          return
        }
      } else if (isCode) {
        if (!textAnswer.trim()) {
          AppAlert.alert("Code required", "Write your solution before submitting.")
          return
        }
        if (isCodeWritePlotQuestion(currentQuestion) && !plotImage.trim()) {
          AppAlert.alert("Plot required", "Attach your plot screenshot before submitting.")
          return
        }
      } else if (isMulti && selectedLetters.length === 0) {
        AppAlert.alert("Select answers", "Choose at least one option.")
        return
      } else if (!isMulti && !isTextType && !selectedLetter) {
        AppAlert.alert("Select an answer", "Choose an option before submitting.")
        return
      } else if (isTextType && !textAnswer.trim()) {
        AppAlert.alert("Enter an answer", "Type your answer before submitting.")
        return
      } else if (
        enforceTypedPlayback &&
        antiCheat.keystrokePlaybackEnforced &&
        !currentQuestion.anti_cheat_exempt &&
        looksLikePastedAnswer(keystrokeEventsRef.current, textAnswer)
      ) {
        void assessmentQuizApi
          .logViolation(session, {
            attemptId: quizSession.attemptId,
            type: "copy_paste",
            reason: "paste_or_missing_keystrokes",
            details: "Typed answer arrived without keystroke playback on mobile.",
          })
          .catch(() => {})
        if (antiCheat.blockCopyPaste) {
          AppAlert.alert(
            "Type your answer",
            "This assessment requires keystroke playback. Paste is blocked — enter the answer yourself.",
          )
          return
        }
      }
    }

    const startTime = questionStartRef.current[currentQuestion.id] ?? Date.now()
    const timeSpentSeconds = Math.max(0, Math.round((Date.now() - startTime) / 1000))

    setSubmittingAnswer(true)
    try {
      let answerToSubmit: string | string[]
      if (isCircuit) {
        answerToSubmit = await prepareCircuitAnswerForSubmit(session, {
          attemptId: quizSession.attemptId,
          questionId: currentQuestion.id,
          answerJson: circuitAnswerJson,
          questionTitle: quizSession.quiz.title,
        })
      } else if (timerExpiry && isMulti && selectedLetters.length === 0) {
        answerToSubmit = []
      } else if (timerExpiry && !isMulti && !isTextType && !selectedLetter) {
        answerToSubmit = ""
      } else if (timerExpiry && isTextType && !textAnswer.trim()) {
        answerToSubmit = ""
      } else {
        answerToSubmit = buildAnswerForSubmit(
          currentQuestion,
          selectedLetter,
          selectedLetters,
          textAnswer,
          plotImage,
        )
      }

      const keystrokeLog =
        isTextType && !currentQuestion.anti_cheat_exempt
          ? buildKeystrokePayload(keystrokeEventsRef.current, textAnswer)
          : undefined

      await assessmentQuizApi.saveAnswer(session, {
        attemptId: quizSession.attemptId,
        questionId: currentQuestion.id,
        answer: answerToSubmit,
        questionType: currentQuestion.question_type,
        timeSpentSeconds,
        ...(keystrokeLog ? { keystrokeLog } : {}),
      })

      const mcqEarnedFraction = resolveAssessmentQuestionMcqEarnedFraction(
        currentQuestion,
        selectedLetter,
        selectedLetters,
      )

      const evalResult = await assessmentQuizApi.submitAnswer(session, quizSession.apiType, {
        attemptId: quizSession.attemptId,
        questionId: currentQuestion.id,
        answer: answerToSubmit,
        questionType: currentQuestion.question_type,
        timeSpentSeconds,
        ...(mcqEarnedFraction != null ? { mcqEarnedFraction } : {}),
        ...(keystrokeLog ? { keystrokeLog } : {}),
      })
      const aiGraded = isProvisionalAiEvaluation(evalResult, currentQuestion.question_type)
      const normalizedEval = { ...evalResult, aiGraded }

      setAnsweredIds((prev) => new Set(prev).add(currentQuestion.id))
      answeredIdsRef.current = new Set(answeredIdsRef.current).add(currentQuestion.id)
      const nextAnsweredIds = new Set(answeredIdsRef.current)

      const scorePct =
        typeof normalizedEval.score === "number"
          ? normalizedEval.score
          : normalizedEval.maxPoints && typeof normalizedEval.pointsEarned === "number"
            ? (normalizedEval.pointsEarned / normalizedEval.maxPoints) * 100
            : undefined

      const evalMeta = {
        isCorrect: !!normalizedEval.isCorrect,
        score: scorePct,
        pointsEarned: normalizedEval.pointsEarned,
        maxPoints: normalizedEval.maxPoints,
      }

      let review = resolveObjectiveAnswerReview({
        question: currentQuestion,
        selectedLetters,
        selectedLetter,
        serverReview: normalizedEval.answerReview ?? null,
        evalResult: evalMeta,
      })
      if (!review) {
        review = buildPartialCreditFallbackReview({
          question: currentQuestion,
          selectedLetters,
          evalResult: evalMeta,
        })
      }
      if (review) {
        setAnswerReviews((prev) => ({ ...prev, [currentQuestion.id]: review }))
      }

      setSavedAnswersByQuestion((prev) => {
        const next = new Map(prev)
        next.set(currentQuestion.id, {
          questionId: currentQuestion.id,
          answer:
            typeof answerToSubmit === "string"
              ? answerToSubmit
              : JSON.stringify(answerToSubmit),
          isCorrect: normalizedEval.isCorrect,
          pointsEarned: normalizedEval.pointsEarned,
          aiFeedback: normalizedEval.aiFeedback,
        })
        return next
      })

      const questionMaxPoints =
        normalizedEval.maxPoints ?? currentQuestion.max_points ?? currentQuestion.points ?? 1

      const verdictCorrect = review?.isCorrect ?? !!normalizedEval.isCorrect
      const partial = isEvalPartialCredit({ ...evalMeta, isCorrect: verdictCorrect }, review)
      setIsCorrect(verdictCorrect)
      setFeedbackText(
        formatEvaluateAnswerFeedback(
          { ...normalizedEval, isCorrect: verdictCorrect },
          practiceHubFeedbackSummary(
            review,
            aiGraded
              ? partial
                ? "Provisional AI grade — partial credit."
                : verdictCorrect
                  ? "Provisional AI grade."
                  : "Provisional AI grade recorded."
              : partial
                ? "Partial credit."
                : verdictCorrect
                  ? "Correct!"
                  : "Answer recorded.",
            { ...evalMeta, isCorrect: verdictCorrect },
          ),
        ),
      )
      setShowFeedback(true)

      afterCelebrationRef.current = () => {
        setSubmittingAnswer(false)
        if (currentIndex < questions.length - 1) {
          void goToIndex(currentIndex + 1, { skipDraftSave: true })
          return
        }
        const nativeDone = nativeQuestions.every((q) => nextAnsweredIds.has(q.id))
        const unsupportedLeft = questions.filter(
          (q) => isUnsupportedQuestion(q) && !nextAnsweredIds.has(q.id),
        ).length
        if (nativeDone && unsupportedLeft === 0) {
          promptFinalizeAssessment()
        }
      }

      setCelebration(
        buildAssessmentAnswerCelebration({
          evalResult: normalizedEval,
          review,
          maxPoints: questionMaxPoints,
        }),
      )

      void persistTimerProgress()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.details as { locked?: boolean } | undefined
        if (body?.locked) {
          setAnsweredIds((prev) => new Set(prev).add(currentQuestion.id))
          answeredIdsRef.current = new Set(answeredIdsRef.current).add(currentQuestion.id)
          setShowFeedback(true)
          setIsCorrect(false)
          setFeedbackText("Answer already submitted.")
          setSubmittingAnswer(false)
          return
        }
      }
      AppAlert.alert("Submission failed", err instanceof ApiError ? err.message : "Please try again.")
      setSubmittingAnswer(false)
    }
  }

  useEffect(() => {
    submitAnswerRef.current = submitAnswer
  })

  const completeCelebration = useCallback(() => {
    setCelebration(null)
    afterCelebrationRef.current?.()
    afterCelebrationRef.current = null
  }, [])

  const promptFinalizeAssessment = () => {
    AppAlert.alert(
      "Submit assessment?",
      "All questions are answered. Submit now to record your score in History and Grades. Until you submit, this attempt stays in progress only.",
      [
        { text: "Not yet", style: "cancel" },
        { text: "Submit", style: "destructive", onPress: () => void doFinalize() },
      ],
    )
  }

  const finishAssessment = async () => {
    if (!session || !quizSession) return

    if (unsupportedUnansweredCount > 0) {
      AppAlert.alert(
        "Incomplete workspace questions",
        `${unsupportedUnansweredCount} workspace question(s) still need a submission before you can finish.`,
      )
      return
    }

    if (!allNativeAnswered && !allAnswered) {
      AppAlert.alert(
        "Incomplete",
        "You have unanswered questions. Submit all answers before finishing.",
      )
      return
    }

    AppAlert.alert(
      "Submit assessment?",
      "You won't be able to change your answers after submitting.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit", style: "destructive", onPress: () => void doFinalize() },
      ],
    )
  }

  const doFinalize = async () => {
    if (!session || !quizSession) return
    setSubmittingFinal(true)
    try {
      const result = await assessmentQuizApi.finalize(session, {
        attemptId: quizSession.attemptId,
        quizId: quizSession.quizId,
      })
      openAssessmentResults(router, result.attemptId, assessmentType)
    } catch (err) {
      AppAlert.alert("Could not submit", err instanceof ApiError ? err.message : "Please try again.")
    } finally {
      setSubmittingFinal(false)
    }
  }
  finalizeRef.current = doFinalize

  const persistDraftAnswer = async () => {
    if (!session || !quizSession || !currentQuestion || answeredIdsRef.current.has(currentQuestion.id)) return
    if (isUnsupportedQuestion(currentQuestion)) return

    const qType = currentQuestion.question_type.toLowerCase()
    const saveDraft = async (answer: string | string[]) => {
      try {
        await assessmentQuizApi.saveAnswer(session, {
          attemptId: quizSession.attemptId,
          questionId: currentQuestion.id,
          answer,
          questionType: currentQuestion.question_type,
          autoSave: true,
        })
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) return
        throw err
      }
    }

    if (isCircuitSubmissionQuestion(currentQuestion)) {
      const parsed = parseCircuitSubmissionAnswer(circuitAnswerJson)
      const draft = compactCircuitSubmissionForAutoSave(parsed)
      if (!draft || draft === emptyCircuitSubmissionAnswer()) return
      await saveDraft(draft)
      return
    }

    if (isNativeCodeQuestion(currentQuestion)) {
      if (!textAnswer.trim() && !plotImage.trim()) return
      await saveDraft(buildAnswerForSubmit(currentQuestion, "", [], textAnswer, plotImage))
      return
    }

    const isMulti = isAssessmentMultiSelectQuestion(currentQuestion)
    const hasDraft =
      (isMulti && selectedLetters.length > 0) || selectedLetter || textAnswer.trim()
    if (!hasDraft) return

    const draft = buildAnswerForSubmit(
      currentQuestion,
      selectedLetter,
      selectedLetters,
      textAnswer,
      plotImage,
    )
    await saveDraft(draft)
  }

  const doSaveForLater = async () => {
    if (!session || !quizSession) return
    setSavingLater(true)
    try {
      try {
        await persistDraftAnswer()
      } catch {
        /* draft save is best-effort */
      }
      if (quizSession.hasSaveAndFinishLaterAccess) {
        await assessmentQuizApi.saveAndFinishLater(session, {
          attemptId: quizSession.attemptId,
          currentQuestionIndex: currentIndex,
        })
      } else {
        await assessmentQuizApi.saveProgress(session, {
          attemptId: quizSession.attemptId,
          currentQuestionIndex: currentIndex,
        })
      }
      setShowContinueLaterModal(false)
      leaveQuiz()
    } catch (err) {
      AppAlert.alert("Could not save", err instanceof ApiError ? err.message : "Please try again.")
    } finally {
      setSavingLater(false)
    }
  }

  const handleContinueLaterPress = () => {
    setShowContinueLaterModal(true)
  }

  const handleExitPress = () => {
    setShowExitModal(true)
  }

  const handleExitSaveAndLeave = async () => {
    if (!session || !quizSession) return
    setSavingLater(true)
    try {
      try {
        await persistDraftAnswer()
      } catch {
        /* draft save is best-effort */
      }
      await assessmentQuizApi.saveProgress(session, {
        attemptId: quizSession.attemptId,
        currentQuestionIndex: currentIndex,
      })
    } catch {
      /* leave even if progress save fails */
    } finally {
      setShowExitModal(false)
      setSavingLater(false)
      leaveQuiz()
    }
  }

  const prepareTexts = useMemo(
    () => (questions.length ? extractAssessmentQuizQuestionTexts(questions) : null),
    [questions],
  )

  const title = quizSession?.quiz.title || formatAssessmentType(assessmentType)

  if (!session) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: tokens.background }]}>
        <ActivityIndicator size="large" color={tokens.accent} />
      </View>
    )
  }

  if (loadError) {
    return (
      <View style={[styles.root, { backgroundColor: tokens.background }]}>
        <NotetakerScreenHeader
          title={title}
          onBackPress={leaveQuiz}
          fallbackHref={`/assessment/${quizId}?type=${assessmentType}`}
        />
        <View style={[styles.errorRoot, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.errorCard}>
            <View
              style={[
                styles.errorIconWrap,
                { backgroundColor: hexToRgba(tokens.danger, tokens.isDark ? 0.2 : 0.1) },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={32} color={tokens.danger} />
            </View>
            <Text style={[styles.errorTitle, { color: tokens.text }]}>{loadError}</Text>
            <View style={styles.errorActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.errorPrimaryBtn,
                  { backgroundColor: tokens.accent, opacity: pressed ? 0.88 : 1 },
                ]}
                onPress={leaveQuiz}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>Go back</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.errorSecondaryBtn,
                  { borderColor: tokens.border, opacity: pressed ? 0.78 : 1 },
                ]}
                onPress={() => void bootstrap()}
                accessibilityRole="button"
              >
                <Text style={[styles.errorSecondaryBtnText, { color: tokens.accent }]}>Try again</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    )
  }

  if (loading || !quizSession || !currentQuestion) {
    return (
      <QuestionPrepareGate
        fetching={loading}
        texts={prepareTexts}
        title={`Preparing ${formatAssessmentType(assessmentType)}`}
        subtitle="Loading questions, math, and answer choices"
        enabled={loading || Boolean(quizSession?.questions.length)}
        hideUntilReady
      >
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <NotetakerScreenHeader
            title={title}
            onBackPress={leaveQuiz}
            fallbackHref={`/assessment/${quizId}?type=${assessmentType}`}
          />
        </View>
      </QuestionPrepareGate>
    )
  }

  const options = getQuestionOptions(currentQuestion)
  const qType = currentQuestion.question_type.toLowerCase()
  const isUnsupported = isUnsupportedQuestion(currentQuestion)
  const isCircuit = isCircuitSubmissionQuestion(currentQuestion)
  const isCode = isNativeCodeQuestion(currentQuestion)
  const isCodePlot = isCodeWritePlotQuestion(currentQuestion)
  const isMulti = isAssessmentMultiSelectQuestion(currentQuestion)
  const isTextInput =
    !isUnsupported &&
    !isCircuit &&
    !isCode &&
    (qType === "fill_blank" ||
      qType === "fill_in_blank" ||
      qType === "short_answer" ||
      qType === "code_output" ||
      qType === "trace_output")
  const codeReady = !isCode || codeWriteSubmissionReady(currentQuestion, textAnswer, plotImage)
  const timerLocked = quizTimer.isQuestionTimerExpired(currentQuestion.id)
  const locked = answeredIds.has(currentQuestion.id) || timerLocked
  const currentReview = answerReviews[currentQuestion.id] ?? null
  const savedRow = savedAnswersByQuestion.get(currentQuestion.id)
  const questionMaxPoints = currentQuestion.max_points ?? currentQuestion.points ?? 1
  const isPartial = isEvalPartialCredit(
    {
      isCorrect: savedRow?.isCorrect ?? currentReview?.isCorrect,
      pointsEarned: savedRow?.pointsEarned ?? currentReview?.pointsEarned,
      maxPoints: currentReview?.maxPoints ?? questionMaxPoints,
      score: currentReview?.score,
    },
    currentReview,
  )
  const circuitConfig = parseCircuitSubmissionConfig(currentQuestion.solution_upload_config)
  const circuitReady = circuitSubmissionHasRequiredUpload(circuitAnswerJson, circuitConfig)
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < questions.length - 1

  const questionPrompt = (
    <>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, styles.badgeOutline, { borderColor: tokens.border }]}>
          <Text style={[styles.badgeTextOutline, { color: SN.secondaryLabel }]}>
            {isUnsupported
              ? unsupportedQuestionLabel(currentQuestion.question_type)
              : isCircuit
                ? "Circuit submission"
                : isCodePlot
                  ? "Code + plot"
                  : isCode
                    ? "Code write"
                    : isMulti
                      ? "Select all"
                      : isTextInput
                        ? "Short answer"
                        : "Single choice"}
          </Text>
        </View>
        {currentQuestion.points != null ? (
          <Text style={[styles.pointsLabel, { color: SN.secondaryLabel }]}>
            {currentQuestion.points} pt{currentQuestion.points === 1 ? "" : "s"}
          </Text>
        ) : null}
      </View>

      <QuestionMediaView media={parseQuestionMedia(currentQuestion.question_media)} embedded />

      <QuestionContentWebView
        text={currentQuestion.question_text}
        embedded
        secure
        onReady={() => markQuestionPaintReady("prompt")}
      />
    </>
  )

  const feedbackTone = isCorrect ? tokens.success : isPartial ? tokens.warning : tokens.danger

  const feedbackBlock = showFeedback ? (
    <View
      style={[
        styles.feedbackBox,
        { backgroundColor: semanticSoft(feedbackTone, tokens.isDark) },
      ]}
    >
      <Ionicons
        name={isCorrect ? "checkmark-circle" : isPartial ? "alert-circle" : "close-circle"}
        size={20}
        color={feedbackTone}
      />
      <View style={styles.feedbackCopy}>
        <QuestionContentWebView text={feedbackText} embedded compact />
      </View>
    </View>
  ) : null

  const circuitSubmissionPanel = (
    <CircuitSubmissionPanel
      session={session}
      attemptId={quizSession.attemptId}
      questionId={currentQuestion.id}
      value={circuitAnswerJson}
      onChange={setCircuitAnswerJson}
      config={currentQuestion.solution_upload_config}
      disabled={locked || submittingAnswer}
      notesHeight={
        keyboardOpen ? Math.max(96, submissionLayout.notesHeight - 72) : submissionLayout.notesHeight
      }
      onNotesFocus={() => setAnswerFieldFocused(true)}
      onNotesBlur={() => setAnswerFieldFocused(false)}
    />
  )

  return (
    <QuestionPrepareGate
      fetching={false}
      texts={prepareTexts}
      title={`Preparing ${formatAssessmentType(assessmentType)}`}
      subtitle="Loading questions, math, and answer choices"
      enabled={Boolean(quizSession.questions.length)}
      hideUntilReady
    >
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <NotetakerScreenHeader
        title={title}
        onBackPress={handleExitPress}
        fallbackHref={`/assessment/${quizId}?type=${assessmentType}`}
      />

      <View style={styles.flex}>
      {keyboardOpen ? (
        <View style={[styles.quizChromeCompact, moduleContent]}>
          <Text style={[styles.quizChromeCompactText, { color: tokens.text }]}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
          <Text
            style={[
              styles.quizChromeCompactText,
              { color: quizTimer.timerUrgent ? tokens.danger : SN.secondaryLabel },
            ]}
          >
            {quizTimer.showTimer
              ? quizTimer.timerStarting
                ? "…"
                : quizTimer.timerDisplay
              : `${progressPct}%`}
          </Text>
        </View>
      ) : (
      <View style={[styles.quizChrome, moduleContent]}>
        <View style={[styles.statusCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.statusTopRow}>
            <View style={styles.questionMeta}>
              <View style={[styles.questionIndexBadge, { backgroundColor: hexToRgba(tokens.accent, 0.14) }]}>
                <Text style={[styles.questionIndexNumber, { color: tokens.accent }]}>{currentIndex + 1}</Text>
              </View>
              <View style={styles.questionMetaCopy}>
                <Text style={[styles.questionMetaLabel, { color: SN.secondaryLabel }]}>Question</Text>
                <Text style={[styles.questionMetaTotal, { color: tokens.text }]}>of {questions.length}</Text>
              </View>
            </View>

            {quizTimer.showTimer ? (
              <View style={styles.timerBlock}>
                <Text style={[styles.timerCaption, { color: SN.secondaryLabel }]}>{quizTimer.timerLabel}</Text>
                <Text
                  style={[
                    styles.timerDigits,
                    { color: quizTimer.timerUrgent ? tokens.danger : tokens.text },
                  ]}
                >
                  {quizTimer.timerStarting ? "…" : quizTimer.timerDisplay}
                </Text>
                {quizTimer.timerDrainPercent != null ? (
                  <View style={[styles.timerDrainTrack, { backgroundColor: hexToRgba(tokens.border, 0.45) }]}>
                    <View
                      style={[
                        styles.timerDrainFill,
                        {
                          width: `${quizTimer.timerDrainPercent}%`,
                          backgroundColor: quizTimer.timerUrgent ? tokens.danger : tokens.accent,
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.timerBlock}>
                <Text style={[styles.timerCaption, { color: SN.secondaryLabel }]}>Progress</Text>
                <Text style={[styles.timerDigits, { color: tokens.text }]}>{progressPct}%</Text>
              </View>
            )}
          </View>

          <View style={[styles.statusProgressTrack, { backgroundColor: hexToRgba(tokens.border, 0.45) }]}>
            <View
              style={[
                styles.statusProgressFill,
                { width: `${progressPct}%`, backgroundColor: tokens.accent },
              ]}
            />
          </View>

          <Text style={[styles.statusMeta, { color: SN.secondaryLabel }]}>
            {answeredIds.size} answered · {unansweredCount} remaining
          </Text>
        </View>

        <View style={[styles.actionStrip, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <QuizActionButton
            icon={showQuestionNav ? "grid" : "grid-outline"}
            label="Navigate"
            onPress={() => setShowQuestionNav((v) => !v)}
            active={showQuestionNav}
            accentColor={tokens.accent}
            dangerColor={tokens.danger}
            mutedColor={SN.secondaryLabel}
            textColor={tokens.text}
          />
          <View style={[styles.actionDivider, { backgroundColor: tokens.border }]} />
          <QuizActionButton
            icon="water-outline"
            label="Break"
            onPress={() => setWaterBreakPickerOpen(true)}
            tone="teal"
            disabled={waterBreakActive}
            accentColor={tokens.accent}
            dangerColor={tokens.danger}
            mutedColor={SN.secondaryLabel}
            textColor={tokens.text}
          />
          <View style={[styles.actionDivider, { backgroundColor: tokens.border }]} />
          <QuizActionButton
            icon="bookmark-outline"
            label="Save"
            onPress={handleContinueLaterPress}
            tone="accent"
            accentColor={tokens.accent}
            dangerColor={tokens.danger}
            mutedColor={SN.secondaryLabel}
            textColor={tokens.text}
          />
          <View style={[styles.actionDivider, { backgroundColor: tokens.border }]} />
          <QuizActionButton
            icon="log-out-outline"
            label="Exit"
            onPress={handleExitPress}
            tone="danger"
            accentColor={tokens.accent}
            dangerColor={tokens.danger}
            mutedColor={SN.secondaryLabel}
            textColor={tokens.text}
          />
        </View>
      </View>
      )}

      {/* Collapsible question navigator */}
      {!keyboardOpen && showQuestionNav ? (
        <View style={[styles.navPanel, moduleContent, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.navPanelHeader}>
            <Text style={[styles.navPanelTitle, { color: tokens.text }]}>Jump to question</Text>
            <Pressable
              onPress={() => setShowQuestionNav(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close question navigator"
            >
              <Ionicons name="close" size={18} color={SN.secondaryLabel} />
            </Pressable>
          </View>
          <Text style={[styles.navPanelMeta, { color: SN.secondaryLabel }]}>
            {answeredIds.size} answered · {unansweredCount} remaining
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.questionNav}
          >
            {questions.map((q, i) => {
              const answered = answeredIds.has(q.id)
              const current = i === currentIndex
              return (
                <Pressable
                  key={q.id}
                  style={[
                    styles.navDot,
                    { backgroundColor: tokens.background, borderColor: tokens.border },
                    current && {
                      borderColor: tokens.accent,
                      backgroundColor: hexToRgba(tokens.accent, 0.12),
                    },
                    answered && !current && {
                      backgroundColor: hexToRgba(tokens.success, 0.12),
                      borderColor: tokens.success,
                    },
                  ]}
                  onPress={() => void goToIndex(i)}
                >
                  <Text
                    style={[
                      styles.navDotText,
                      { color: SN.secondaryLabel },
                      (current || answered) && { color: current ? tokens.accent : tokens.success },
                    ]}
                  >
                    {i + 1}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          moduleContent,
          keyboardOpen && styles.contentKeyboardOpen,
          keyboardOpen &&
            Platform.OS === "android" && { paddingBottom: Math.max(24, keyboardHeight + 24) },
        ]}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={16}
      >
        <View style={[styles.cardHost, !questionPaintReady && styles.cardHostPending]}>
        <View
          style={[
            styles.card,
            { backgroundColor: tokens.surface, borderColor: tokens.border },
            { opacity: questionPaintReady ? 1 : 0 },
          ]}
          pointerEvents={questionPaintReady ? "auto" : "none"}
        >
          {questionPrompt}

          <View ref={answerFieldRef} collapsable={false}>
          {isUnsupported ? (
            <View
              style={[
                styles.workspaceBox,
                {
                  backgroundColor: hexToRgba(tokens.accent, 0.08),
                  borderColor: hexToRgba(tokens.accent, 0.25),
                },
              ]}
            >
              <Ionicons name="construct-outline" size={22} color={tokens.accent} />
              <View style={styles.workspaceCopy}>
                <Text style={[styles.workspaceTitle, { color: tokens.text }]}>
                  {unsupportedQuestionLabel(currentQuestion.question_type)}
                </Text>
                <Text style={[styles.workspaceBody, { color: SN.secondaryLabel }]}>
                  This question type is not yet supported in the mobile app. Use the web portal to complete it.
                </Text>
              </View>
            </View>
          ) : isCircuit ? (
            circuitSubmissionPanel
          ) : isCode ? (
            <CodeWriteAnswerPanel
              code={textAnswer}
              onCodeChange={(next) => {
                const startedAt = questionStartRef.current[currentQuestion.id] ?? Date.now()
                const event = recordTextChange(textAnswer, next, startedAt)
                keystrokeEventsRef.current = [...keystrokeEventsRef.current, event]
                setTextAnswer(next)
              }}
              plotImage={plotImage}
              onPlotImageChange={isCodePlot ? setPlotImage : undefined}
              requiresPlot={isCodePlot}
              disabled={locked || submittingAnswer}
              questionType={currentQuestion.question_type}
              questionText={currentQuestion.question_text}
              blockPaste={antiCheat.blockCopyPaste}
              editorKey={currentQuestion.id}
              editorHeight={
                keyboardOpen
                  ? quizCodeEditorHeightForKeyboard({
                      windowHeight,
                      keyboardHeight,
                      topReserve: 220,
                      fallback: submissionLayout.codeFieldHeight,
                    })
                  : submissionLayout.codeFieldHeight
              }
              onEditorFocus={() => {
                setAnswerFieldFocused(true)
                requestAnimationFrame(() => bringAnswerFieldIntoView())
              }}
              onEditorBlur={() => setAnswerFieldFocused(false)}
            />
          ) : isTextInput ? (
            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor: tokens.border,
                  backgroundColor: tokens.background,
                  color: tokens.text,
                  height: submissionLayout.textFieldHeight,
                  minHeight: submissionLayout.textFieldHeight,
                },
              ]}
              value={textAnswer}
              onChangeText={(next) => {
                const startedAt = questionStartRef.current[currentQuestion.id] ?? Date.now()
                const event = recordTextChange(textAnswer, next, startedAt)
                const pasteBlocked =
                  antiCheat.blockCopyPaste &&
                  antiCheat.keystrokePlaybackEnforced &&
                  !currentQuestion.anti_cheat_exempt &&
                  looksLikePastedAnswer([event], next) &&
                  next.length - textAnswer.length >= 8
                if (pasteBlocked) {
                  void assessmentQuizApi
                    .logViolation(session, {
                      attemptId: quizSession.attemptId,
                      type: "copy_paste",
                      reason: "paste_blocked",
                      details: "Paste blocked on mobile typed-answer field.",
                    })
                    .catch(() => {})
                  AppAlert.alert("Paste blocked", "Type your answer. Copy and paste is turned off for this assessment.")
                  return
                }
                keystrokeEventsRef.current = [...keystrokeEventsRef.current, event]
                setTextAnswer(next)
              }}
              placeholder="Type your answer"
              placeholderTextColor={SN.secondaryLabel}
              onFocus={() => {
                setAnswerFieldFocused(true)
                requestAnimationFrame(() => bringAnswerFieldIntoView())
              }}
              onBlur={() => setAnswerFieldFocused(false)}
              editable={!locked && !submittingAnswer}
              multiline={qType !== "code_output" && qType !== "trace_output"}
              autoCapitalize="none"
              autoCorrect={false}
              contextMenuHidden={antiCheat.blockCopyPaste}
              textContentType="none"
              autoComplete="off"
            />
          ) : (
            <>
              {isMulti && !locked ? (
                <Text style={[styles.selectAllHint, { color: SN.secondaryLabel }]}>
                  Select all that apply, then submit.
                </Text>
              ) : null}
              {options.map(({ letter, text }) => {
              const selected = isMulti ? selectedLetters.includes(letter) : selectedLetter === letter
              const reviewState =
                locked && currentReview
                  ? practiceAnswerReviewOptionState(currentReview, letter)
                  : null
              const showReview = reviewState != null

              return (
                <Pressable
                  key={letter}
                  accessibilityRole={isMulti ? "checkbox" : "radio"}
                  accessibilityState={{
                    selected,
                    checked: isMulti ? selected : undefined,
                    disabled: locked || submittingAnswer,
                  }}
                  accessibilityLabel={`Option ${letter}`}
                  style={[
                    styles.option,
                    { borderColor: tokens.border, backgroundColor: tokens.background },
                    selected && !showReview && {
                      borderColor: tokens.accent,
                      backgroundColor: hexToRgba(tokens.accent, 0.06),
                    },
                    reviewState?.showPartialCreditSelection && {
                      borderColor: SYSTEM.orange.color,
                      backgroundColor: hexToRgba(SYSTEM.orange.color, 0.08),
                    },
                    reviewState?.isCorrect && {
                      borderColor: SYSTEM.green.color,
                      backgroundColor: hexToRgba(SYSTEM.green.color, 0.08),
                    },
                    reviewState?.showWrongSelection && {
                      borderColor: SYSTEM.red.color,
                      backgroundColor: hexToRgba(SYSTEM.red.color, 0.06),
                    },
                    locked && styles.optionLocked,
                  ]}
                  onPress={() => {
                    if (locked || submittingAnswer) return
                    triggerMotionHaptic("selection")
                    if (isMulti) {
                      setSelectedLetters((prev) =>
                        prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter],
                      )
                    } else {
                      setSelectedLetter(letter)
                    }
                  }}
                  disabled={locked || submittingAnswer}
                >
                  {isMulti ? (
                    <Ionicons
                      name={selected ? "checkbox" : "square-outline"}
                      size={24}
                      color={
                        reviewState?.showWrongSelection
                          ? SYSTEM.red.color
                          : reviewState?.showPartialCreditSelection
                            ? SYSTEM.orange.color
                            : reviewState?.isCorrect
                              ? SYSTEM.green.color
                              : selected
                                ? tokens.accent
                                : SN.secondaryLabel
                      }
                    />
                  ) : (
                    <View
                      style={[
                        styles.optionLetter,
                        { backgroundColor: tokens.surface, borderColor: tokens.border },
                        selected && !showReview && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                        reviewState?.showPartialCreditSelection && {
                          backgroundColor: SYSTEM.orange.color,
                          borderColor: SYSTEM.orange.color,
                        },
                        reviewState?.isCorrect && {
                          backgroundColor: SYSTEM.green.color,
                          borderColor: SYSTEM.green.color,
                        },
                        reviewState?.showWrongSelection && {
                          backgroundColor: SYSTEM.red.color,
                          borderColor: SYSTEM.red.color,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLetterText,
                          { color: SN.secondaryLabel },
                          (selected && !showReview) ||
                          reviewState?.isCorrect ||
                          reviewState?.showPartialCreditSelection ||
                          reviewState?.showWrongSelection
                            ? styles.optionLetterTextSelected
                            : null,
                        ]}
                      >
                        {letter}
                      </Text>
                    </View>
                  )}
                  <View style={styles.optionTextWrap}>
                    <QuestionContentWebView
                      text={text}
                      embedded
                      compact
                      secure
                      onReady={() => markQuestionPaintReady(`option-${letter}`)}
                    />
                  </View>
                  {!isMulti && selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={
                        reviewState?.showWrongSelection
                          ? SYSTEM.red.color
                          : reviewState?.showPartialCreditSelection
                            ? SYSTEM.orange.color
                            : reviewState?.isCorrect
                              ? SYSTEM.green.color
                              : tokens.accent
                      }
                    />
                  ) : null}
                </Pressable>
              )
            })}
            </>
          )}
          </View>

          {feedbackBlock}
        </View>
        {!questionPaintReady ? (
          <View
            style={[
              styles.cardPaintOverlay,
              { backgroundColor: tokens.surface, borderColor: tokens.border },
            ]}
          >
            <ActivityIndicator size="large" color={tokens.accent} />
            <Text style={[styles.cardPaintText, { color: SN.secondaryLabel }]}>
              Loading question…
            </Text>
          </View>
        ) : null}
        </View>
      </ScrollView>

      {/* Footer: Previous · Next · Submit */}
      {keyboardOpen ? null : (
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: tokens.background, borderTopColor: tokens.border }]}>
        <View style={[styles.footerInner, moduleContent]}>
        <View style={styles.footerNavRow}>
          <Pressable
            style={[styles.navBtn, { borderColor: tokens.border }, !canGoPrevious && styles.btnDisabled]}
            onPress={goToPrevious}
            disabled={!canGoPrevious || submittingAnswer || Boolean(celebration)}
          >
            <Ionicons name="chevron-back" size={18} color={canGoPrevious ? tokens.text : SN.secondaryLabel} />
            <Text style={[styles.navBtnText, { color: canGoPrevious ? tokens.text : SN.secondaryLabel }]}>
              Previous
            </Text>
          </Pressable>

          <Pressable
            style={[styles.navBtn, { borderColor: tokens.border }, !canGoNext && styles.btnDisabled]}
            onPress={goToNext}
            disabled={!canGoNext || submittingAnswer || Boolean(celebration)}
          >
            <Text style={[styles.navBtnText, { color: canGoNext ? tokens.text : SN.secondaryLabel }]}>Next</Text>
            <Ionicons name="chevron-forward" size={18} color={canGoNext ? tokens.text : SN.secondaryLabel} />
          </Pressable>
        </View>

        {canShowSubmit ? (
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: tokens.accent }, submittingFinal && styles.btnDisabled]}
            onPress={() => void finishAssessment()}
            disabled={submittingFinal}
          >
            {submittingFinal ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Submit assessment</Text>
            )}
          </Pressable>
        ) : !isUnsupported ? (
          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: tokens.accent },
              (locked ||
                submittingAnswer ||
                Boolean(celebration) ||
                (isCircuit && !circuitReady) ||
                (isCode && !codeReady && !locked)) &&
              styles.btnDisabled,
            ]}
            onPress={() => void submitAnswer()}
            disabled={
              locked ||
              submittingAnswer ||
              Boolean(celebration) ||
              (isCircuit && !circuitReady) ||
              (isCode && !codeReady && !locked)
            }
          >
            {submittingAnswer ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {locked ? (timerLocked && !answeredIds.has(currentQuestion.id) ? "Time expired" : "Answer submitted") : "Submit answer"}
              </Text>
            )}
          </Pressable>
        ) : null}
        </View>
      </View>
      )}
      </View>

      {/* Continue Later modal */}
      <Modal visible={showContinueLaterModal} transparent animationType="fade" onRequestClose={() => setShowContinueLaterModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowContinueLaterModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]} onPress={() => {}}>
            <View style={[styles.modalIconWrap, { backgroundColor: hexToRgba(tokens.accent, 0.12) }]}>
              <Ionicons name="pause-circle" size={28} color={tokens.accent} />
            </View>
            <Text style={[styles.modalTitle, { color: tokens.text }]}>Continue later?</Text>
            <Text style={[styles.modalBody, { color: SN.secondaryLabel }]}>
              {quizSession.hasSaveAndFinishLaterAccess
                ? "Your progress will be saved. You can pick up this assessment from the list before the deadline."
                : "Your current progress will be saved. Resume from the assessment list anytime before the deadline."}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtnOutline, { borderColor: tokens.border }]}
                onPress={() => setShowContinueLaterModal(false)}
              >
                <Text style={[styles.modalBtnOutlineText, { color: tokens.text }]}>Stay on quiz</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, { backgroundColor: tokens.accent }, savingLater && styles.btnDisabled]}
                onPress={() => void doSaveForLater()}
                disabled={savingLater}
              >
                {savingLater ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save & leave</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <WaterBreakDurationDialog
        visible={waterBreakPickerOpen}
        onDismiss={() => setWaterBreakPickerOpen(false)}
        description="Step away and hydrate. Your assessment progress stays saved — resume when you’re ready."
        skipLabel="Cancel"
        onStart={(minutes) => {
          setWaterBreakPickerOpen(false)
          setWaterBreakSeconds(Math.max(60, minutes * 60))
          setWaterBreakActive(true)
        }}
      />
      {waterBreakActive ? (
        <WaterBreakOverlay
          totalSeconds={waterBreakSeconds}
          onResume={() => setWaterBreakActive(false)}
          resumeLabel="Resume assessment"
          activeHint="Take a breather — your answers stay saved while you hydrate."
          completeHint="Ready to jump back into your assessment?"
          skipEarlyLabel="Skip break and resume"
        />
      ) : null}

      <Modal
        visible={celebration != null}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.celebrationModal} pointerEvents="none">
          {celebration ? (
            <FlashcardKnownCelebration payload={celebration} onComplete={completeCelebration} />
          ) : null}
        </View>
      </Modal>

      {/* Quit modal */}
      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowExitModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]} onPress={() => {}}>
            <View style={[styles.modalIconWrap, { backgroundColor: hexToRgba(tokens.danger, 0.12) }]}>
              <Ionicons name="exit-outline" size={28} color={tokens.danger} />
            </View>
            <Text style={[styles.modalTitle, { color: tokens.text }]}>Quit assessment?</Text>
            <Text style={[styles.modalBody, { color: SN.secondaryLabel }]}>
              Your answers are saved as you go, but your score is not recorded in History or Grades until you tap Submit assessment. You can return and continue this in-progress attempt later.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtnOutline, { borderColor: tokens.border }]}
                onPress={() => setShowExitModal(false)}
              >
                <Text style={[styles.modalBtnOutlineText, { color: tokens.text }]}>Keep going</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, { backgroundColor: tokens.danger }, savingLater && styles.btnDisabled]}
                onPress={() => void handleExitSaveAndLeave()}
                disabled={savingLater}
              >
                {savingLater ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Quit</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
    </QuestionPrepareGate>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  celebrationModal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  errorRoot: { flex: 1, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  errorCard: { width: "100%", maxWidth: 360, alignItems: "center", gap: 16 },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: { fontSize: 17, fontWeight: "600", textAlign: "center", lineHeight: 24 },
  errorActions: { width: "100%", gap: 10, marginTop: 4 },
  errorPrimaryBtn: {
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  errorSecondaryBtn: {
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  errorSecondaryBtnText: { fontSize: 15, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600" },
  flex: { flex: 1 },
  quizChrome: { gap: 10, paddingTop: 10, paddingBottom: 4, paddingHorizontal: 16 },
  quizChromeCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  quizChromeCompactText: { fontSize: 13, fontWeight: "600" },
  statusCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  statusTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  questionMeta: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  questionIndexBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  questionIndexNumber: { fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  questionMetaCopy: { gap: 2 },
  questionMetaLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  questionMetaTotal: { fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"] },
  timerBlock: { alignItems: "flex-end", minWidth: 88, gap: 2 },
  timerCaption: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timerDigits: { fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"], lineHeight: 26 },
  timerDrainTrack: {
    width: 88,
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 4,
  },
  timerDrainFill: { height: "100%", borderRadius: 999 },
  statusProgressTrack: { height: 4, borderRadius: 999, overflow: "hidden" },
  statusProgressFill: { height: "100%", borderRadius: 999 },
  statusMeta: { fontSize: 12, fontWeight: "500" },
  actionStrip: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    minHeight: 56,
  },
  quizActionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  quizActionBtnDisabled: { opacity: 0.45 },
  quizActionLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.2 },
  actionDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  navPanel: {
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  navPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  navPanelTitle: { fontSize: 14, fontWeight: "600" },
  navPanelMeta: { fontSize: 12, fontWeight: "500", marginBottom: 10 },
  questionNav: { flexDirection: "row", gap: 6, paddingRight: 4 },
  navDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  navDotText: { fontSize: 11, fontWeight: "700" },
  content: { padding: 16, paddingTop: 4, paddingBottom: 24 },
  contentKeyboardOpen: { flexGrow: 1 },
  cardHost: { position: "relative" },
  cardHostPending: { minHeight: 280 },
  cardPaintOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardPaintText: { fontSize: 14, fontWeight: "600" },
  card: { borderRadius: 14, padding: 14, gap: 12, borderWidth: StyleSheet.hairlineWidth },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOutline: { backgroundColor: "transparent", borderWidth: 1 },
  badgeTextOutline: { fontSize: 11, fontWeight: "600" },
  pointsLabel: { fontSize: 12, fontWeight: "600" },
  workspaceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  workspaceCopy: { flex: 1, gap: 4 },
  workspaceTitle: { fontSize: 15, fontWeight: "600" },
  workspaceBody: { fontSize: 13, lineHeight: 18 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionLocked: { opacity: 0.7 },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  optionLetterText: { fontSize: 13, fontWeight: "600" },
  optionLetterTextSelected: { color: "#ffffff" },
  optionTextWrap: { flex: 1, minWidth: 0 },
  selectAllHint: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  feedbackCopy: { flex: 1, minWidth: 0 },
  footer: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerInner: {
    paddingHorizontal: 16,
    gap: 8,
  },
  footerNavRow: { flexDirection: "row", gap: 8 },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 42,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  navBtnText: { fontSize: 14, fontWeight: "600" },
  primaryBtn: {
    alignSelf: "stretch",
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  modalBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  modalBtnOutline: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  modalBtnOutlineText: { fontSize: 15, fontWeight: "600" },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
})
