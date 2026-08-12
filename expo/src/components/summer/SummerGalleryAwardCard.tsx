import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerGalleryAward, SummerGalleryLeaderboardEntry } from "../../lib/summer-camp-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"

export function SummerGalleryAwardCard({
  award,
  onPress,
  last,
}: {
  award: SummerGalleryAward
  onPress?: () => void
  last?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

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
        <View style={[styles.iconWrap, { backgroundColor: `${tokens.warning}18` }]}>
          <Ionicons name="ribbon-outline" size={18} color={tokens.warning} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
              {award.title}
            </Text>
            {award.award_label ? <FacultyStatusPill label={award.award_label} tone="warning" /> : null}
          </View>
          {award.student_name ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
              {award.student_name}
            </Text>
          ) : null}
        </View>
      </View>
      {onPress ? (
        <View style={styles.footer}>
          <Text style={[type.footnote, { color: native.tint, fontWeight: "600" }]}>View award</Text>
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
        </View>
      ) : null}
    </Pressable>
  )
}

export function SummerGalleryLeaderboardCard({
  entry,
  onPress,
  last,
}: {
  entry: SummerGalleryLeaderboardEntry
  onPress?: () => void
  last?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const votes = entry.votes ?? entry.total_votes

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
        <View style={[styles.rankWrap, { backgroundColor: native.fill }]}>
          <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>#{entry.rank || "—"}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={1}>
            {entry.student_name}
          </Text>
          {entry.project_title ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
              {entry.project_title}
            </Text>
          ) : null}
        </View>
        {votes != null ? (
          <View style={styles.votes}>
            <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>{votes}</Text>
            <Text style={[type.footnote, { color: native.tertiaryLabel }]}>votes</Text>
          </View>
        ) : null}
      </View>
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
  rankWrap: {
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
  votes: { alignItems: "flex-end", gap: 2 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 48,
    paddingTop: 2,
  },
})
