import { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { SYSTEM, NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { LectureSamplePracticeQuestion } from "../../lib/lecture-types"
import {
  getGradableSubquestions,
  subquestionOptionLabels,
} from "../../lib/lecture-sample-practice-utils"
import { buildSamplePracticeCoraProblem } from "../../lib/cora-problem"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"
import { CoraSolveButton } from "../cora/CoraSolveButton"
import { useCora } from "../cora/CoraProvider"

const ACCENTS = [SYSTEM.blue, SYSTEM.purple, SYSTEM.teal, SYSTEM.orange] as const

type Props = {
  lectureId: number
  studentDatabaseId: string
  courseLabel: string
  question: LectureSamplePracticeQuestion
  index: number
  expanded: boolean
  reviewed: boolean
  onToggle: () => void
  onReviewed: () => void
}

export function StudentLectureSamplePracticeQuestionCard({
  lectureId,
  studentDatabaseId,
  courseLabel,
  question,
  index,
  expanded,
  reviewed,
  onToggle,
  onReviewed,
}: Props) {
  const { openCora } = useCora()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const accent = ACCENTS[index % ACCENTS.length] ?? SYSTEM.blue

  const mcq = getGradableSubquestions(question.subquestions)[0]
  const options = mcq ? subquestionOptionLabels(mcq) : []

  const [selectedLetter, setSelectedLetter] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  const borderColor = useMemo(() => {
    if (expanded) return accent.border
    if (reviewed) return SYSTEM.yellow.border
    return tokens.border
  }, [accent.border, expanded, reviewed, tokens.border])

  function handleSubmit() {
    if (!mcq || !selectedLetter) return
    const correct = (mcq.correct_answer ?? "").toUpperCase()
    const correctAnswers = (mcq.correct_answers ?? []).map((value) => value.toUpperCase())
    const ok =
      selectedLetter.toUpperCase() === correct ||
      correctAnswers.includes(selectedLetter.toUpperCase())
    setIsCorrect(ok)
    setSubmitted(true)
    onReviewed()
  }

  function handleOpenCora() {
    openCora(buildSamplePracticeCoraProblem(lectureId, question, studentDatabaseId))
  }

  const promptText =
    mcq?.prompt.trim() ||
    question.question_text.trim() ||
    "Work through this example, submit your answer, then review the solution."

  return (
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

          {mcq?.prompt.trim() && mcq.prompt.trim() !== question.question_text.trim() ? (
            <View style={styles.promptBlock}>
              <QuestionContentWebView text={mcq.prompt} embedded compact />
            </View>
          ) : null}

          {!question.question_text.trim() && !mcq?.prompt.trim() ? (
            <Text style={[type.secondary, { color: native.secondaryLabel }]}>{promptText}</Text>
          ) : null}

          {options.length > 0 ? (
            <View style={styles.optionsStack}>
              {options.map(({ letter, text }) => {
                const selected = selectedLetter === letter
                const showResult = submitted && selected
                const isOptionCorrect =
                  letter.toUpperCase() === (mcq?.correct_answer ?? "").toUpperCase() ||
                  (mcq?.correct_answers ?? []).map((value) => value.toUpperCase()).includes(letter.toUpperCase())

                return (
                  <Pressable
                    key={letter}
                    style={[
                      styles.option,
                      { borderColor: tokens.border, backgroundColor: native.groupedBackground },
                      selected && {
                        borderColor: tokens.accent,
                        backgroundColor: hexToRgba(tokens.accent, 0.06),
                      },
                      submitted && isOptionCorrect && {
                        borderColor: SYSTEM.green.color,
                        backgroundColor: hexToRgba(SYSTEM.green.color, 0.08),
                      },
                      showResult && !isOptionCorrect && {
                        borderColor: SYSTEM.red.color,
                        backgroundColor: hexToRgba(SYSTEM.red.color, 0.06),
                      },
                    ]}
                    disabled={submitted}
                    onPress={() => setSelectedLetter(letter)}
                  >
                    <View
                      style={[
                        styles.optionLetter,
                        { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
                        selected && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLetterText,
                          { color: native.secondaryLabel },
                          selected && styles.optionLetterTextSelected,
                        ]}
                      >
                        {letter}
                      </Text>
                    </View>
                    <View style={styles.optionTextWrap}>
                      <QuestionContentWebView text={text} embedded compact />
                    </View>
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
                !selectedLetter && styles.submitBtnDisabled,
              ]}
              disabled={!selectedLetter}
              onPress={handleSubmit}
            >
              <Text style={styles.submitBtnText}>Submit answer</Text>
            </Pressable>
          ) : null}

          {submitted ? (
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
              <Text style={[type.footnote, { color: native.label, flex: 1 }]}>
                {isCorrect
                  ? "Correct — nice work."
                  : `Not quite. The correct answer is ${mcq?.correct_answer ?? "shown above"}.`}
              </Text>
            </View>
          ) : null}

          {submitted && mcq?.explanation?.trim() ? (
            <View style={styles.explanation}>
              <Text style={[type.caption, styles.explanationLabel, { color: native.secondaryLabel }]}>
                Solution
              </Text>
              <QuestionContentWebView text={mcq.explanation} embedded />
            </View>
          ) : null}

          <CoraSolveButton onPress={handleOpenCora} />
        </View>
      ) : null}
    </View>
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
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
