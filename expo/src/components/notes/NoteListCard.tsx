import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import {
  noteStatusColor,
  noteStatusLabel,
  noteSolidThumb,
  noteThumbIcon,
  type NoteCardKind,
} from "./note-list-utils"

type Props = {
  title: string
  preview: string
  contextLabel?: string
  updatedLabel: string
  kind: NoteCardKind
  index: number
  onPress: () => void
}

export function NoteListCard({
  title,
  preview,
  contextLabel,
  updatedLabel,
  kind,
  index,
  onPress,
}: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const solidThumb = noteSolidThumb(index, kind)
  const statusColor = noteStatusColor(kind, solidThumb)
  const icon = noteThumbIcon(kind)

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
      accessibilityLabel={`${title}, ${noteStatusLabel(kind)}, updated ${updatedLabel}`}
    >
      <SolidListThumbTile thumb={solidThumb} icon={icon} />

      <View style={styles.copy}>
        <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
          {title}
        </Text>
        {contextLabel ? (
          <Text style={[type.caption, styles.context, { color: native.secondaryLabel }]} numberOfLines={1}>
            {contextLabel}
          </Text>
        ) : null}
        <Text style={[type.caption, styles.preview, { color: native.secondaryLabel }]} numberOfLines={2}>
          {preview}
        </Text>

        <View style={styles.statusRow}>
          <Ionicons name="ellipse" size={8} color={statusColor} style={styles.statusDot} />
          <Text style={[type.footnote, styles.statusText, { color: statusColor }]}>
            {noteStatusLabel(kind)}
          </Text>
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}>• Updated {updatedLabel}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.chevron} />
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
  context: {
    lineHeight: 16,
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
  chevron: {
    flexShrink: 0,
    marginTop: 2,
  },
})
