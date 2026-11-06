import { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { LinearGradient } from "expo-linear-gradient"
import type { ClassroomLeaderboardEntry } from "../../lib/rewards-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useRewardsTheme } from "./rewards-shared"
import {
  PODIUM_BAR_HEIGHT,
  podiumHeroGradient,
  podiumRankStyle,
  type PodiumRank,
} from "../../lib/leaderboard-podium-theme"
import {
  classroomLeaderboardDisplayName,
  classroomLeaderboardPointsLabel,
} from "./classroom-leaderboard-privacy"

function PodiumBlock({
  entry,
  rank,
  blurPeerNames,
}: {
  entry: ClassroomLeaderboardEntry
  rank: PodiumRank
  blurPeerNames: boolean
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const theme = useRewardsTheme()
  const config = podiumRankStyle(rank, tokens.isDark)
  const barHeight = PODIUM_BAR_HEIGHT[rank]
  const name = classroomLeaderboardDisplayName(entry, blurPeerNames)
  const place = Number(entry.rank) > 0 ? Number(entry.rank) : rank

  return (
    <View style={styles.podiumCol}>
      {rank === 1 ? (
        <View style={styles.crownWrap}>
          <Ionicons name="trophy" size={18} color={config.crown} />
        </View>
      ) : null}
      <View style={[styles.podiumAvatar, { backgroundColor: config.color, borderColor: config.color }]}>
        <Text style={[styles.podiumRank, { color: config.iconInk }]}>#{place}</Text>
      </View>
      <Text style={[type.caption, styles.podiumName, { color: native.label }]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[type.footnote, styles.podiumScore, { color: theme.primary }]}>
        {classroomLeaderboardPointsLabel(entry)}
      </Text>
      <View style={[styles.podiumBar, { height: barHeight, backgroundColor: config.barWash }]}>
        <LinearGradient colors={config.barGradient} style={styles.podiumBarFill} />
      </View>
    </View>
  )
}

type Props = {
  entries: ClassroomLeaderboardEntry[]
  blurPeerNames?: boolean
}

export function ClassroomPointsLeaderboardPodium({ entries, blurPeerNames = false }: Props) {
  const tokens = useAppThemeTokens()

  const podium = useMemo(() => {
    const top = entries.slice(0, 3)
    return { second: top[1], first: top[0], third: top[2] }
  }, [entries])

  if (!podium.first) return null

  const heroColors = podiumHeroGradient(tokens.isDark)

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={heroColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="podium-outline" size={22} color="#ffffff" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Top ranks</Text>
          <Text style={styles.heroSub}>Classroom points in your section</Text>
        </View>
      </LinearGradient>

      <View style={styles.podiumRow}>
        {podium.second ? (
          <PodiumBlock entry={podium.second} rank={2} blurPeerNames={blurPeerNames} />
        ) : (
          <View style={styles.podiumSpacer} />
        )}
        <PodiumBlock entry={podium.first} rank={1} blurPeerNames={blurPeerNames} />
        {podium.third ? (
          <PodiumBlock entry={podium.third} rank={3} blurPeerNames={blurPeerNames} />
        ) : (
          <View style={styles.podiumSpacer} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginBottom: 4 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1, gap: 2 },
  heroTitle: { fontSize: 17, fontWeight: "600", color: "#ffffff" },
  heroSub: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.88)" },
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  podiumSpacer: { flex: 1, maxWidth: 100 },
  podiumCol: { flex: 1, alignItems: "center", gap: 4, maxWidth: 112 },
  crownWrap: { marginBottom: -2 },
  podiumAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumRank: { fontSize: 12, fontWeight: "700" },
  podiumName: {
    fontWeight: "600",
    textAlign: "center",
    minHeight: 32,
    lineHeight: 16,
  },
  podiumScore: { fontWeight: "700", textAlign: "center" },
  podiumBar: {
    width: "100%",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
    marginTop: 2,
  },
  podiumBarFill: { flex: 1, width: "100%" },
})
