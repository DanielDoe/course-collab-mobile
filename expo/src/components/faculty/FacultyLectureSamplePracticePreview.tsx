import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import type { LectureSamplePracticeQuestion } from "../../lib/lecture-types"
import { subquestionOptionLabels } from "../../lib/lecture-sample-practice-utils"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"

/** Quiz-taker style preview for in-lecture sample practice — markdown, KaTeX, diagrams. */
export function FacultyLectureSamplePracticePreview({
  question,
}: {
  question: LectureSamplePracticeQuestion
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const [selectedLetter, setSelectedLetter] = useState("")

  const gradable = {
    id: "a",
    type: question.question_type,
    prompt: question.question_text,
    options: question.options,
    correct_answer: question.correct_answer,
  }
  const options = subquestionOptionLabels(gradable)

  return (
    <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: tokens.accentSoft }]}>
          <Text style={[styles.badgeText, { color: tokens.accentDark }]}>Student preview</Text>
        </View>
        {question.topic ? (
          <Text style={[styles.topic, { color: native.secondaryLabel }]} numberOfLines={1}>
            {question.topic}
          </Text>
        ) : null}
      </View>

      {question.question_media ? <QuestionMediaView media={question.question_media} embedded /> : null}

      {question.question_text.trim() ? (
        <View style={styles.questionBody}>
          <QuestionContentWebView text={question.question_text} embedded />
        </View>
      ) : null}

      {options.length > 0 ? (
        <View style={styles.optionsStack}>
          {options.map(({ letter, text }) => {
            const selected = selectedLetter === letter
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
                ]}
                onPress={() => setSelectedLetter(letter)}
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
                {selected ? <Ionicons name="checkmark-circle" size={20} color={tokens.accent} /> : null}
              </Pressable>
            )
          })}
        </View>
      ) : null}

      <View style={[styles.footer, { borderTopColor: native.separator }]}>
        <Ionicons name="eye-outline" size={14} color={native.secondaryLabel} />
        <Text style={[styles.footerText, { color: native.secondaryLabel }]}>
          Preview mode — matches the slide quiz taker layout
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  topic: { flex: 1, fontSize: 12, fontWeight: "600", textAlign: "right" },
  questionBody: { paddingHorizontal: 2 },
  optionsStack: { gap: 8 },
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
  optionLetterText: { fontSize: 13, fontWeight: "700" },
  optionLetterTextSelected: { color: "#ffffff" },
  optionTextWrap: { flex: 1, minWidth: 0 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: { flex: 1, fontSize: 11, fontWeight: "600", lineHeight: 16 },
})
