import { useMemo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { hexToRgba } from "../../constants/app-themes"
import {
  normalizeQuestionContentForRender,
  resolveImportedQuestionMedia,
  stripDuplicateMediaCaptionFromQuestion,
} from "../../lib/classroom-submission"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"
import type { CoraImportedProblem } from "../../lib/ai-tutor-api"

type Props = {
  label?: string
  problem: CoraImportedProblem
  compact?: boolean
  /** Nested inside a user chat turn — tighter spacing, no outer chrome. */
  chatTurn?: boolean
  onClear?: () => void
}

export function CoraImportedQuestionPreview({
  label,
  problem,
  compact = false,
  chatTurn = false,
  onClear,
}: Props) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const title = label ?? problem.title ?? problem.topic ?? "Imported question"
  const media = resolveImportedQuestionMedia(problem)
  const displayText = useMemo(() => {
    const normalized = normalizeQuestionContentForRender(problem.questionText ?? "")
    return stripDuplicateMediaCaptionFromQuestion(normalized, media)
  }, [problem.questionText, media])
  const showMediaAbove = !(media?.media_placement ?? "above_question").includes("below")
  /** Composer dock uses compact preview; chat bubbles need full math height. */
  const useCompactLayout = compact && !chatTurn

  return (
    <View
      style={[
        !chatTurn && styles.card,
        useCompactLayout && !chatTurn && styles.cardCompact,
        chatTurn && styles.chatTurn,
        !chatTurn && {
          backgroundColor: hexToRgba(SN.accent, 0.06),
          borderColor: hexToRgba(SN.accent, 0.18),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[type.caption, styles.badge, { color: SN.accent }]}>Course question</Text>
          <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {onClear ? (
          <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove imported question">
            <Ionicons name="close-circle" size={20} color={SN.secondaryLabel} />
          </Pressable>
        ) : null}
      </View>
      {media && showMediaAbove ? <QuestionMediaView media={media} embedded compact={useCompactLayout} /> : null}
      <QuestionContentWebView text={displayText} embedded compact={useCompactLayout} chatBubble={chatTurn} />
      {media && !showMediaAbove ? <QuestionMediaView media={media} embedded compact={useCompactLayout} /> : null}
      {!chatTurn && problem.hint?.trim() ? (
        <Text style={[type.caption, styles.hint, { color: SN.secondaryLabel }]}>
          Hint: {problem.hint.trim()}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  cardCompact: {
    padding: 10,
    gap: 4,
  },
  chatTurn: {
    gap: 4,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
  },
  hint: {
    lineHeight: 18,
  },
})
