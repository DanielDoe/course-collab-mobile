import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { FlashcardMcq } from "../../lib/flashcard-quiz"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"

type PromptProps = {
  mcq: FlashcardMcq
  badge: string
  variant?: "quiz" | "check"
  accentColor?: string
}

export function FlashcardMcqPrompt({ mcq, badge, variant = "quiz", accentColor }: PromptProps) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const isQuiz = variant === "quiz"
  const accent = accentColor ?? tokens.accent
  const accentSoft = accentColor
    ? hexToRgba(accent, tokens.isDark ? 0.18 : 0.1)
    : tokens.accentSoft

  return (
    <View
      style={[
        styles.prompt,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: native.separator,
        },
      ]}
    >
      <View
        style={[
          styles.badge,
          { backgroundColor: isQuiz ? accentSoft : native.tertiaryGrouped },
        ]}
      >
        <Ionicons
          name={isQuiz ? "list-outline" : "sparkles-outline"}
          size={12}
          color={isQuiz ? accent : native.secondaryLabel}
        />
        <Text
          style={[
            type.caption,
            styles.badgeText,
            { color: isQuiz ? accent : native.secondaryLabel },
          ]}
        >
          {badge}
        </Text>
      </View>
      <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 10 }]}>
        {mcq.promptLabel}
      </Text>
      <Text style={[type.bodyEmphasis, styles.promptText, { color: native.label }]}>
        {mcq.promptText}
      </Text>
    </View>
  )
}

type ChoicesProps = {
  mcq: FlashcardMcq
  locked?: boolean
  feedback?: "correct" | "incorrect" | null
  previewCorrect?: boolean
  onSelect?: (choiceId: string) => void
}

export function FlashcardMcqChoices({
  mcq,
  locked = false,
  feedback = null,
  previewCorrect = false,
  onSelect,
}: ChoicesProps) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const correctChoice = mcq.choices.find((c) => c.isCorrect)
  const interactive = Boolean(onSelect) && !previewCorrect

  return (
    <View style={styles.choicesWrap}>
      {feedback ? (
        <View
          style={[
            styles.feedback,
            {
              backgroundColor:
                feedback === "correct" ? `${tokens.success}18` : `${tokens.danger}18`,
            },
          ]}
        >
          <Ionicons
            name={feedback === "correct" ? "checkmark-circle" : "close-circle"}
            size={16}
            color={feedback === "correct" ? tokens.success : tokens.danger}
          />
          <Text
            style={[
              type.caption,
              {
                color: feedback === "correct" ? tokens.success : tokens.danger,
                fontWeight: "600",
                flex: 1,
              },
            ]}
          >
            {feedback === "correct" ? "Correct!" : `Not quite — it was: ${correctChoice?.text}`}
          </Text>
        </View>
      ) : null}

      <View style={styles.choices}>
        {mcq.choices.map((choice, i) => {
          const showCorrect =
            (previewCorrect && choice.isCorrect) || (feedback === "incorrect" && choice.isCorrect)
          return (
            <Pressable
              key={choice.id}
              disabled={locked || !interactive}
              onPress={interactive ? () => onSelect?.(choice.id) : undefined}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: showCorrect ? `${tokens.success}18` : native.secondaryGrouped,
                  borderColor: showCorrect ? tokens.success : native.separator,
                  opacity: pressed && interactive ? 0.85 : previewCorrect && !choice.isCorrect ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[type.caption, { color: native.tertiaryLabel, width: 20 }]}>{i + 1}.</Text>
              <Text style={[type.body, { color: native.label, flex: 1 }]}>{choice.text}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  prompt: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    minHeight: 160,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontWeight: "700", fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase" },
  promptText: { marginTop: 8, fontSize: 20, lineHeight: 28 },
  choicesWrap: { gap: 8 },
  feedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choices: { gap: 8 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
})
