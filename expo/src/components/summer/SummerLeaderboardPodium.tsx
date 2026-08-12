import { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { LinearGradient } from "expo-linear-gradient"
import type { SummerLeaderboardEntry } from "../../lib/summer-camp-api"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import type { AppThemeTokens } from "../../constants/app-themes"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  PODIUM_BAR_HEIGHT,
  podiumHeroGradient,
  podiumRankStyle,
  type PodiumRank,
} from "../../lib/leaderboard-podium-theme"

function formatXp(xp: number): string {
  return `${xp.toLocaleString()} XP`
}

function PodiumSpot({
  rank,
  entry,
  styles,
}: {
  rank: PodiumRank
  entry: SummerLeaderboardEntry
  styles: ReturnType<typeof createPodiumStyles>
}) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const config = podiumRankStyle(rank, tokens.isDark)
  const barHeight = PODIUM_BAR_HEIGHT[rank]

  return (
    <View style={styles.col}>
      {rank === 1 ? (
        <View style={styles.crownWrap}>
          <Ionicons name="trophy" size={18} color={config.crown} />
        </View>
      ) : null}
      <View style={[styles.avatar, { backgroundColor: config.color, borderColor: config.color }]}>
        <Text style={[type.caption, styles.rankLabel, { color: config.iconInk }]}>#{rank}</Text>
      </View>
      <Text style={[type.caption, styles.name, { color: tokens.isDark ? "#f8fafc" : "#0f172a" }]} numberOfLines={2}>
        {entry.full_name}
      </Text>
      {entry.is_current_user ? (
        <Text style={[type.footnote, styles.youLabel, { color: tokens.accent }]}>You</Text>
      ) : null}
      <Text style={[type.footnote, styles.xp, { color: tokens.isDark ? "#cbd5e1" : "#64748b" }]}>
        {formatXp(entry.total_xp)}
      </Text>
      <View style={[styles.bar, { height: barHeight, backgroundColor: config.barWash }]}>
        <LinearGradient colors={config.barGradient} style={styles.barFill} />
      </View>
    </View>
  )
}

type Props = {
  entries: SummerLeaderboardEntry[]
}

export function SummerLeaderboardPodium({ entries }: Props) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const styles = useMemo(() => createPodiumStyles(tokens), [tokens])

  const first = entries.find((entry) => entry.rank === 1)
  const second = entries.find((entry) => entry.rank === 2)
  const third = entries.find((entry) => entry.rank === 3)

  if (!first) return null

  const heroColors = podiumHeroGradient(tokens.isDark)

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={heroColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="podium-outline" size={22} color="#ffffff" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[type.bodyEmphasis, styles.heroTitle]}>Top campers</Text>
          <Text style={[type.caption, styles.heroSub]}>
            {entries.length} ranked · earn XP to climb
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.row}>
        {second ? (
          <PodiumSpot rank={2} entry={second} styles={styles} />
        ) : (
          <View style={styles.spacer} />
        )}
        <PodiumSpot rank={1} entry={first} styles={styles} />
        {third ? (
          <PodiumSpot rank={3} entry={third} styles={styles} />
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </View>
  )
}

function createPodiumStyles(tokens: AppThemeTokens) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 16,
    },
    heroIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    heroCopy: { flex: 1, gap: 2 },
    heroTitle: { color: "#ffffff", fontSize: 17 },
    heroSub: { color: "rgba(255,255,255,0.82)" },
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 8,
      paddingBottom: 4,
    },
    col: { flex: 1, alignItems: "center", gap: 4, maxWidth: 120 },
    spacer: { flex: 1, maxWidth: 120 },
    crownWrap: { height: 22, alignItems: "center", justifyContent: "center" },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    rankLabel: { fontWeight: "700", fontSize: 13 },
    name: { textAlign: "center", fontWeight: "600", minHeight: 32 },
    youLabel: { fontWeight: "700" },
    xp: { fontWeight: "600" },
    bar: {
      width: "100%",
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      overflow: "hidden",
      marginTop: 4,
    },
    barFill: { flex: 1 },
  })
}
