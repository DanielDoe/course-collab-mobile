import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { semanticSoft, useThemedStudentNative } from "../../lib/themed-module-theme"
import { useSession } from "../../context/SessionProvider"
import { practiceApi, type SubmitPracticeResult } from "../../lib/practice-api"
import {
  buildAnswerForSubmit,
  getQuestionOptions,
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
import { resolvePracticeQuestionMcqEarnedFraction } from "../../lib/practice-mcq-earned-fraction"
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
  const [attemptCounts, setAttemptCounts] = useState<Record<number, number>>({})
  const [results, setResults] = useState<SubmitPracticeResult | null>(null)
  const questionStartRef = useRef<Record<number, number>>({})

  const questions = practiceSession?.questions ?? []
  const attemptId = practiceSession?.attemptId ?? 0
  const currentQuestion = questions[currentIndex]

  const unlockedQuestions = useMemo(
    () => questions.filter((q) => !q.locked),
    [questions],
  )

  const firstUnlockedIndex = useMemo(() => {
    const idx = questions.findIndex((q) => !q.locked)
    return idx >= 0 ? idx : 0
  }, [questions])

  useEffect(() => {
    if (questions.some((q) => q.locked) && currentQuestion?.locked) {
      setCurrentIndex(firstUnlockedIndex)
    }
  }, [questions, currentQuestion?.locked, firstUnlockedIndex])

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

  const resetSelection = useCallback((question: PracticeQuestion | undefined) => {
    setSelectedLetter("")
    setSelectedLetters([])
    setTextAnswer("")
    setCircuitAnswerJson(emptyCircuitSubmissionAnswer())
    setMultiPartAnswerJson(
      serializeMultiPartAnswer(emptyMultiPartAnswer(question?.subquestions ?? [])),
    )
    setShowHint(false)
    setShowFeedback(false)
    if (question) {
      questionStartRef.current[question.id] = Date.now()
    }
  }, [])

  const goToIndex = (index: number) => {
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
    resetSelection(questions[index])
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

      setAttemptCounts((prev) => ({ ...prev, [currentQuestion.id]: attemptNum }))
      setAnsweredIds((prev) => new Set(prev).add(currentQuestion.id))
      setIsCorrect(evalResult.isCorrect)
      setFeedbackText(
        evalResult.feedback ??
          (evalResult.requiresManualReview
            ? "Submission recorded for review."
            : evalResult.isCorrect
              ? "Correct!"
              : "Not quite — keep learning!"),
      )
      setShowFeedback(true)

      const delay = evalResult.aiGraded || evalResult.requiresManualReview ? 4000 : 2000
      setTimeout(() => {
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
            style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
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
    >
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: tokens.background }]}>
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

      <ScrollView contentContainerStyle={[styles.content, moduleContent]} showsVerticalScrollIndicator={false}>
        <View style={styles.questionNav}>
          {questions.map((q, i) => {
            const answered = answeredIds.has(q.id)
            const current = i === currentIndex
            const tierLocked = q.locked === true
            return (
              <Pressable
                key={q.id}
                style={[
                  styles.navDot,
                  { backgroundColor: tokens.surface, borderColor: tokens.border },
                  current && {
                    borderColor: tokens.accent,
                    backgroundColor: hexToRgba(tokens.accent, 0.1),
                  },
                  answered && {
                    backgroundColor: hexToRgba(tokens.success, 0.12),
                    borderColor: tokens.success,
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

        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
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

          <QuestionContentWebView text={currentQuestion.question_text} embedded />

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
                    <QuestionContentWebView text={text} embedded compact />
                  </View>
                  {selected ? (
                    <Ionicons
                      name={isMulti ? "checkbox" : "checkmark-circle"}
                      size={20}
                      color={tokens.accent}
                    />
                  ) : isMulti ? (
                    <Ionicons name="square-outline" size={20} color={SN.secondaryLabel} />
                  ) : null}
                </Pressable>
              )
            })
          )}

          {showFeedback ? (
            <View
              style={[
                styles.feedbackBox,
                {
                  backgroundColor: semanticSoft(
                    isCorrect ? tokens.success : tokens.danger,
                    tokens.isDark,
                  ),
                },
              ]}
            >
              <Ionicons
                name={isCorrect ? "checkmark-circle" : "close-circle"}
                size={20}
                color={isCorrect ? tokens.success : tokens.danger}
              />
              <View style={styles.feedbackCopy}>
                <QuestionContentWebView text={feedbackText} embedded compact />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

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
    paddingVertical: 16,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  resultsRoot: { flex: 1, paddingHorizontal: 20, justifyContent: "center" },
  resultsCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  resultsTitle: { fontSize: 22, fontWeight: "600" },
  resultsScore: { fontSize: 48, fontWeight: "600" },
  resultsMeta: { fontSize: 15 },
})
