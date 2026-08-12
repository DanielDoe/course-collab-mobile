import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerLeaderboardEntry } from "../../lib/summer-camp-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { podiumRankColor, podiumRankBadgeBg } from "../../lib/leaderboard-podium-theme"

type Props = {
  entry: SummerLeaderboardEntry
  last?: boolean
}

export function SummerLeaderboardListCard({ entry, last }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const iconColor = podiumRankColor(entry.rank, tokens.isDark)
  const iconBg = podiumRankBadgeBg(entry.rank, tokens.isDark) ?? `${iconColor}18`
  const isYou = entry.is_current_user === true

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: native.separator },
        isYou && { backgroundColor: tokens.accentSoft },
        last && styles.rowLast,
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.rankBadge, { backgroundColor: iconBg }]}>
          <Text style={[type.caption, styles.rankText, { color: iconColor }]}>#{entry.rank}</Text>
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={1}>
              {entry.full_name}
            </Text>
            {isYou ? <FacultyStatusPill label="You" tone="live" /> : null}
          </View>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            {entry.total_xp.toLocaleString()} XP
            {entry.modules_completed != null ? ` · ${entry.modules_completed} modules` : ""}
            {entry.badges_earned != null ? ` · ${entry.badges_earned} badges` : ""}
          </Text>
        </View>
        <Ionicons name="trophy-outline" size={18} color={iconColor} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rankText: { fontWeight: "700", fontSize: 13 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { flex: 1, fontSize: 16, lineHeight: 21 },
})
