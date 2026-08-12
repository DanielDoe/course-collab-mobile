import { Pressable, StyleSheet, Text, View } from "react-native"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  FLASHCARD_DIFFICULTY_VALUES,
  flashcardDifficultyLabel,
  type FlashcardDifficulty,
} from "../../lib/flashcard-difficulty"
import { flashcardDifficultyBadgeStyle } from "../../lib/flashcard-difficulty-theme"

type Props = {
  value: FlashcardDifficulty
  onChange: (value: FlashcardDifficulty) => void
}

export function FlashcardDifficultyPicker({ value, onChange }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={styles.root}>
      <Text style={[type.caption, styles.label, { color: native.secondaryLabel }]}>Difficulty</Text>
      <View style={styles.row}>
        {FLASHCARD_DIFFICULTY_VALUES.map((level) => {
          const selected = value === level
          const badge = flashcardDifficultyBadgeStyle(level, tokens.isDark)
          return (
            <Pressable
              key={level}
              onPress={() => onChange(level)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? badge.backgroundColor : native.fill,
                  borderColor: selected ? badge.borderColor : native.separator,
                },
              ]}
            >
              <Text
                style={[
                  type.caption,
                  styles.chipLabel,
                  { color: selected ? badge.color : native.secondaryLabel },
                ]}
              >
                {flashcardDifficultyLabel(level)}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  label: { fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLabel: { fontWeight: "700" },
})
