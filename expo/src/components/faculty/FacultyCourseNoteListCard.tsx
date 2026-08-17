import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { CourseDigitalNote } from "../../lib/digital-notes-api"
import { noteContentPreviewText } from "../../lib/digital-note-content"
import { formatNoteWhen, noteThumbIcon } from "../notes/note-list-utils"
import {
  FACULTY_COURSE_NOTES_COLOR,
  facultyCourseNoteListThumb,
  facultyCourseNoteMetaLine,
  facultyCourseNoteStatus,
} from "../../lib/faculty-course-notes-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

type Props = {
  note: CourseDigitalNote
  index: number
  onPress: () => void
  onDelete?: () => void
  deletedAt?: string
  onRestore?: () => void
}

function notePreview(body: string): string {
  const text = noteContentPreviewText(body, 120)
  return text || "No text yet"
}

export function FacultyCourseNoteListCard({
  note,
  index,
  onPress,
  onDelete,
  deletedAt,
  onRestore,
}: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const solidThumb = facultyCourseNoteListThumb(index)
  const status = deletedAt
    ? { label: "Deleted", color: FACULTY_COURSE_NOTES_COLOR.deleted, icon: "trash-outline" as const }
    : facultyCourseNoteStatus(note)
  const metaLine = deletedAt
    ? `Deleted ${formatNoteWhen(deletedAt)}`
    : `${facultyCourseNoteMetaLine(note)} · Updated ${formatNoteWhen(note.updatedAt)}`

  return (
    <View
      style={[
        styles.card,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.cardMain, { opacity: pressed ? NATIVE.pressedOpacity : 1 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${note.title || "Untitled note"}, ${status.label}`}
      >
        <SolidListThumbTile thumb={solidThumb} icon={noteThumbIcon("course")} />

        <View style={styles.copy}>
          <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
            {note.title || "Untitled note"}
          </Text>
          <Text style={[type.caption, styles.preview, { color: native.secondaryLabel }]} numberOfLines={2}>
            {notePreview(note.bodyText)}
          </Text>

          <View style={styles.statusRow}>
            <Ionicons
              name={status.icon}
              size={status.icon === "ellipse" ? 8 : 14}
              color={status.color}
              style={status.icon === "ellipse" ? styles.statusDot : undefined}
            />
            <Text style={[type.footnote, styles.statusText, { color: status.color }]}>{status.label}</Text>
            <Text style={[type.footnote, { color: native.tertiaryLabel }]}>• {metaLine}</Text>
          </View>
        </View>
      </Pressable>

      {onRestore ? (
        <Pressable
          onPress={onRestore}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Restore ${note.title || "Untitled note"}`}
          style={styles.actionBtn}
        >
          <Ionicons name="arrow-undo-outline" size={18} color={tokens.accent} />
        </Pressable>
      ) : onDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${note.title || "Untitled note"}`}
          style={styles.actionBtn}
        >
          <Ionicons name="trash-outline" size={18} color={tokens.danger} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.chevron} />
      )}
    </View>
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
  cardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
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
  preview: {
    lineHeight: 16,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 16,
    flexWrap: "wrap",
  },
  statusDot: {
    marginHorizontal: 2,
  },
  statusText: {
    fontWeight: "600",
  },
  actionBtn: {
    flexShrink: 0,
    padding: 4,
    marginTop: 2,
  },
  chevron: {
    flexShrink: 0,
    marginTop: 2,
  },
})
