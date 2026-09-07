import { Pressable, ScrollView, StyleSheet, Text } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { CORA_CHAT_EDGE_PADDING } from "../ai-tutor/cora-chat-bubble-theme"
import type { ConvertToToolSuggestion } from "../../lib/cora/convert-to-tool-suggestion"

type Props = {
  suggestions: ConvertToToolSuggestion[]
  onPress: (suggestion: ConvertToToolSuggestion) => void
}

export function CoraConvertToToolChipRow({ suggestions, onPress }: Props) {
  const tokens = useAppThemeTokens()
  const native = tokens.native
  if (!suggestions.length) return null

  const centered = suggestions.length === 1

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, centered ? styles.rowCentered : styles.rowScroll]}
      style={styles.scroller}
    >
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion.id}
          onPress={() => onPress(suggestion)}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: tokens.accentSoft || native.secondaryGrouped,
              borderColor: tokens.accentBorder || native.separatorOpaque || tokens.border,
              opacity: pressed ? 0.86 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={suggestion.label}
        >
          <Ionicons name={suggestion.icon} size={15} color={tokens.accent} />
          <Text style={[styles.label, { color: tokens.accent }]}>{suggestion.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

/** @deprecated Use CoraConvertToToolChipRow */
export function CoraConvertToToolChip({
  suggestion,
  onPress,
}: {
  suggestion: ConvertToToolSuggestion
  onPress: () => void
}) {
  return <CoraConvertToToolChipRow suggestions={[suggestion]} onPress={() => onPress()} />
}

const styles = StyleSheet.create({
  scroller: {
    marginTop: 10,
    marginBottom: 2,
    flexGrow: 0,
  },
  row: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  rowCentered: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: CORA_CHAT_EDGE_PADDING,
  },
  rowScroll: {
    paddingHorizontal: CORA_CHAT_EDGE_PADDING,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
})
