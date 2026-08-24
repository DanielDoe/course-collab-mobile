import { useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { SYSTEM, NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { ApiError } from "../../lib/api"
import { studentApi } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import type {
  LectureSamplePracticeAttempt,
  LectureSamplePracticeEvaluateResult,
  LectureSamplePracticeQuestion,
} from "../../lib/lecture-types"
import {
  initialSamplePracticeSelection,
  normalizeSamplePracticeSelectAllResult,
  resolveMcqEarnedFractionForSubmission,
  samplePracticeEngagementPointsMessage,
  samplePracticeOptionReviewState,
  samplePracticeResultSummary,
  selectedLettersFromSavedAnswer,
  subquestionOptionLabels,
} from "../../lib/lecture-sample-practice-grading"
import { samplePracticeQuestionToImportedProblem } from "../../lib/cora-problem"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"
import { CoraSolveButton } from "../cora/CoraSolveButton"
import { StudentSamplePracticeCoraChatModal } from "./StudentSamplePracticeCoraChatModal"

const ACCENTS = [SYSTEM.blue, SYSTEM.purple, SYSTEM.teal, SYSTEM.orange] as const

type Props = {
  session: StudentSession
  lectureId: number
  studentDatabaseId: string
  courseLabel: string
  question: LectureSamplePracticeQuestion
  index: number
  expanded: boolean
  reviewed: boolean
  savedAttempt?: LectureSamplePracticeAttempt | null
  onToggle: () => void
  onReviewed: () => void
}

export function StudentLectureSamplePracticeQuestionCard({
  session,
  lectureId,
  studentDatabaseId,
  courseLabel,
  question,
  index,
  expanded,
  reviewed,
  savedAttempt,
  onToggle,
  onReviewed,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const accent = ACCENTS[index % ACCENTS.length] ?? SYSTEM.blue
  const isSelectAll = question.question_type === "select_all"

  const options = subquestionOptionLabels({ options: question.options })

  const [selected, setSelected] = useState<string | string[]>(() =>
    initialSamplePracticeSelection(savedAttempt?.student_answer, question.question_type),
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitted, setSubmitted] = useState(() => Boolean(savedAttempt?.result))
  const [result, setResult] = useState<LectureSamplePracticeEvaluateResult | null>(() => {
    const raw = savedAttempt?.result ?? null
    if (!raw) return null
    return normalizeSamplePracticeSelectAllResult(
      raw,
      question,
      selectedLettersFromSavedAnswer(savedAttempt?.student_answer),
    )
  })
  const [engagementRecorded, setEngagementRecorded] = useState(() => Boolean(savedAttempt?.result))
  const [pointsSynced, setPointsSynced] = useState(false)
  const [engagementPointsEarned, setEngagementPointsEarned] = useState<number | undefined>(undefined)
  const [coraOpen, setCoraOpen] = useState(false)

  const selectedLetters = useMemo(() => {
    if (Array.isArray(selected)) {
      return selected.map((entry) => entry.toUpperCase())
    }
    const letter = String(selected).trim().toUpperCase()
    return letter ? [letter] : []
  }, [selected])

  const hasSelection = isSelectAll ? selectedLetters.length > 0 : selectedLetters.length === 1

  const isCorrect = result?.is_mcq_correct ?? false
  const mcqEarnedFraction = result?.mcq_earned_fraction

  const engagementMessage = useMemo(() => {
    if (!engagementRecorded) return ""
    return samplePracticeEngagementPointsMessage({
      pointsSynced,
      pointsEarned: engagementPointsEarned,
      mcqEarnedFraction,
    })
  }, [engagementPointsEarned, engagementRecorded, mcqEarnedFraction, pointsSynced])

  const explanation =
    result?.explanation?.trim() ||
    result?.parts.find((part) => part.explanation?.trim())?.explanation?.trim() ||
    question.explanation?.trim() ||
    ""

  const borderColor = useMemo(() => {
    if (expanded) return accent.border
    if (reviewed) return SYSTEM.yellow.border
    return tokens.border
  }, [accent.border, expanded, reviewed, tokens.border])

  const importedProblem = useMemo(
    () =>
      samplePracticeQuestionToImportedProblem(
        lectureId,
        question,
        studentDatabaseId,
        result,
      ),
    [lectureId, question, result, studentDatabaseId],
  )

  function toggleOption(letter: string) {
    if (submitted || submitting) return
    const upper = letter.toUpperCase()
    if (isSelectAll) {
      setSelected((prev) => {
        const prevLetters = Array.isArray(prev)
          ? prev.map((entry) => entry.toUpperCase())
          : String(prev).trim()
            ? [String(prev).trim().toUpperCase()]
            : []
        return prevLetters.includes(upper)
          ? prevLetters.filter((entry) => entry !== upper)
          : [...prevLetters, upper]
      })
      return
    }
    setSelected(upper)
  }

  async function handleSubmit() {
    if (!hasSelection || submitting || submitted) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const answer = isSelectAll ? selectedLetters : selectedLetters[0] ?? ""
      const mcqEarnedFractionForSubmit = resolveMcqEarnedFractionForSubmission({
        questionType: question.question_type,
        options: question.options,
        correctAnswer: question.correct_answer,
        correctAnswers: question.correct_answers,
        selectedLetters,
      })
      const data = await studentApi.evaluateLectureSamplePractice(
        session,
        lectureId,
        question.id,
        answer,
        mcqEarnedFractionForSubmit != null
          ? { mcqEarnedFraction: mcqEarnedFractionForSubmit }
          : undefined,
      )
      setResult(
        data.result
          ? normalizeSamplePracticeSelectAllResult(data.result, question, selectedLetters)
          : null,
      )
      setSubmitted(true)
      setEngagementRecorded(data.engagement?.recorded === true)
      setPointsSynced(data.engagement?.pointsSynced === true)
      setEngagementPointsEarned(
        data.engagement?.pointsEarned != null && Number.isFinite(data.engagement.pointsEarned)
          ? data.engagement.pointsEarned
          : undefined,
      )
      onReviewed()
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Could not check your answer.")
    } finally {
      setSubmitting(false)
    }
  }

  const promptText =
    question.question_text.trim() ||
    "Work through this example, submit your answer, then review the solution."

  const resultMessage = useMemo(() => {
    if (!result) return ""
    return samplePracticeResultSummary(result, question)
  }, [question, result])

  return (
    <>
      <View style={[styles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor }]}>
        <Pressable
          style={({ pressed }) => [styles.header, pressed && { opacity: NATIVE.pressedOpacity }]}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <View style={[styles.indexBadge, { backgroundColor: accent.soft }]}>
            <Text style={[styles.indexText, { color: accent.color }]}>{index + 1}</Text>
          </View>
          <View style={styles.headerCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={2}>
              {question.title}
            </Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
              {question.topic?.trim() || courseLabel}
            </Text>
          </View>
          {reviewed && !expanded ? (
            <View style={[styles.reviewBadge, { backgroundColor: tokens.accentSoft }]}>
              <Text style={[styles.reviewBadgeText, { color: tokens.accentDark }]}>Review</Text>
            </View>
          ) : null}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={native.tertiaryLabel}
          />
        </Pressable>

        {expanded ? (
          <View style={styles.body}>
            {question.question_media ? <QuestionMediaView media={question.question_media} embedded /> : null}

            {question.question_text.trim() ? (
              <View style={styles.promptBlock}>
                <QuestionContentWebView text={question.question_text} embedded />
              </View>
            ) : null}

            {!question.question_text.trim() ? (
              <Text style={[type.secondary, { color: native.secondaryLabel }]}>{promptText}</Text>
            ) : null}

            {isSelectAll && !submitted ? (
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                Select all that apply, then submit.
              </Text>
            ) : null}

            {options.length > 0 ? (
              <View style={styles.optionsStack}>
                {options.map(({ letter, text }) => {
                  const isSelected = selectedLetters.includes(letter)
                  const { isCorrect: isOptionCorrect, showWrongSelection } =
                    samplePracticeOptionReviewState(
                      letter,
                      selectedLetters,
                      submitted ? result : null,
                      question.options,
                    )

                  return (
                    <Pressable
                      key={letter}
                      style={[
                        styles.option,
                        { borderColor: tokens.border, backgroundColor: native.groupedBackground },
                        isSelected && !submitted && {
                          borderColor: tokens.accent,
                          backgroundColor: hexToRgba(tokens.accent, 0.06),
                        },
                        isOptionCorrect && {
                          borderColor: SYSTEM.green.color,
                          backgroundColor: hexToRgba(SYSTEM.green.color, 0.08),
                        },
                        showWrongSelection && {
                          borderColor: SYSTEM.red.color,
                          backgroundColor: hexToRgba(SYSTEM.red.color, 0.06),
                        },
                      ]}
                      disabled={submitted || submitting}
                      onPress={() => toggleOption(letter)}
                      accessibilityRole={isSelectAll ? "checkbox" : "radio"}
                      accessibilityState={{ selected: isSelected, checked: isSelected }}
                    >
                      <View
                        style={[
                          styles.optionLetter,
                          { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
                          isSelected && !submitted && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                          isOptionCorrect && { backgroundColor: SYSTEM.green.color, borderColor: SYSTEM.green.color },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionLetterText,
                            { color: native.secondaryLabel },
                            (isSelected && !submitted) || isOptionCorrect ? styles.optionLetterTextSelected : null,
                          ]}
                        >
                          {letter}
                        </Text>
                      </View>
                      <View style={styles.optionTextWrap}>
                        <QuestionContentWebView text={text} embedded compact />
                      </View>
                      {isSelectAll ? (
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={22}
                          color={
                            showWrongSelection
                              ? SYSTEM.red.color
                              : isOptionCorrect
                                ? SYSTEM.green.color
                                : isSelected
                                  ? tokens.accent
                                  : native.tertiaryLabel
                          }
                        />
                      ) : isSelected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={showWrongSelection ? SYSTEM.red.color : tokens.accent}
                        />
                      ) : null}
                    </Pressable>
                  )
                })}
              </View>
            ) : null}

            {options.length > 0 && !submitted ? (
              <Pressable
                style={[
                  styles.submitBtn,
                  { backgroundColor: tokens.accent },
                  (!hasSelection || submitting) && styles.submitBtnDisabled,
                ]}
                disabled={!hasSelection || submitting}
                onPress={() => void handleSubmit()}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit answer</Text>
                )}
              </Pressable>
            ) : null}

            {submitError ? (
              <Text style={[type.footnote, { color: SYSTEM.red.color }]}>{submitError}</Text>
            ) : null}

            {submitted && result ? (
              <View
                style={[
                  styles.resultBanner,
                  {
                    backgroundColor: isCorrect
                      ? hexToRgba(SYSTEM.green.color, 0.1)
                      : hexToRgba(SYSTEM.orange.color, 0.1),
                    borderColor: isCorrect ? SYSTEM.green.border : SYSTEM.orange.border,
                  },
                ]}
              >
                <Ionicons
                  name={isCorrect ? "checkmark-circle" : "information-circle-outline"}
                  size={18}
                  color={isCorrect ? SYSTEM.green.color : SYSTEM.orange.color}
                />
                <Text style={[type.footnote, { color: native.label, flex: 1 }]}>{resultMessage}</Text>
              </View>
            ) : null}

            {submitted && engagementRecorded && engagementMessage ? (
              <Text style={[type.caption, { color: SYSTEM.green.color }]}>{engagementMessage}</Text>
            ) : null}

            {submitted && explanation ? (
              <View style={styles.explanation}>
                <Text style={[type.caption, styles.explanationLabel, { color: native.secondaryLabel }]}>
                  Solution
                </Text>
                <QuestionContentWebView text={explanation} embedded />
              </View>
            ) : null}

            {!submitted ? (
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                Submit your answer first to unlock Solve with Cora.
              </Text>
            ) : null}

            <CoraSolveButton
              disabled={!submitted}
              onPress={() => setCoraOpen(true)}
            />
          </View>
        ) : null}
      </View>

      <StudentSamplePracticeCoraChatModal
        visible={coraOpen}
        session={session}
        importedProblem={importedProblem}
        conversationTitle={question.title}
        onClose={() => setCoraOpen(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  indexText: {
    fontSize: 14,
    fontWeight: "700",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  reviewBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  promptBlock: {
    paddingHorizontal: 2,
  },
  optionsStack: {
    gap: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: "700",
  },
  optionLetterTextSelected: {
    color: "#ffffff",
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  submitBtn: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    minHeight: 46,
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  explanation: {
    gap: 6,
  },
  explanationLabel: {
    fontWeight: "600",
  },
})
