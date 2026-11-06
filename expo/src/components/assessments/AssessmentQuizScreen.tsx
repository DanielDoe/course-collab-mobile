import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { isMultiSelectType } from "../../lib/practice-session"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"
import { parseQuestionMedia } from "../../lib/classroom-submission"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { QuestionPrepareGate } from "../questions/QuestionPrepareGate"
import { useAssessmentFocusGuard } from "../../hooks/useAssessmentFocusGuard"
import { extractAssessmentQuizQuestionTexts } from "../../lib/question-prepare"
import { assessmentQuizApi } from "../../lib/assessment-quiz/assessment-quiz-api"
import {
  buildAnswerForSubmit,
  getQuestionOptions,
  isCircuitSubmissionQuestion,
  isUnsupportedQuestion,
  restoreSelectionFromSavedAnswer,
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
import { normalizeAssessmentType } from "../../lib/assessment-quiz/normalize-assessment-type"
import type {
  AssessmentQuestion,
  AssessmentQuizSession,
  SavedAnswer,
} from "../../lib/assessment-quiz/assessment-quiz-types"
import { formatAssessmentType } from "./assessment-config"
import { formatExamClock, resolveExamWideTimerSeconds } from "../../lib/assessment-quiz/exam-wide-timer"
import { exitAssessmentQuiz, openAssessmentResults } from "./assessment-navigation"
import { AssessmentAskCoraSheet, canAskCoraOnQuestion } from "./AssessmentAskCoraSheet"
import type { AssessmentTakeAction } from "../../constants/module-web-paths"
import { WaterBreakDurationDialog, WaterBreakOverlay } from "../flashcards/FlashcardWaterBreak"
import { useModuleContentStyle } from "../../lib/responsive-layout"
import { useStudentSubmissionLayout } from "../../lib/circuit-submission-layout"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type Props = {
  quizId: number
  assessmentType: string
  takeAction: AssessmentTakeAction
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
  const [coraOpen, setCoraOpen] = useState(false)
  const [showContinueLaterModal, setShowContinueLaterModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [waterBreakPickerOpen, setWaterBreakPickerOpen] = useState(false)
  const [waterBreakActive, setWaterBreakActive] = useState(false)
  const [waterBreakSeconds, setWaterBreakSeconds] = useState(0)
  const [examRemaining, setExamRemaining] = useState<number | null>(null)
  const examRemainingRef = useRef<number | null>(null)
  const examExpiredRef = useRef(false)

  const [selectedLetter, setSelectedLetter] = useState("")
  const [selectedLetters, setSelectedLetters] = useState<string[]>([])
  const [textAnswer, setTextAnswer] = useState("")
  const [circuitAnswerJson, setCircuitAnswerJson] = useState(() => emptyCircuitSubmissionAnswer())
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [submittingFinal, setSubmittingFinal] = useState(false)
  const [savingLater, setSavingLater] = useState(false)
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set())
  const questionStartRef = useRef<Record<number, number>>({})

  const questions = quizSession?.questions ?? []
  const currentQuestion = questions[currentIndex]

  const bootstrap = useCallback(async () => {
    if (!session || !Number.isFinite(quizId)) return

    setLoading(true)
    setLoadError(null)

    try {
      const start = await assessmentQuizApi.startQuiz(session, {
        quizId,
        forceRestart: takeAction === "retake",
      })

      if (start.inWaitingList) {
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
      const examTotal = resolveExamWideTimerSeconds(take.quiz.section_config, assessmentType)
      let nextExamRemaining = examTotal

      const restored = new Set<number>()
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
            if (row.answer?.trim()) restored.add(row.questionId)
          }
          setSavedAnswersByQuestion(savedMap)

          if (typeof state.currentQuestionIndex === "number" && state.currentQuestionIndex >= 0) {
            resumeIndex = Math.min(state.currentQuestionIndex, take.questions.length - 1)
          }

          const savedExam = state.sectionTimeRemaining?.["-1"]
          if (typeof savedExam === "number" && savedExam >= 0) {
            nextExamRemaining = savedExam
          }

          const submitted = state.submittedQuestionIds ?? state.answeredQuestionIds ?? []
          for (const qid of submitted) restored.add(Number(qid))

          setAnsweredIds(restored)
          setCurrentIndex(resumeIndex)
          applySavedSelection(take.questions[resumeIndex], savedMap.get(take.questions[resumeIndex]?.id))
        } catch {
          /* resume metadata optional */
        }
      }

      if (take.questions[resumeIndex]) {
        questionStartRef.current[take.questions[resumeIndex].id] = Date.now()
      }
      setExamRemaining(nextExamRemaining)
      examRemainingRef.current = nextExamRemaining
      examExpiredRef.current = false
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load assessment.")
    } finally {
      setLoading(false)
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

  useEffect(() => {
    examRemainingRef.current = examRemaining
  }, [examRemaining])

  useEffect(() => {
    if (examRemaining == null || waterBreakActive || submittingFinal) return
    const id = setInterval(() => {
      setExamRemaining((prev) => (prev == null ? prev : Math.max(0, prev - 1)))
    }, 1000)
    return () => clearInterval(id)
  }, [examRemaining != null, waterBreakActive, submittingFinal])

  // Anti-cheat: task-switching out of the app mid-attempt is logged against the attempt.
  useAssessmentFocusGuard({
    session,
    attemptId: quizSession?.attemptId ?? null,
    enabled: Boolean(quizSession) && !submittingFinal,
  })

  const applySavedSelection = (question: AssessmentQuestion | undefined, saved?: SavedAnswer) => {
    resetSelection(question)
    if (!question || !saved?.answer) return
    if (isCircuitSubmissionQuestion(question)) {
      setCircuitAnswerJson(saved.answer)
      return
    }
    if (isUnsupportedQuestion(question)) return
    const sel = restoreSelectionFromSavedAnswer(question, saved.answer)
    setSelectedLetter(sel.letter)
    setSelectedLetters(sel.letters)
    setTextAnswer(sel.text)
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
    setCircuitAnswerJson(emptyCircuitSubmissionAnswer())
    setShowFeedback(false)
    if (question) {
      questionStartRef.current[question.id] = Date.now()
    }
  }, [])

  const leaveQuiz = useCallback(() => {
    exitAssessmentQuiz(router, { quizId, assessmentType })
  }, [router, quizId, assessmentType])

  const goToIndex = async (index: number) => {
    if (!session || !quizSession || index < 0 || index >= questions.length) return
    try {
      await persistDraftAnswer()
    } catch {
      /* draft save is best-effort */
    }
    setCurrentIndex(index)
    applySavedSelection(questions[index], savedAnswersByQuestion.get(questions[index]?.id))
    setShowQuestionNav(false)

    try {
      await assessmentQuizApi.saveProgress(session, {
        attemptId: quizSession.attemptId,
        currentQuestionIndex: index,
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

  const submitAnswer = async () => {
    if (!session || !quizSession || !currentQuestion || submittingAnswer) return
    if (answeredIds.has(currentQuestion.id)) return
    if (isUnsupportedQuestion(currentQuestion)) return

    const qType = currentQuestion.question_type.toLowerCase()
    const isCircuit = isCircuitSubmissionQuestion(currentQuestion)
    const isMulti = isMultiSelectType(qType)
    const isFillBlank =
      qType === "fill_blank" || qType === "fill_in_blank" || qType === "short_answer"
    const isTextType = isFillBlank || qType === "code_output" || qType === "trace_output"

    if (isCircuit) {
      if (!circuitSubmissionHasRequiredUpload(circuitAnswerJson, parseCircuitSubmissionConfig(currentQuestion.solution_upload_config))) {
        AppAlert.alert(
          "Submission required",
          "Upload a file, take a photo, or draw in the workspace before submitting.",
        )
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
      } else {
        answerToSubmit = buildAnswerForSubmit(
          currentQuestion,
          selectedLetter,
          selectedLetters,
          textAnswer,
        )
      }

      await assessmentQuizApi.saveAnswer(session, {
        attemptId: quizSession.attemptId,
        questionId: currentQuestion.id,
        answer: answerToSubmit,
        questionType: currentQuestion.question_type,
        timeSpentSeconds,
      })

      const evalResult = await assessmentQuizApi.submitAnswer(session, quizSession.apiType, {
        attemptId: quizSession.attemptId,
        questionId: currentQuestion.id,
        answer: answerToSubmit,
        questionType: currentQuestion.question_type,
        timeSpentSeconds,
      })

      setAnsweredIds((prev) => new Set(prev).add(currentQuestion.id))
      setIsCorrect(!!evalResult.isCorrect)
      setFeedbackText(
        evalResult.feedback ??
          (evalResult.requiresManualReview
            ? "Submission recorded for review."
            : evalResult.isCorrect
              ? "Correct!"
              : "Answer recorded."),
      )
      setShowFeedback(true)

      const delay = evalResult.aiGraded || evalResult.requiresManualReview ? 2500 : 1200
      setTimeout(() => {
        setShowFeedback(false)
        setSubmittingAnswer(false)
        if (currentIndex < questions.length - 1) {
          void goToIndex(currentIndex + 1)
        }
      }, delay)
    } catch (err) {
      AppAlert.alert("Submission failed", err instanceof ApiError ? err.message : "Please try again.")
      setSubmittingAnswer(false)
    }
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

  useEffect(() => {
    if (examRemaining !== 0 || examExpiredRef.current || !quizSession || submittingFinal) return
    examExpiredRef.current = true
    void doFinalize()
  }, [examRemaining, quizSession, submittingFinal])

  useEffect(() => {
    if (!session || !quizSession || examRemaining == null || waterBreakActive) return
    const id = setInterval(() => {
      const left = examRemainingRef.current
      if (left == null) return
      void assessmentQuizApi
        .saveProgress(session, {
          attemptId: quizSession.attemptId,
          currentQuestionIndex: currentIndex,
          sectionTimeRemaining: { "-1": left },
        })
        .catch(() => {
          /* progress save is best-effort */
        })
    }, 15000)
    return () => clearInterval(id)
  }, [session, quizSession, examRemaining != null, waterBreakActive, currentIndex])

  const persistDraftAnswer = async () => {
    if (!session || !quizSession || !currentQuestion || answeredIds.has(currentQuestion.id)) return
    if (isUnsupportedQuestion(currentQuestion)) return

    const qType = currentQuestion.question_type.toLowerCase()
    if (isCircuitSubmissionQuestion(currentQuestion)) {
      const parsed = parseCircuitSubmissionAnswer(circuitAnswerJson)
      const draft = compactCircuitSubmissionForAutoSave(parsed)
      if (!draft || draft === emptyCircuitSubmissionAnswer()) return
      await assessmentQuizApi.saveAnswer(session, {
        attemptId: quizSession.attemptId,
        questionId: currentQuestion.id,
        answer: draft,
        questionType: currentQuestion.question_type,
        autoSave: true,
      })
      return
    }

    const isMulti = isMultiSelectType(qType)
    const hasDraft =
      (isMulti && selectedLetters.length > 0) || selectedLetter || textAnswer.trim()
    if (!hasDraft) return

    const draft = buildAnswerForSubmit(
      currentQuestion,
      selectedLetter,
      selectedLetters,
      textAnswer,
    )
    await assessmentQuizApi.saveAnswer(session, {
      attemptId: quizSession.attemptId,
      questionId: currentQuestion.id,
      answer: draft,
      questionType: currentQuestion.question_type,
      autoSave: true,
    })
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
        <View style={[styles.errorRoot, { paddingBottom: insets.bottom + 16 }]}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.danger} />
          <Text style={[styles.errorTitle, { color: tokens.text }]}>{loadError}</Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: tokens.accent }]} onPress={leaveQuiz}>
            <Text style={styles.primaryBtnText}>Go back</Text>
          </Pressable>
          <Pressable onPress={() => void bootstrap()} hitSlop={8}>
            <Text style={[styles.retryLink, { color: tokens.accent }]}>Try again</Text>
          </Pressable>
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
  const isMulti = isMultiSelectType(qType)
  const isTextInput =
    !isUnsupported &&
    !isCircuit &&
    (qType === "fill_blank" ||
      qType === "fill_in_blank" ||
      qType === "short_answer" ||
      qType === "code_output" ||
      qType === "trace_output")
  const locked = answeredIds.has(currentQuestion.id)
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

      <QuestionContentWebView text={currentQuestion.question_text} embedded secure />
    </>
  )

  const feedbackBlock = showFeedback ? (
    <View style={[styles.feedbackBox, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
      <Ionicons
        name={isCorrect ? "checkmark-circle" : "information-circle"}
        size={20}
        color={isCorrect ? "#15803d" : "#b45309"}
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
      notesHeight={submissionLayout.notesHeight}
    />
  )

  const askCora = canAskCoraOnQuestion(currentQuestion.question_type, currentQuestion.subquestions)

  return (
    <QuestionPrepareGate
      fetching={false}
      texts={prepareTexts}
      title={`Preparing ${formatAssessmentType(assessmentType)}`}
      subtitle="Loading questions, math, and answer choices"
      enabled={Boolean(quizSession.questions.length)}
    >
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <NotetakerScreenHeader
        title={title}
        onBackPress={handleExitPress}
        fallbackHref={`/assessment/${quizId}?type=${assessmentType}`}
        rightSlot={
          <View style={styles.headerMeta}>
            {examRemaining != null ? (
              <Text
                style={[
                  styles.headerClock,
                  { color: examRemaining <= 300 ? "#b45309" : SN.secondaryLabel },
                ]}
              >
                {formatExamClock(examRemaining)}
              </Text>
            ) : null}
            <Text style={[styles.headerCounter, { color: SN.secondaryLabel }]}>
              {currentIndex + 1}/{questions.length}
            </Text>
          </View>
        }
      />

      <View style={[styles.progressTrack, { backgroundColor: hexToRgba(tokens.border, 0.5) }]}>
        <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: tokens.accent }]} />
      </View>

      {/* Control bar: Navigator · Water break · Continue Later · Exit */}
      <View style={[styles.controlBar, moduleContent, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
        <Pressable
          style={[
            styles.controlBtn,
            { borderColor: tokens.border },
            showQuestionNav && { borderColor: tokens.accent, backgroundColor: hexToRgba(tokens.accent, 0.1) },
          ]}
          onPress={() => setShowQuestionNav((v) => !v)}
        >
          <Ionicons name="grid-outline" size={16} color={showQuestionNav ? tokens.accent : SN.secondaryLabel} />
          <Text style={[styles.controlBtnText, { color: showQuestionNav ? tokens.accent : tokens.text }]}>
            Nav
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.controlBtn,
            {
              borderColor: hexToRgba("#0d9488", 0.4),
              backgroundColor: hexToRgba("#0d9488", 0.08),
              opacity: waterBreakActive ? 0.5 : 1,
            },
          ]}
          onPress={() => setWaterBreakPickerOpen(true)}
          disabled={waterBreakActive}
          accessibilityLabel="Water break"
        >
          <Ionicons name="water-outline" size={16} color="#0d9488" />
          <Text style={[styles.controlBtnText, { color: "#0d9488" }]}>Break</Text>
        </Pressable>

        <Pressable
          style={[styles.controlBtn, { borderColor: hexToRgba(tokens.accent, 0.35), backgroundColor: hexToRgba(tokens.accent, 0.06) }]}
          onPress={handleContinueLaterPress}
        >
          <Ionicons name="pause-circle-outline" size={16} color={tokens.accent} />
          <Text style={[styles.controlBtnText, { color: tokens.accent }]}>Later</Text>
        </Pressable>

        {askCora ? (
          <Pressable
            style={[
              styles.controlBtn,
              {
                borderColor: coraOpen ? tokens.accent : tokens.border,
                backgroundColor: coraOpen ? hexToRgba(tokens.accent, 0.12) : tokens.surface,
              },
            ]}
            onPress={() => setCoraOpen(true)}
            accessibilityLabel="Ask Cora"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={tokens.accent} />
            <Text style={[styles.controlBtnText, { color: tokens.accent }]}>Cora</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.controlBtn, styles.controlBtnDanger, { borderColor: hexToRgba(tokens.danger, 0.4), backgroundColor: hexToRgba(tokens.danger, 0.08) }]}
          onPress={handleExitPress}
        >
          <Ionicons name="exit-outline" size={16} color={tokens.danger} />
          <Text style={[styles.controlBtnText, { color: tokens.danger }]}>Quit</Text>
        </Pressable>
      </View>

      {/* Collapsible question navigator */}
      {showQuestionNav ? (
        <View style={[styles.navPanel, moduleContent, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.navPanelHeader}>
            <Text style={[styles.navPanelTitle, { color: tokens.text }]}>Questions</Text>
            <Text style={[styles.navPanelMeta, { color: SN.secondaryLabel }]}>
              {answeredIds.size} answered · {unansweredCount} left
            </Text>
          </View>
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
        contentContainerStyle={[styles.content, moduleContent]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          {questionPrompt}

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
              onChangeText={setTextAnswer}
              placeholder="Type your answer"
              placeholderTextColor={SN.secondaryLabel}
              editable={!locked && !submittingAnswer}
              multiline={qType !== "code_output" && qType !== "trace_output"}
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : (
            options.map(({ letter, text }) => {
              const selected = isMulti ? selectedLetters.includes(letter) : selectedLetter === letter
              return (
                <Pressable
                  key={letter}
                  style={[
                    styles.option,
                    { borderColor: tokens.border, backgroundColor: tokens.background },
                    selected && {
                      borderColor: tokens.accent,
                      backgroundColor: hexToRgba(tokens.accent, 0.06),
                    },
                    locked && styles.optionLocked,
                  ]}
                  onPress={() => {
                    if (locked || submittingAnswer) return
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
                  <View
                    style={[
                      styles.optionLetter,
                      { backgroundColor: tokens.surface, borderColor: tokens.border },
                      selected && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLetterText,
                        { color: SN.secondaryLabel },
                        selected && styles.optionLetterTextSelected,
                      ]}
                    >
                      {letter}
                    </Text>
                  </View>
                  <View style={styles.optionTextWrap}>
                    <QuestionContentWebView text={text} embedded compact secure />
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color={tokens.accent} /> : null}
                </Pressable>
              )
            })
          )}

          {feedbackBlock}
        </View>
      </ScrollView>

      {/* Footer: Previous · Next · Submit */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: tokens.background, borderTopColor: tokens.border }]}>
        <View style={[styles.footerInner, moduleContent]}>
        <View style={styles.footerNavRow}>
          <Pressable
            style={[styles.navBtn, { borderColor: tokens.border }, !canGoPrevious && styles.btnDisabled]}
            onPress={goToPrevious}
            disabled={!canGoPrevious || submittingAnswer}
          >
            <Ionicons name="chevron-back" size={18} color={canGoPrevious ? tokens.text : SN.secondaryLabel} />
            <Text style={[styles.navBtnText, { color: canGoPrevious ? tokens.text : SN.secondaryLabel }]}>
              Previous
            </Text>
          </Pressable>

          <Pressable
            style={[styles.navBtn, { borderColor: tokens.border }, !canGoNext && styles.btnDisabled]}
            onPress={goToNext}
            disabled={!canGoNext || submittingAnswer}
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
              (locked || submittingAnswer || (isCircuit && !circuitReady)) && styles.btnDisabled,
            ]}
            onPress={() => void submitAnswer()}
            disabled={locked || submittingAnswer || (isCircuit && !circuitReady)}
          >
            {submittingAnswer ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>{locked ? "Answer submitted" : "Submit answer"}</Text>
            )}
          </Pressable>
        ) : null}
        </View>
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

      {askCora && session ? (
        <AssessmentAskCoraSheet
          key={currentQuestion.id}
          visible={coraOpen}
          onClose={() => setCoraOpen(false)}
          session={session}
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          quizId={quizId}
          attemptId={quizSession.attemptId}
        />
      ) : null}

      {/* Quit modal */}
      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowExitModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]} onPress={() => {}}>
            <View style={[styles.modalIconWrap, { backgroundColor: hexToRgba(tokens.danger, 0.12) }]}>
              <Ionicons name="exit-outline" size={28} color={tokens.danger} />
            </View>
            <Text style={[styles.modalTitle, { color: tokens.text }]}>Quit assessment?</Text>
            <Text style={[styles.modalBody, { color: SN.secondaryLabel }]}>
              Your answers are saved as you go. You can return and continue from where you left off.
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  errorRoot: { flex: 1, paddingHorizontal: 24, alignItems: "center", justifyContent: "center", gap: 16 },
  errorTitle: { fontSize: 16, textAlign: "center", lineHeight: 22 },
  retryLink: { fontSize: 15, fontWeight: "600", marginTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600" },
  headerMeta: { alignItems: "flex-end", gap: 2 },
  headerClock: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  headerCounter: { fontSize: 14, fontWeight: "600" },
  progressTrack: { height: 3, marginHorizontal: 16 },
  progressFill: { height: "100%" },
  controlBar: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    padding: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  controlBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 36,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  controlBtnDanger: {},
  controlBtnText: { fontSize: 11, fontWeight: "600" },
  navPanel: {
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  navPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  navPanelTitle: { fontSize: 14, fontWeight: "600" },
  navPanelMeta: { fontSize: 11, fontWeight: "500" },
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
  feedbackBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  feedbackCorrect: { backgroundColor: "#dcfce7" },
  feedbackWrong: { backgroundColor: "#fef3c7" },
  feedbackCopy: { flex: 1, minWidth: 0 },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 18, color: "#0f172a" },
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
    borderRadius: 12,
    minHeight: 46,
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
