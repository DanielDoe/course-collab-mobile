import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerBadge } from "../../lib/summer-camp-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"

type Props = {
  badge: SummerBadge
  onPress?: () => void
  last?: boolean
  lockedLabel?: string
}

export function SummerBadgeListCard({ badge, onPress, last, lockedLabel = "Locked" }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const iconColor = badge.earned ? tokens.success : native.tertiaryLabel
  const iconBg = badge.earned ? `${tokens.success}18` : native.fill

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
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          {badge.earned ? (
            <Text style={styles.emoji}>{badge.emoji}</Text>
          ) : (
            <Ionicons name="lock-closed-outline" size={16} color={iconColor} />
          )}
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
              {badge.title}
            </Text>
            <FacultyStatusPill
              label={badge.earned ? "Earned" : lockedLabel}
              tone={badge.earned ? "success" : "neutral"}
            />
          </View>
          {badge.description ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
              {badge.description}
            </Text>
          ) : null}
        </View>
      </View>

      {onPress ? (
        <View style={styles.footer}>
          <Text style={[type.footnote, { color: native.tint, fontWeight: "600" }]}>View badge</Text>
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
  emoji: { fontSize: 18, lineHeight: 22 },
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
