import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { hexToRgba } from "../../constants/app-themes"
import { SYSTEM } from "../../constants/faculty-native-theme"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { semanticSoft, useThemedStudentNative } from "../../lib/themed-module-theme"
import { useSession } from "../../context/SessionProvider"
import { practiceApi, type SubmitPracticeResult } from "../../lib/practice-api"
import {
  buildAnswerForSubmit,
  getQuestionOptions,
  restoreSelectionFromSavedAnswer,
} from "../../lib/assessment-quiz/assessment-answer-mapper"
import {
  circuitSubmissionHasRequiredUpload,
  emptyCircuitSubmissionAnswer,
  parseCircuitSubmissionConfig,
} from "../../lib/circuit-submission-utils"
import {
  CircuitSubmissionPanel,
  prepareCircuitAnswerForSubmit,
} from "../assessments/CircuitSubmissionPanel"
import { useModuleContentStyle } from "../../lib/responsive-layout"
import { useStudentSubmissionLayout } from "../../lib/circuit-submission-layout"
import {
  clearActivePracticeSession,
  getActivePracticeSession,
  hydrateActivePracticeSession,
  isMultiSelectType,
  setActivePracticeSession,
  type PracticeQuestion,
  type PracticeSessionData,
} from "../../lib/practice-session"
import {
  asAssessmentQuestion,
  isCircuitQuestion,
  isCodeQuestion,
  isMultiPartQuestion,
  isTextInputQuestion,
  practiceQuestionBadge,
} from "../../lib/practice-question-types"
import { ApiError } from "../../lib/student-api"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"
import { parseQuestionMedia } from "../../lib/classroom-submission"
import { QuestionPrepareGate } from "../questions/QuestionPrepareGate"
import { useQuestionPaintReady } from "../../hooks/useQuestionPaintReady"
import { useKeyboardHeight } from "../ui/KeyboardAwareForm"
import { countQuestionPaintTargets } from "../../lib/question-paint-ready"
import { resolvePracticeQuestionMcqEarnedFraction } from "../../lib/practice-mcq-earned-fraction"
import {
  buildPartialCreditFallbackReview,
  isEvalPartialCredit,
  practiceAnswerReviewOptionState,
  practiceHubFeedbackSummary,
  programmedAnswerKeyFromReview,
  resolveObjectiveAnswerReview,
} from "../../lib/lecture-sample-practice-grading"
import type { PracticeAnswerReview } from "../../lib/lecture-types"
import { extractPracticeQuestionTexts } from "../../lib/question-prepare"
import { getQueryClient, invalidateByAction, studentQueryScope } from "../../lib/query"
import { getGradableSubquestions, subquestionOptionLabels } from "../../lib/lecture-sample-practice-utils"
import type { StudentSession } from "../../lib/session"
import {
  emptyMultiPartAnswer,
  MultiPartAnswerPanel,
  multiPartAnswerReady,
  parseMultiPartAnswerJson,
  serializeMultiPartAnswer,
} from "./MultiPartAnswerPanel"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function calcXp(difficulty: string, responseTimeMs: number, attemptNum: number): number {
  const base = difficulty === "easy" ? 10 : difficulty === "medium" ? 15 : 25
  const speedBonus = responseTimeMs < 5000 ? Math.max(0, 5 - Math.floor(responseTimeMs / 1000)) : 0
  const streakBonus = attemptNum === 1 ? 5 : 0
  return (base + speedBonus + streakBonus) * 2
}

export function PracticeQuizScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const submissionLayout = useStudentSubmissionLayout()
  const moduleContent = useModuleContentStyle()
  const [hydrating, setHydrating] = useState(() => getActivePracticeSession() == null)
  const [practiceSession, setPracticeSession] = useState<PracticeSessionData | null>(() => getActivePracticeSession())

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedLetter, setSelectedLetter] = useState("")
  const [selectedLetters, setSelectedLetters] = useState<string[]>([])
  const [textAnswer, setTextAnswer] = useState("")
  const [circuitAnswerJson, setCircuitAnswerJson] = useState(() => emptyCircuitSubmissionAnswer())
  const [multiPartAnswerJson, setMultiPartAnswerJson] = useState(() =>
    serializeMultiPartAnswer(emptyMultiPartAnswer([])),
  )
  const [showHint, setShowHint] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [submittingFinal, setSubmittingFinal] = useState(false)
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set())
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<number, string | string[]>>({})
  const [answerReviews, setAnswerReviews] = useState<Record<number, PracticeAnswerReview>>({})
  const [attemptCounts, setAttemptCounts] = useState<Record<number, number>>({})
  const [results, setResults] = useState<SubmitPracticeResult | null>(null)
  const questionStartRef = useRef<Record<number, number>>({})
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current != null) clearTimeout(advanceTimeoutRef.current)
    }
  }, [])

  const questions = practiceSession?.questions ?? []
  const attemptId = practiceSession?.attemptId ?? 0
  const currentQuestion = questions[currentIndex]
  const [answerFieldFocused, setAnswerFieldFocused] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const keyboardHeight = useKeyboardHeight()
  const keyboardOpen = keyboardHeight > 0

  const paintOptionTexts = useMemo(() => {
    if (!currentQuestion || currentQuestion.locked) return []
    if (
      isCircuitQuestion(currentQuestion) ||
      isCodeQuestion(currentQuestion) ||
      isTextInputQuestion(currentQuestion)
    ) {
      return []
    }
    if (isMultiPartQuestion(currentQuestion)) {
      return getGradableSubquestions(currentQuestion.subquestions).flatMap((sq) => [
        sq.prompt,
        ...subquestionOptionLabels(sq).map((option) => option.text),
      ])
    }
    return getQuestionOptions(asAssessmentQuestion(currentQuestion)).map((option) => option.text)
  }, [currentQuestion])

  const { ready: questionPaintReady, markReady: markQuestionPaintReady } = useQuestionPaintReady(
    currentQuestion?.id,
    countQuestionPaintTargets({
      promptText: currentQuestion?.question_text,
      optionTexts: paintOptionTexts,
    }),
  )
  const [initialPaintDone, setInitialPaintDone] = useState(false)

  useEffect(() => {
    if (!currentQuestion || !questionPaintReady) return
    setInitialPaintDone(true)
  }, [currentQuestion, questionPaintReady])

  const sessionPaintReady = initialPaintDone

  useEffect(() => {
    if (!keyboardOpen || !answerFieldFocused) return
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    }, 80)
    return () => clearTimeout(timer)
  }, [keyboardOpen, answerFieldFocused])

  const unlockedQuestions = useMemo(
    () => questions.filter((q) => !q.locked),
    [questions],
  )

  const firstUnlockedIndex = useMemo(() => {
    const idx = questions.findIndex((q) => !q.locked)
    return idx >= 0 ? idx : 0
  }, [questions])

  useEffect(() => {
    if (practiceSession) {
      setHydrating(false)
      return
    }
    let cancelled = false
    void hydrateActivePracticeSession().then((stored) => {
      if (cancelled) return
      if (stored) setPracticeSession(stored)
      setHydrating(false)
    })
    return () => {
      cancelled = true
    }
  }, [practiceSession])

  useEffect(() => {
    if (hydrating) return
    if (!practiceSession?.questions.length) {
      router.replace("/module/practice" as never)
    }
  }, [hydrating, practiceSession, router])

  useEffect(() => {
    if (currentQuestion && !questionStartRef.current[currentQuestion.id]) {
      questionStartRef.current[currentQuestion.id] = Date.now()
    }
  }, [currentQuestion])

  const progressPct = useMemo(() => {
    if (!unlockedQuestions.length) return 0
    const answeredUnlocked = unlockedQuestions.filter((q) => answeredIds.has(q.id)).length
    return Math.round((answeredUnlocked / unlockedQuestions.length) * 100)
  }, [answeredIds, unlockedQuestions])

  const allAnswered = useMemo(() => {
    if (!unlockedQuestions.length) return false
    return unlockedQuestions.every((q) => answeredIds.has(q.id))
  }, [answeredIds, unlockedQuestions])

  const restoreQuestionState = useCallback(
    (question: PracticeQuestion | undefined) => {
      if (!question) return

      const saved = answersByQuestion[question.id]
      const review = answerReviews[question.id]
      const qType = question.question_type.toLowerCase()
      const isMulti = isMultiSelectType(qType)

      if (isCircuitQuestion(question) && typeof saved === "string") {
        setCircuitAnswerJson(saved)
        setSelectedLetter("")
        setSelectedLetters([])
        setTextAnswer("")
      } else if (isMultiPartQuestion(question) && typeof saved === "string") {
        setMultiPartAnswerJson(saved)
        setSelectedLetter("")
        setSelectedLetters([])
        setTextAnswer("")
      } else if (Array.isArray(saved)) {
        setSelectedLetters(saved)
        setSelectedLetter("")
        setTextAnswer("")
      } else if (typeof saved === "string") {
        if (isMulti) {
          const sel = restoreSelectionFromSavedAnswer(asAssessmentQuestion(question), saved)
          setSelectedLetters(sel.letters)
          setSelectedLetter("")
          setTextAnswer("")
        } else if (isTextInputQuestion(question) || isCodeQuestion(question)) {
          setTextAnswer(saved)
          setSelectedLetter("")
          setSelectedLetters([])
        } else {
          const sel = restoreSelectionFromSavedAnswer(asAssessmentQuestion(question), saved)
          setSelectedLetter(sel.letter)
          setSelectedLetters([])
          setTextAnswer(sel.text)
        }
      } else {
        setSelectedLetter("")
        setSelectedLetters([])
        setTextAnswer("")
      }

      setShowHint(false)
      if (answeredIds.has(question.id)) {
        setShowFeedback(true)
        setIsCorrect(review?.isCorrect ?? false)
        setFeedbackText(
          practiceHubFeedbackSummary(
            review,
            review?.isCorrect ? "Correct!" : "Not quite — keep learning!",
          ),
        )
      } else {
        setShowFeedback(false)
        setIsCorrect(false)
        setFeedbackText("")
      }
    },
    [answersByQuestion, answerReviews, answeredIds],
  )

  useEffect(() => {
    if (questions.some((q) => q.locked) && currentQuestion?.locked) {
      const target = questions[firstUnlockedIndex]
      setCurrentIndex(firstUnlockedIndex)
      if (target) restoreQuestionState(target)
    }
  }, [questions, currentQuestion?.locked, firstUnlockedIndex, restoreQuestionState])

  useEffect(() => {
    if (questions.length > 0 && currentIndex >= 0 && currentIndex < questions.length) {
      restoreQuestionState(questions[currentIndex])
    }
  }, [currentIndex, questions, restoreQuestionState])

  useEffect(() => {
    if (!session || !attemptId || !questions.length || hydrating) return
    let cancelled = false
    void practiceApi.getAttemptState(session, attemptId).then((state) => {
      if (cancelled) return
      if (state.completedAt) {
        void clearActivePracticeSession()
        router.replace("/module/practice" as never)
        return
      }
      if (!Array.isArray(state.answers) || state.answers.length === 0) return

      const restoredAnswers: Record<number, string | string[]> = {}
      const restoredAnswered = new Set<number>()
      const restoredReviews: Record<number, PracticeAnswerReview> = {}

      for (const row of state.answers) {
        restoredAnswers[row.questionId] = row.studentAnswer
        restoredAnswered.add(row.questionId)
        const question = questions.find((q) => q.id === row.questionId)
        if (!question) continue

        const savedText = Array.isArray(row.studentAnswer)
          ? JSON.stringify(row.studentAnswer)
          : String(row.studentAnswer ?? "")
        const sel = restoreSelectionFromSavedAnswer(asAssessmentQuestion(question), savedText)
        const letters =
          sel.letters.length > 0
            ? sel.letters
            : Array.isArray(row.studentAnswer)
              ? row.studentAnswer.map(String)
              : []

        const review = resolveObjectiveAnswerReview({
          question,
          selectedLetters: letters,
          selectedLetter: sel.letter,
          serverReview: null,
          evalResult: { isCorrect: row.isCorrect },
        })
        if (review) restoredReviews[row.questionId] = review
      }

      setAnswersByQuestion((prev) => ({ ...prev, ...restoredAnswers }))
      setAnsweredIds((prev) => new Set([...prev, ...restoredAnswered]))
      setAnswerReviews((prev) => ({ ...prev, ...restoredReviews }))
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [session, attemptId, questions, hydrating, router])

  const goToIndex = (index: number) => {
    if (advanceTimeoutRef.current != null) {
      clearTimeout(advanceTimeoutRef.current)
      advanceTimeoutRef.current = null
      setSubmittingAnswer(false)
    }
    const target = questions[index]
    if (target?.locked) {
      AppAlert.alert(
        "Question locked",
        "Upgrade to Trailblazer to practice the rest of this topic.",
        [
          { text: "Not now", style: "cancel" },
          { text: "View plans", onPress: () => router.push("/membership" as never) },
        ],
      )
      return
    }
    setCurrentIndex(index)
    restoreQuestionState(questions[index])
  }

  const nextUnlockedIndex = (fromIndex: number): number | null => {
    for (let i = fromIndex + 1; i < questions.length; i += 1) {
      if (!questions[i]?.locked) return i
    }
    return null
  }

  const submitAnswer = async () => {
    if (
      !session ||
      !currentQuestion ||
      currentQuestion.locked ||
      submittingAnswer ||
      answeredIds.has(currentQuestion.id)
    ) {
      return
    }

    const isCircuit = isCircuitQuestion(currentQuestion)
    const isMultiPart = isMultiPartQuestion(currentQuestion)
    const isCode = isCodeQuestion(currentQuestion)
    const qType = currentQuestion.question_type.toLowerCase()
    const isMulti = isMultiSelectType(qType)
    const isText = isTextInputQuestion(currentQuestion) || isCode

    if (isCircuit) {
      const circuitConfig = parseCircuitSubmissionConfig(currentQuestion.solution_upload_config)
      if (!circuitSubmissionHasRequiredUpload(circuitAnswerJson, circuitConfig)) {
        AppAlert.alert(
          "Submission required",
          "Upload a file, take a photo, or draw in the workspace before submitting.",
        )
        return
      }
    } else if (isMultiPart) {
      const payload = parseMultiPartAnswerJson(multiPartAnswerJson, currentQuestion.subquestions)
      if (!multiPartAnswerReady(currentQuestion.subquestions, payload)) {
        AppAlert.alert("Incomplete", "Answer every part before submitting.")
        return
      }
    } else if (isMulti && selectedLetters.length === 0) {
      AppAlert.alert("Select answers", "Choose at least one option.")
      return
    } else if (!isMulti && !isText && !selectedLetter) {
      AppAlert.alert("Select an answer", "Choose an option before submitting.")
      return
    } else if (isText && !textAnswer.trim()) {
      AppAlert.alert("Enter an answer", "Type your answer before submitting.")
      return
    }

    const attemptNum = (attemptCounts[currentQuestion.id] ?? 0) + 1
    const startTime = questionStartRef.current[currentQuestion.id] ?? Date.now()
    const responseTimeMs = Date.now() - startTime
    const xpEarned = calcXp(currentQuestion.difficulty, responseTimeMs, attemptNum)

    setSubmittingAnswer(true)
    try {
      let answerToSubmit: string | string[]
      if (isCircuit) {
        answerToSubmit = await prepareCircuitAnswerForSubmit(session, {
          attemptId,
          questionId: currentQuestion.id,
          answerJson: circuitAnswerJson,
          questionTitle: practiceSession?.topic,
        })
      } else if (isMultiPart) {
        answerToSubmit = multiPartAnswerJson
      } else {
        answerToSubmit = buildAnswerForSubmit(
          asAssessmentQuestion(currentQuestion),
          selectedLetter,
          selectedLetters,
          textAnswer,
        )
      }

      const mcqEarnedFraction = resolvePracticeQuestionMcqEarnedFraction(
        currentQuestion,
        selectedLetter,
        selectedLetters,
      )

      const evalResult = await practiceApi.evaluate(session, {
        questionId: currentQuestion.id,
        answer: answerToSubmit,
        questionType: currentQuestion.question_type,
        attemptId,
        responseTimeMs,
        xpEarned,
        difficulty: currentQuestion.difficulty,
        ...(mcqEarnedFraction != null ? { mcqEarnedFraction } : {}),
      })
      invalidateByAction(getQueryClient(), studentQueryScope(session), "student.practice.evaluate")

      setAttemptCounts((prev) => ({ ...prev, [currentQuestion.id]: attemptNum }))
      setAnsweredIds((prev) => new Set(prev).add(currentQuestion.id))

      const evalMeta = {
        isCorrect: evalResult.isCorrect,
        score: evalResult.score,
        pointsEarned: evalResult.pointsEarned,
        maxPoints: evalResult.maxPoints ?? 1,
      }

      let review = resolveObjectiveAnswerReview({
        question: currentQuestion,
        selectedLetters,
        selectedLetter,
        serverReview: evalResult.answerReview ?? null,
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
        const programmedKey = programmedAnswerKeyFromReview(review, currentQuestion.question_type)
        if (programmedKey && !currentQuestion.correct_answer?.trim()) {
          setPracticeSession((prev) => {
            if (!prev) return prev
            const next: PracticeSessionData = {
              ...prev,
              questions: prev.questions.map((question) =>
                question.id === currentQuestion.id
                  ? { ...question, correct_answer: programmedKey }
                  : question,
              ),
            }
            void setActivePracticeSession(next)
            return next
          })
        }
      }

      setAnswersByQuestion((prev) => ({
        ...prev,
        [currentQuestion.id]:
          isCircuit || isMultiPart
            ? typeof answerToSubmit === "string"
              ? answerToSubmit
              : JSON.stringify(answerToSubmit)
            : isMulti
              ? [...selectedLetters]
              : selectedLetter || textAnswer || String(answerToSubmit),
      }))

      const verdictCorrect = review?.isCorrect ?? evalResult.isCorrect
      const partial = isEvalPartialCredit(
        { ...evalMeta, isCorrect: verdictCorrect },
        review,
      )
      setIsCorrect(verdictCorrect)
      setFeedbackText(
        evalResult.feedback ??
          (evalResult.requiresManualReview
            ? "Submission recorded for review."
            : practiceHubFeedbackSummary(
                review,
                partial
                  ? "Partial credit — some selections were correct."
                  : verdictCorrect
                    ? "Correct!"
                    : "Not quite — keep learning!",
                { ...evalMeta, isCorrect: verdictCorrect },
              )),
      )
      setShowFeedback(true)

      const delay = evalResult.aiGraded || evalResult.requiresManualReview ? 4000 : 2000
      if (advanceTimeoutRef.current != null) clearTimeout(advanceTimeoutRef.current)
      advanceTimeoutRef.current = setTimeout(() => {
        advanceTimeoutRef.current = null
        setShowFeedback(false)
        setSubmittingAnswer(false)
        const nextIndex = nextUnlockedIndex(currentIndex)
        if (nextIndex != null) {
          goToIndex(nextIndex)
        }
      }, delay)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        AppAlert.alert(
          "Question locked",
          err.message,
          [
            { text: "Not now", style: "cancel" },
            { text: "View plans", onPress: () => router.push("/membership" as never) },
          ],
        )
      } else {
        AppAlert.alert("Submission failed", err instanceof ApiError ? err.message : "Please try again.")
      }
      setSubmittingAnswer(false)
    }
  }

  const finishPractice = async () => {
    if (!session || !allAnswered) {
      AppAlert.alert("Incomplete", "Answer all unlocked questions before finishing.")
      return
    }
    setSubmittingFinal(true)
    try {
      const result = await practiceApi.submit(session, attemptId)
      invalidateByAction(getQueryClient(), studentQueryScope(session), "student.practice.submit")
      await clearActivePracticeSession()
      setResults(result)
    } catch (err) {
      AppAlert.alert("Could not finish", err instanceof ApiError ? err.message : "Please try again.")
    } finally {
      setSubmittingFinal(false)
    }
  }

  const prepareTexts = useMemo(
    () => (questions.length ? extractPracticeQuestionTexts(questions) : null),
    [questions],
  )

  if (!session) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: tokens.background }]}>
        <ActivityIndicator size="large" color={tokens.accent} />
      </View>
    )
  }

  if (results) {
    return (
      <View
        style={[
          styles.resultsRoot,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, backgroundColor: tokens.background },
        ]}
      >
        <View style={[styles.resultsCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Ionicons name="trophy" size={48} color={tokens.warning} />
          <Text style={[styles.resultsTitle, { color: tokens.text }]}>Practice complete!</Text>
          <Text style={[styles.resultsScore, { color: tokens.accent }]}>{results.score}%</Text>
          <Text style={[styles.resultsMeta, { color: SN.secondaryLabel }]}>
            {results.correctCount} of {results.totalQuestions} correct
          </Text>
          <Pressable
            style={[styles.primaryBtn, styles.resultsBtn, { backgroundColor: tokens.accent }]}
            onPress={() => router.replace("/module/practice" as never)}
          >
            <Text style={styles.primaryBtnText}>Back to Practice Hub</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  if (hydrating || !practiceSession || !currentQuestion) {
    return (
      <QuestionPrepareGate
        fetching={hydrating}
        texts={prepareTexts}
        title="Preparing practice"
        subtitle="Loading questions, math, and answer choices"
        enabled={hydrating || Boolean(practiceSession?.questions.length)}
        hideUntilReady
        paintReady={sessionPaintReady}
      >
        <View style={[styles.center, { paddingTop: insets.top, backgroundColor: tokens.background }]}>
          <ActivityIndicator size="large" color={tokens.accent} />
        </View>
      </QuestionPrepareGate>
    )
  }

  const assessmentQuestion = asAssessmentQuestion(currentQuestion)
  const options = getQuestionOptions(assessmentQuestion)
  const qType = currentQuestion.question_type.toLowerCase()
  const isCircuit = isCircuitQuestion(currentQuestion)
  const isMultiPart = isMultiPartQuestion(currentQuestion)
  const isCode = isCodeQuestion(currentQuestion)
  const isMulti = isMultiSelectType(qType)
  const isText = isTextInputQuestion(currentQuestion)
  const submitted = answeredIds.has(currentQuestion.id)
  const currentReview = answerReviews[currentQuestion.id] ?? null
  const isPartial = isEvalPartialCredit(
    {
      isCorrect: currentReview?.isCorrect,
      score: currentReview?.score,
      pointsEarned: currentReview?.pointsEarned,
      maxPoints: currentReview?.maxPoints ?? 1,
    },
    currentReview,
  )
  const tierLocked = currentQuestion.locked === true
  const circuitConfig = parseCircuitSubmissionConfig(currentQuestion.solution_upload_config)
  const circuitReady = circuitSubmissionHasRequiredUpload(circuitAnswerJson, circuitConfig)
  const multiPartPayload = parseMultiPartAnswerJson(multiPartAnswerJson, currentQuestion.subquestions)
  const multiPartReady = multiPartAnswerReady(currentQuestion.subquestions, multiPartPayload)
  const submitDisabled =
    tierLocked ||
    submitted ||
    submittingAnswer ||
    (isCircuit && !circuitReady) ||
    (isMultiPart && !multiPartReady)

  return (
    <QuestionPrepareGate
      fetching={false}
      texts={prepareTexts}
      title="Preparing practice"
      subtitle="Loading questions, math, and answer choices"
      enabled={Boolean(practiceSession.questions.length)}
      hideUntilReady
      paintReady={sessionPaintReady}
    >
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: tokens.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={tokens.accent} />
        </Pressable>
        <Text style={[styles.topTitle, { color: tokens.text }]} numberOfLines={1}>
          {practiceSession.topic}
        </Text>
        <Text style={[styles.topCounter, { color: SN.secondaryLabel }]}>
          {currentIndex + 1}/{questions.length}
          {unlockedQuestions.length < questions.length
            ? ` · ${unlockedQuestions.length} unlocked`
            : ""}
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: hexToRgba(tokens.border, 0.5) }]}>
        <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: tokens.accent }]} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          moduleContent,
          keyboardOpen && Platform.OS === "android" && { paddingBottom: keyboardHeight + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {keyboardOpen || !questionPaintReady ? null : (
        <View style={styles.questionNav}>
          {questions.map((q, i) => {
            const answered = answeredIds.has(q.id)
            const current = i === currentIndex
            const tierLocked = q.locked === true
            return (
              <Pressable
                key={q.id}
                testID={`practice-nav-${i + 1}`}
                accessibilityRole="button"
                accessibilityLabel={`Go to question ${i + 1}`}
                hitSlop={6}
                style={[
                  styles.navDot,
                  { backgroundColor: tokens.surface, borderColor: tokens.border },
                  answered && !current && {
                    backgroundColor: hexToRgba(tokens.success, 0.12),
                    borderColor: tokens.success,
                  },
                  current && {
                    borderColor: tokens.accent,
                    backgroundColor: hexToRgba(tokens.accent, 0.1),
                  },
                  tierLocked && {
                    backgroundColor: hexToRgba(tokens.warning, 0.08),
                    borderColor: hexToRgba(tokens.warning, 0.45),
                  },
                ]}
                onPress={() => goToIndex(i)}
              >
                {tierLocked ? (
                  <Ionicons name="lock-closed" size={14} color={tokens.warning} />
                ) : (
                  <Text
                    style={[
                      styles.navDotText,
                      { color: SN.secondaryLabel },
                      (current || answered) && { color: current ? tokens.accent : tokens.success },
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </Pressable>
            )
          })}
        </View>
        )}

        <View style={[styles.cardHost, !questionPaintReady && styles.cardHostPending]}>
        <View
          style={[
            styles.card,
            { backgroundColor: tokens.surface, borderColor: tokens.border },
            { opacity: questionPaintReady ? 1 : 0 },
          ]}
          pointerEvents={questionPaintReady ? "auto" : "none"}
        >
          <View style={styles.cardHeader}>
            <View style={styles.badges}>
              <View style={[styles.badge, { backgroundColor: tokens.accent }]}>
                <Text style={styles.badgeText}>{currentQuestion.difficulty}</Text>
              </View>
              <View style={[styles.badge, styles.badgeOutline, { borderColor: tokens.border }]}>
                <Text style={[styles.badgeTextOutline, { color: SN.secondaryLabel }]}>
                  {practiceQuestionBadge(currentQuestion)}
                </Text>
              </View>
            </View>
            {currentQuestion.hint ? (
              <Pressable onPress={() => setShowHint(!showHint)} hitSlop={8}>
                <Ionicons
                  name="bulb-outline"
                  size={22}
                  color={showHint ? tokens.warning : SN.secondaryLabel}
                />
              </Pressable>
            ) : null}
          </View>

          <QuestionMediaView media={parseQuestionMedia(currentQuestion.question_media)} embedded />

          <QuestionContentWebView
            text={currentQuestion.question_text}
            embedded
            onReady={() => markQuestionPaintReady("prompt")}
          />

          {showHint && currentQuestion.hint ? (
            <View
              style={[
                styles.hintBox,
                {
                  backgroundColor: semanticSoft(tokens.warning, tokens.isDark),
                  borderColor: hexToRgba(tokens.warning, tokens.isDark ? 0.34 : 0.24),
                },
              ]}
            >
              <QuestionContentWebView text={currentQuestion.hint} embedded compact />
            </View>
          ) : null}

          {tierLocked ? (
            <View style={[styles.lockedPanel, { borderColor: tokens.border, backgroundColor: tokens.background }]}>
              <Ionicons name="lock-closed-outline" size={28} color={tokens.warning} />
              <Text style={[styles.lockedTitle, { color: tokens.text }]}>Trailblazer question</Text>
              <Text style={[styles.lockedBody, { color: SN.secondaryLabel }]}>
                Upgrade to Trailblazer to unlock the rest of this topic and practice every question.
              </Text>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: tokens.accent, alignSelf: "stretch" }]}
                onPress={() => router.push("/membership" as never)}
              >
                <Text style={styles.primaryBtnText}>View plans</Text>
              </Pressable>
            </View>
          ) : isCircuit ? (
            <CircuitSubmissionPanel
              session={session}
              attemptId={attemptId}
              questionId={currentQuestion.id}
              value={circuitAnswerJson}
              onChange={setCircuitAnswerJson}
              config={currentQuestion.solution_upload_config}
              disabled={submitted || submittingAnswer}
              notesHeight={submissionLayout.notesHeight}
            />
          ) : isMultiPart ? (
            <MultiPartAnswerPanel
              subquestionsRaw={currentQuestion.subquestions}
              value={multiPartAnswerJson}
              onChange={setMultiPartAnswerJson}
              disabled={submitted || submittingAnswer}
              textFieldHeight={submissionLayout.multipartTextHeight}
              onReady={markQuestionPaintReady}
            />
          ) : isCode ? (
            <View style={styles.codeWrap}>
              <View style={[styles.codeToolbar, { borderColor: tokens.border, backgroundColor: tokens.background }]}>
                <Ionicons name="code-slash-outline" size={16} color={SN.secondaryLabel} />
                <Text style={[styles.codeLang, { color: SN.secondaryLabel }]}>CODE</Text>
              </View>
              <TextInput
                style={[
                  styles.codeInput,
                  {
                    borderColor: tokens.border,
                    backgroundColor: tokens.background,
                    color: tokens.text,
                    height: submissionLayout.codeFieldHeight,
                    minHeight: submissionLayout.codeFieldHeight,
                  },
                ]}
                value={textAnswer}
                onChangeText={setTextAnswer}
                onFocus={() => setAnswerFieldFocused(true)}
                onBlur={() => setAnswerFieldFocused(false)}
                placeholder="// Write your complete solution here…"
                placeholderTextColor={SN.secondaryLabel}
                editable={!submitted && !submittingAnswer}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />
              {qType === "code_write_plot" ? (
                <Text style={[styles.codeHint, { color: SN.secondaryLabel }]}>
                  Include plot output or describe the expected graph in comments if you cannot render it here.
                </Text>
              ) : null}
            </View>
          ) : isText ? (
            <TextInput
              style={[
                styles.textInput,
                qType === "fill_code" && styles.codeInput,
                {
                  borderColor: tokens.border,
                  backgroundColor: tokens.background,
                  color: tokens.text,
                  height:
                    qType === "fill_code"
                      ? submissionLayout.codeFieldHeight
                      : submissionLayout.textFieldHeight,
                  minHeight:
                    qType === "fill_code"
                      ? submissionLayout.codeFieldHeight
                      : submissionLayout.textFieldHeight,
                },
              ]}
              value={textAnswer}
              onChangeText={setTextAnswer}
              onFocus={() => setAnswerFieldFocused(true)}
              onBlur={() => setAnswerFieldFocused(false)}
              placeholder={
                qType === "fill_code"
                  ? "// Fill in the missing code…"
                  : qType === "code_output" || qType === "trace_output"
                    ? "Enter the output…"
                    : "Type your answer"
              }
              placeholderTextColor={SN.secondaryLabel}
              editable={!submitted && !submittingAnswer}
              multiline={qType !== "code_output" && qType !== "trace_output"}
              autoCapitalize={qType === "fill_code" ? "none" : "sentences"}
              autoCorrect={qType !== "fill_code"}
              spellCheck={qType !== "fill_code"}
            />
          ) : (
            <>
              {isMulti && !submitted ? (
                <Text style={[styles.selectAllHint, { color: SN.secondaryLabel }]}>
                  Select all that apply, then submit.
                </Text>
              ) : null}
              {options.map(({ letter, text }) => {
                const selected = isMulti ? selectedLetters.includes(letter) : selectedLetter === letter
                const reviewState =
                  submitted && currentReview
                    ? practiceAnswerReviewOptionState(currentReview, letter)
                    : null
                const showReview = reviewState != null
                const markColor = reviewState?.showWrongSelection
                  ? SYSTEM.red.color
                  : reviewState?.showPartialCreditSelection
                    ? SYSTEM.orange.color
                    : reviewState?.isCorrect
                      ? SYSTEM.green.color
                      : selected
                        ? tokens.accent
                        : SN.secondaryLabel

                return (
                  <Pressable
                    key={letter}
                    testID={`practice-option-${letter}`}
                    accessibilityRole={isMulti ? "checkbox" : "radio"}
                    accessibilityState={{
                      selected,
                      checked: isMulti ? selected : undefined,
                      disabled: submitted || submittingAnswer,
                    }}
                    accessibilityLabel={isMulti ? `Option ${letter}. ${text}` : `Option ${letter}`}
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
                      submitted && styles.optionLocked,
                    ]}
                    onPress={() => {
                      if (submitted || submittingAnswer) return
                      if (isMulti) {
                        setSelectedLetters((prev) =>
                          prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter],
                        )
                      } else {
                        setSelectedLetter(letter)
                      }
                    }}
                    disabled={submitted || submittingAnswer}
                  >
                    {isMulti ? (
                      <Ionicons
                        name={selected ? "checkbox" : "square-outline"}
                        size={24}
                        color={markColor}
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
                        onReady={() => markQuestionPaintReady(`option-${letter}`)}
                      />
                    </View>
                    {!isMulti && selected && !showReview ? (
                      <Ionicons name="checkmark-circle" size={20} color={markColor} />
                    ) : reviewState?.showWrongSelection ? (
                      <Ionicons name="close-circle" size={20} color={markColor} />
                    ) : reviewState?.isCorrect ? (
                      <Ionicons name="checkmark-circle" size={20} color={markColor} />
                    ) : null}
                  </Pressable>
                )
              })}
            </>
          )}

          {showFeedback ? (
            <View
              style={[
                styles.feedbackBox,
                {
                  backgroundColor: semanticSoft(
                    isCorrect ? tokens.success : isPartial ? tokens.warning : tokens.danger,
                    tokens.isDark,
                  ),
                },
              ]}
            >
              <Ionicons
                name={isCorrect ? "checkmark-circle" : isPartial ? "alert-circle" : "close-circle"}
                size={20}
                color={isCorrect ? tokens.success : isPartial ? tokens.warning : tokens.danger}
              />
              <View style={styles.feedbackCopy}>
                <QuestionContentWebView text={feedbackText} embedded compact />
              </View>
            </View>
          ) : null}
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

      {keyboardOpen || !questionPaintReady ? null : (
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: tokens.background }]}>
        {allAnswered ? (
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: tokens.accent }, submittingFinal && styles.btnDisabled]}
            onPress={() => void finishPractice()}
            disabled={submittingFinal}
          >
            {submittingFinal ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Finish practice</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: tokens.accent }, submitDisabled && styles.btnDisabled]}
            onPress={() => void submitAnswer()}
            disabled={submitDisabled}
          >
            {submittingAnswer ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>{submitted ? "Answer submitted" : "Submit answer"}</Text>
            )}
          </Pressable>
        )}
      </View>
      )}
      </KeyboardAvoidingView>
    </View>
    </QuestionPrepareGate>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "600" },
  topCounter: { fontSize: 14, fontWeight: "600" },
  progressTrack: { height: 4, marginHorizontal: 16 },
  progressFill: { height: "100%" },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  cardHost: { position: "relative" },
  cardHostPending: { minHeight: 280 },
  cardPaintOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  cardPaintText: { fontSize: 14, fontWeight: "600" },
  questionNav: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  navDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navDotText: { fontSize: 12, fontWeight: "700" },
  lockedPanel: {
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
  },
  lockedTitle: { fontSize: 17, fontWeight: "600" },
  lockedBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOutline: { backgroundColor: "transparent", borderWidth: 1 },
  badgeText: { color: "#ffffff", fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  badgeTextOutline: { fontSize: 11, fontWeight: "600" },
  hintBox: { borderRadius: 10, padding: 10, borderWidth: 1 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  codeWrap: { gap: 8 },
  codeToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  codeLang: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  codeInput: {
    fontFamily: "Menlo",
    fontSize: 13,
    minHeight: 180,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  codeHint: { fontSize: 12, lineHeight: 17 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  selectAllHint: { fontSize: 13, lineHeight: 18, marginBottom: 2 },
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
  feedbackBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  feedbackCopy: { flex: 1, minWidth: 0 },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 18 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  primaryBtn: {
    borderRadius: 999,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    textAlign: "center",
  },
  resultsRoot: { flex: 1, paddingHorizontal: 20, justifyContent: "center" },
  resultsCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  resultsBtn: {
    alignSelf: "stretch",
    marginTop: 8,
  },
  resultsTitle: { fontSize: 22, fontWeight: "600" },
  resultsScore: { fontSize: 48, fontWeight: "600" },
  resultsMeta: { fontSize: 15 },
})
