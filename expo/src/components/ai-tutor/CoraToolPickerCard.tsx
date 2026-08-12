import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { solidListThumb } from "../../lib/solid-list-thumb"
import type { LectureCardKind } from "../lectures/lecture-list-utils"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

export type CoraToolPickerCardProps = {
  index: number
  title: string
  subtitle?: string
  meta?: string
  metaColor?: string
  icon: keyof typeof Ionicons.glyphMap
  kind?: LectureCardKind
  onPress: () => void
}

export function CoraToolPickerCard({
  index,
  title,
  subtitle,
  meta,
  metaColor,
  icon,
  kind = "available",
  onPress,
}: CoraToolPickerCardProps) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const solidThumb = solidListThumb(index, { locked: kind === "locked" })
  const accent = metaColor ?? solidThumb.label

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
          opacity: pressed ? NATIVE.pressedOpacity : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, meta].filter(Boolean).join(", ")}
    >
      <SolidListThumbTile thumb={solidThumb} icon={icon} size="list" iconSize={22} style={styles.thumbCompact} />

      <View style={styles.copy}>
        <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.caption, styles.subtitle, { color: native.secondaryLabel }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <View style={styles.metaRow}>
            <Ionicons name="ellipse" size={7} color={accent} style={styles.metaDot} />
            <Text style={[type.footnote, styles.metaText, { color: accent }]} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={15} color={native.tertiaryLabel} style={styles.chevron} />
    </Pressable>
  )
}

export function CoraToolPickerList({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>
}

export function CoraToolPickerSection({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={styles.section}>
      <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>{label}</Text>
      {hint ? (
        <Text style={[type.caption, styles.sectionHint, { color: native.tertiaryLabel }]} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    paddingHorizontal: 2,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 72,
  },
  thumbCompact: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    lineHeight: 19,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    minWidth: 0,
  },
  metaDot: {
    flexShrink: 0,
  },
  metaText: {
    flex: 1,
    fontWeight: "600",
    fontSize: 11,
    lineHeight: 14,
  },
  chevron: {
    flexShrink: 0,
  },
})
