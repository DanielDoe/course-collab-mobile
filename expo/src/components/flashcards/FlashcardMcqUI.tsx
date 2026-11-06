import { useEffect } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import * as Haptics from "expo-haptics"
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import type { FlashcardMcq } from "../../lib/flashcard-quiz"
import { letterForOptionIndex } from "../../lib/playground-question-utils"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { QuestionContentWebView } from "../rewards/QuestionContent"

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
      <View style={styles.promptMath} pointerEvents="none">
        <QuestionContentWebView text={mcq.promptText} embedded compact />
      </View>
    </View>
  )
}

type ChoicesProps = {
  mcq: FlashcardMcq
  locked?: boolean
  feedback?: "correct" | "incorrect" | null
  selectedChoiceId?: string | null
  previewCorrect?: boolean
  onSelect?: (choiceId: string) => void
}

function FeedbackBanner({
  feedback,
  correctText,
}: {
  feedback: "correct" | "incorrect"
  correctText?: string
}) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const isCorrect = feedback === "correct"
  const tone = isCorrect ? tokens.success : tokens.danger
  const scale = useSharedValue(0.92)
  const glow = useSharedValue(0)

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.04, { damping: 12, stiffness: 220 }),
      withSpring(1, { damping: 14, stiffness: 180 }),
    )
    glow.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withTiming(0.55, { duration: 420 }),
    )
    if (Platform.OS === "ios") {
      void Haptics.notificationAsync(
        isCorrect
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      )
    }
  }, [feedback, glow, isCorrect, scale])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.85 + glow.value * 0.15,
  }))

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(16)}
      style={[
        styles.feedback,
        animStyle,
        {
          backgroundColor: hexToRgba(tone, tokens.isDark ? 0.2 : 0.12),
          borderColor: hexToRgba(tone, tokens.isDark ? 0.45 : 0.35),
        },
      ]}
    >
      <View style={[styles.feedbackIcon, { backgroundColor: hexToRgba(tone, tokens.isDark ? 0.28 : 0.18) }]}>
        <Ionicons
          name={isCorrect ? "checkmark-circle" : "close-circle"}
          size={22}
          color={tone}
        />
      </View>
      <View style={styles.feedbackCopy}>
        <Text style={[type.bodyEmphasis, { color: tone }]}>
          {isCorrect ? "Nice — that’s correct" : "Not quite"}
        </Text>
        {isCorrect ? (
          <Text style={[type.caption, { color: tokens.native.secondaryLabel, lineHeight: 18 }]}>
            Keep the streak going into the next question.
          </Text>
        ) : correctText ? (
          <View style={styles.feedbackAnswer} pointerEvents="none">
            <Text style={[type.caption, { color: tokens.native.secondaryLabel, marginBottom: 4 }]}>
              Answer
            </Text>
            <QuestionContentWebView text={correctText} embedded compact />
          </View>
        ) : (
          <Text style={[type.caption, { color: tokens.native.secondaryLabel, lineHeight: 18 }]}>
            Review the correct option highlighted above.
          </Text>
        )}
      </View>
    </Animated.View>
  )
}

function ChoiceRow({
  index,
  text,
  selected,
  showCorrect,
  showWrong,
  locked,
  interactive,
  onPress,
}: {
  index: number
  text: string
  selected: boolean
  showCorrect: boolean
  showWrong: boolean
  locked: boolean
  interactive: boolean
  onPress?: () => void
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const shake = useSharedValue(0)
  const pop = useSharedValue(1)

  useEffect(() => {
    if (showWrong) {
      shake.value = withSequence(
        withTiming(-6, { duration: 45 }),
        withTiming(6, { duration: 45 }),
        withTiming(-4, { duration: 40 }),
        withTiming(4, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      )
    }
    if (showCorrect) {
      pop.value = withSequence(
        withSpring(1.03, { damping: 10, stiffness: 260 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      )
    }
  }, [pop, shake, showCorrect, showWrong])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: pop.value }],
  }))

  const letter = letterForOptionIndex(index)
  const tone = showCorrect ? tokens.success : showWrong ? tokens.danger : null
  const bg = tone
    ? hexToRgba(tone, tokens.isDark ? 0.18 : 0.1)
    : selected && !locked
      ? hexToRgba(tokens.accent, tokens.isDark ? 0.16 : 0.08)
      : native.secondaryGrouped
  const border = tone
    ? tone
    : selected && !locked
      ? tokens.accent
      : native.separator

  return (
    <Animated.View style={animStyle}>
      <Pressable
        testID={`flashcard-choice-${letter}`}
        accessibilityRole="button"
        accessibilityLabel={`Option ${letter}`}
        disabled={locked || !interactive}
        onPress={interactive ? onPress : undefined}
        style={({ pressed }) => [
          styles.choice,
          {
            backgroundColor: bg,
            borderColor: border,
            borderWidth: tone || selected ? 1.5 : StyleSheet.hairlineWidth,
            opacity: pressed && interactive ? 0.88 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.choiceIndex,
            {
              backgroundColor: tone
                ? hexToRgba(tone, tokens.isDark ? 0.28 : 0.16)
                : native.tertiaryGrouped,
            },
          ]}
        >
          {showCorrect ? (
            <Ionicons name="checkmark" size={14} color={tokens.success} />
          ) : showWrong ? (
            <Ionicons name="close" size={14} color={tokens.danger} />
          ) : (
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>
              {letter}
            </Text>
          )}
        </View>
        <View style={styles.choiceTextWrap} pointerEvents="none">
          <QuestionContentWebView text={text} embedded compact />
        </View>
        {showCorrect ? (
          <Animated.View entering={FadeIn.duration(220)}>
            <Text style={[type.caption, { color: tokens.success, fontWeight: "700" }]}>Correct</Text>
          </Animated.View>
        ) : null}
        {showWrong ? (
          <Animated.View entering={FadeIn.duration(220)}>
            <Text style={[type.caption, { color: tokens.danger, fontWeight: "700" }]}>Yours</Text>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  )
}

export function FlashcardMcqChoices({
  mcq,
  locked = false,
  feedback = null,
  selectedChoiceId = null,
  previewCorrect = false,
  onSelect,
}: ChoicesProps) {
  const correctChoice = mcq.choices.find((c) => c.isCorrect)
  const interactive = Boolean(onSelect) && !previewCorrect

  return (
    <View style={styles.choicesWrap}>
      <View style={styles.choices}>
        {mcq.choices.map((choice, i) => {
          const isSelected = selectedChoiceId === choice.id
          const showCorrect =
            (previewCorrect && choice.isCorrect) ||
            (feedback != null && choice.isCorrect)
          const showWrong = feedback === "incorrect" && isSelected && !choice.isCorrect
          return (
            <ChoiceRow
              key={choice.id}
              index={i}
              text={choice.text}
              selected={isSelected}
              showCorrect={showCorrect}
              showWrong={showWrong}
              locked={locked}
              interactive={interactive}
              onPress={() => onSelect?.(choice.id)}
            />
          )
        })}
      </View>

      {feedback ? (
        <FeedbackBanner feedback={feedback} correctText={correctChoice?.text} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  prompt: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    minHeight: 140,
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
  promptMath: { marginTop: 8, width: "100%" },
  choicesWrap: { gap: 10 },
  feedback: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  feedbackIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  feedbackCopy: { flex: 1, gap: 2, minWidth: 0 },
  feedbackAnswer: { marginTop: 2 },
  choices: { gap: 8 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 52,
  },
  choiceIndex: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceTextWrap: { flex: 1, minWidth: 0 },
})
