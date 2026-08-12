import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { FlashcardDeck } from "../../lib/flashcards-api"
import { resolveFlashcardDeckKind } from "../../lib/flashcard-deck-kind"
import { flashcardDeckSolidThumb } from "../../lib/flashcard-deck-thumb"
import {
  FACULTY_FLASHCARD_COLOR,
  facultyFlashcardDeckMetaLine,
  facultyFlashcardDeckStatus,
  facultyFlashcardPracticeHubMeta,
} from "../../lib/faculty-flashcard-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

type Props = {
  deck: FlashcardDeck
  onPress: () => void
  onDelete: () => void
}

function thumbIcon(deck: FlashcardDeck): keyof typeof Ionicons.glyphMap {
  if (deck.cardCount <= 0) return "create-outline"
  return "albums-outline"
}

export function FacultyFlashcardDeckListCard({ deck, onPress, onDelete }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const kind = resolveFlashcardDeckKind(deck)
  const solidThumb = flashcardDeckSolidThumb(deck.id, kind)
  const status = facultyFlashcardDeckStatus(deck)
  const practiceHub = facultyFlashcardPracticeHubMeta(deck.showInPracticeHub)
  const metaLine = facultyFlashcardDeckMetaLine(deck)

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
          opacity: pressed ? NATIVE.pressedOpacity : 1,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${deck.title || "Untitled deck"}, ${status.label}`}
    >
      <SolidListThumbTile thumb={solidThumb} icon={thumbIcon(deck)} />

      <View style={styles.copy}>
        <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
          {deck.title || "Untitled deck"}
        </Text>
        <Text style={[type.caption, styles.topic, { color: native.secondaryLabel }]} numberOfLines={1}>
          {deck.topic?.trim() || "Course deck"}
        </Text>

        <View style={styles.statusRow}>
          <View style={styles.statusMain}>
            <Ionicons
              name={deck.isPublished ? "checkmark-circle" : "ellipse"}
              size={deck.isPublished ? 14 : 8}
              color={status.color}
              style={deck.isPublished ? undefined : styles.statusDot}
            />
            <Text style={[type.footnote, styles.statusText, { color: status.color }]}>{status.label}</Text>
            <Text style={[type.footnote, { color: native.tertiaryLabel }]}>• {metaLine}</Text>
            {practiceHub ? (
              <Text style={[type.footnote, styles.statusText, { color: FACULTY_FLASHCARD_COLOR.practiceHub }]}>
                • {practiceHub}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <Pressable
        onPress={onDelete}
        hitSlop={8}
        accessibilityLabel={`Delete ${deck.title}`}
        style={styles.deleteBtn}
      >
        <Ionicons name="trash-outline" size={18} color={tokens.danger} />
      </Pressable>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 88,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: 1,
  },
  title: {
    lineHeight: 20,
  },
  topic: {
    lineHeight: 16,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 16,
  },
  statusMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
    flexWrap: "wrap",
  },
  statusDot: {
    marginHorizontal: 2,
  },
  statusText: {
    fontWeight: "600",
  },
  deleteBtn: {
    flexShrink: 0,
    padding: 4,
    marginTop: 2,
  },
})
