import { StyleSheet, Text, View } from "react-native"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  flashcardDifficultyLabel,
  normalizeFlashcardDifficulty,
  type FlashcardDifficulty,
} from "../../lib/flashcard-difficulty"
import { flashcardDifficultyBadgeStyle } from "../../lib/flashcard-difficulty-theme"

type Props = {
  difficulty?: FlashcardDifficulty | string | null
  compact?: boolean
}

export function FlashcardDifficultyBadge({ difficulty, compact = false }: Props) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const normalized = normalizeFlashcardDifficulty(difficulty)
  const badge = flashcardDifficultyBadgeStyle(normalized, tokens.isDark)

  return (
    <View
      style={[
        styles.badge,
        compact ? styles.badgeCompact : null,
        {
          backgroundColor: badge.backgroundColor,
          borderColor: badge.borderColor,
        },
      ]}
    >
      <Text
        style={[
          compact ? type.caption : type.caption,
          styles.label,
          { color: badge.color },
        ]}
      >
        {flashcardDifficultyLabel(normalized)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
})
