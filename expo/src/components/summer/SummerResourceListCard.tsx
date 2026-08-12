import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerResource } from "../../lib/summer-camp-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"

export function resourceTypeLabel(type: SummerResource["type"]): string {
  switch (type) {
    case "code":
      return "Code"
    case "video":
      return "Video"
    case "image_gallery":
      return "Gallery"
    default:
      return "Reading"
  }
}

export function resourceTypeIcon(type: SummerResource["type"]): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "code":
      return "code-slash-outline"
    case "video":
      return "videocam-outline"
    case "image_gallery":
      return "images-outline"
    default:
      return "document-text-outline"
  }
}

type Props = {
  resource: SummerResource
  onPress?: () => void
  last?: boolean
}

export function SummerResourceListCard({ resource, onPress, last }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const iconName = resourceTypeIcon(resource.type)
  const typeLabel = resourceTypeLabel(resource.type)
  const moduleLabel = resource.module_title && resource.module_title !== resource.title ? resource.module_title : undefined

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: native.separator },
        last && styles.rowLast,
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: tokens.accentSoft }]}>
          <Ionicons name={iconName} size={18} color={tokens.accent} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
              {resource.title}
            </Text>
            <FacultyStatusPill label={typeLabel} tone="neutral" />
          </View>
          {moduleLabel ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
              {moduleLabel}
            </Text>
          ) : null}
          {resource.description ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
              {resource.description}
            </Text>
          ) : null}
        </View>
      </View>

      {onPress ? (
        <View style={styles.footer}>
          <Text style={[type.footnote, { color: native.tint, fontWeight: "600" }]}>View details</Text>
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { flex: 1, fontSize: 16, lineHeight: 21 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 48,
    paddingTop: 2,
  },
})
