import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { FlashcardCard } from "../../lib/flashcards-api"
import type { FlashcardDifficulty } from "../../lib/flashcard-difficulty"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  FACULTY_FLASHCARD_COLOR,
  facultyFlashcardEditorCardThumb,
} from "../../lib/faculty-flashcard-theme"
import { FlashcardDifficultyBadge } from "../flashcards/FlashcardDifficultyBadge"
import { FlashcardDifficultyPicker } from "../flashcards/FlashcardDifficultyPicker"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

type Props = {
  card: FlashcardCard
  index: number
  total: number
  showQuizAction: boolean
  editing: boolean
  expanded: boolean
  editFront: string
  editBack: string
  editDifficulty: FlashcardDifficulty
  saving?: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onEditFrontChange: (value: string) => void
  onEditBackChange: (value: string) => void
  onEditDifficultyChange: (value: FlashcardDifficulty) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleQuiz: () => void
  onDelete: () => void
  children?: React.ReactNode
}

export function FacultyFlashcardEditorCardRow({
  card,
  index,
  total,
  showQuizAction,
  editing,
  expanded,
  editFront,
  editBack,
  editDifficulty,
  saving,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFrontChange,
  onEditBackChange,
  onEditDifficultyChange,
  onMoveUp,
  onMoveDown,
  onToggleQuiz,
  onDelete,
  children,
}: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const thumb = facultyFlashcardEditorCardThumb(index, editing ? editDifficulty : card.difficulty, tokens.isDark)

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.card,
          tokens.cardShadow,
          {
            backgroundColor: native.secondaryGrouped,
            borderColor: editing ? tokens.accent : tokens.border,
          },
        ]}
      >
        <SolidListThumbTile thumb={thumb} icon="albums-outline" size="compact" />

        {editing ? (
          <View style={styles.editCopy}>
            <TextInput
              value={editFront}
              onChangeText={onEditFrontChange}
              placeholder="Front"
              placeholderTextColor={native.tertiaryLabel}
              style={[styles.input, { color: native.label, borderColor: tokens.border, backgroundColor: native.fill }]}
              multiline
            />
            <TextInput
              value={editBack}
              onChangeText={onEditBackChange}
              placeholder="Back"
              placeholderTextColor={native.tertiaryLabel}
              style={[styles.input, { color: native.label, borderColor: tokens.border, backgroundColor: native.fill }]}
              multiline
            />
            <FlashcardDifficultyPicker value={editDifficulty} onChange={onEditDifficultyChange} />
            <View style={styles.editActions}>
              <Pressable onPress={onCancelEdit} disabled={saving}>
                <Text style={[type.bodyEmphasis, { color: native.secondaryLabel }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onSaveEdit} disabled={saving}>
                <Text style={[type.bodyEmphasis, { color: FACULTY_FLASHCARD_COLOR.action }]}>
                  {saving ? "Saving…" : "Save card"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.copy} onPress={onStartEdit} accessibilityRole="button">
            <View style={styles.titleRow}>
              <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
                {card.frontText}
              </Text>
              <FlashcardDifficultyBadge difficulty={card.difficulty} compact />
            </View>
            <Text style={[type.caption, styles.back, { color: native.secondaryLabel }]} numberOfLines={2}>
              {card.backText}
            </Text>
            <Text style={[type.footnote, styles.editLink, { color: FACULTY_FLASHCARD_COLOR.link }]}>
              Tap to edit card
            </Text>
          </Pressable>
        )}

        {!editing ? (
          <View style={styles.actions}>
            <Pressable
              onPress={onMoveUp}
              disabled={index === 0 || saving}
              hitSlop={6}
              accessibilityLabel="Move card up"
            >
              <Ionicons
                name="chevron-up"
                size={18}
                color={index === 0 ? native.tertiaryLabel : native.secondaryLabel}
              />
            </Pressable>
            <Pressable
              onPress={onMoveDown}
              disabled={index >= total - 1 || saving}
              hitSlop={6}
              accessibilityLabel="Move card down"
            >
              <Ionicons
                name="chevron-down"
                size={18}
                color={index >= total - 1 ? native.tertiaryLabel : native.secondaryLabel}
              />
            </Pressable>
            {showQuizAction ? (
              <Pressable onPress={onToggleQuiz} hitSlop={6} accessibilityLabel="Edit quiz distractors">
                <Text style={[type.caption, styles.quizBtn, { color: FACULTY_FLASHCARD_COLOR.link }]}>
                  {expanded ? "Quiz" : "Quiz"}
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onDelete} hitSlop={6} accessibilityLabel="Delete card" disabled={saving}>
              <Ionicons name="trash-outline" size={18} color={tokens.danger} />
            </Pressable>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 80,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingVertical: 1,
  },
  editCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    lineHeight: 20,
  },
  back: {
    lineHeight: 18,
  },
  editLink: {
    fontWeight: "600",
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 44,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
  },
  actions: {
    alignItems: "center",
    gap: 8,
    paddingTop: 2,
  },
  quizBtn: {
    fontWeight: "700",
  },
})
