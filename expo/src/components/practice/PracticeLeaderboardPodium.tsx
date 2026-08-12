import { useEffect, useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { LinearGradient } from "expo-linear-gradient"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"
import type { LeaderboardEntry } from "../../lib/practice-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { type AppThemeTokens } from "../../constants/app-themes"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  leaderboardDisplayName,
  leaderboardPointsLabel,
  leaderboardScoreLabel,
  leaderboardStreak,
  isLeaderboardPeerBlurred,
  type PracticeLeaderboardViewOptions,
} from "./practice-leaderboard-utils"
import {
  PODIUM_BAR_HEIGHT,
  podiumHeroGradient,
  podiumRankStyle,
  type PodiumRank,
} from "../../lib/leaderboard-podium-theme"

function AnimatedPodiumBlock({
  entry,
  rank,
  delayMs,
  tokens,
  native,
  viewOptions,
}: {
  entry: LeaderboardEntry
  rank: PodiumRank
  delayMs: number
  tokens: AppThemeTokens
  native: ReturnType<typeof useThemedNative>
  viewOptions: PracticeLeaderboardViewOptions
}) {
  const type = useNativeType()
  const config = podiumRankStyle(rank, tokens.isDark)
  const barHeight = PODIUM_BAR_HEIGHT[rank]
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(20)
  const barScale = useSharedValue(0)
  const blurred = isLeaderboardPeerBlurred(entry, viewOptions.blurPeerNames)

  useEffect(() => {
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }))
    translateY.value = withDelay(delayMs, withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }))
    barScale.value = withDelay(
      delayMs + 100,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    )
  }, [barScale, delayMs, opacity, translateY])

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  const barStyle = useAnimatedStyle(() => ({
    height: barHeight * barScale.value,
  }))

  const name = leaderboardDisplayName(entry, viewOptions)
  const pointsLabel = leaderboardPointsLabel(entry, viewOptions)
  const scoreLabel = leaderboardScoreLabel(entry, viewOptions)

  return (
    <Animated.View style={[styles.podiumCol, containerStyle]}>
      {rank === 1 ? (
        <View style={styles.crownWrap}>
          <Ionicons name="trophy" size={18} color={config.crown} />
        </View>
      ) : null}
      <View style={[styles.podiumAvatar, { backgroundColor: config.color, borderColor: config.color }]}>
        <Ionicons name={config.icon} size={rank === 1 ? 22 : 18} color={config.iconInk} />
      </View>
      <Text style={[styles.podiumRank, { color: config.color }]}>
        {blurred ? "Hidden" : `#${rank}`}
      </Text>
      <Text style={[type.caption, styles.podiumName, { color: native.label }]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[type.footnote, styles.podiumMeta, { color: native.secondaryLabel }]}>
        {blurred ? "Details hidden" : pointsLabel}
      </Text>
      {scoreLabel ? (
        <Text style={[type.footnote, styles.podiumScore, { color: tokens.accent }]}>{scoreLabel}</Text>
      ) : null}
      <Animated.View style={[styles.podiumBar, { backgroundColor: config.barWash }, barStyle]}>
        <LinearGradient colors={config.barGradient} style={styles.podiumBarFill} />
      </Animated.View>
      {entry.is_current_user ? (
        <Text style={[type.footnote, styles.youBadge, { color: tokens.accent }]}>You</Text>
      ) : blurred ? null : (
        <Text style={[type.footnote, styles.streakHint, { color: native.tertiaryLabel }]}>
          {leaderboardStreak(entry)}d streak
        </Text>
      )}
    </Animated.View>
  )
}

type Props = {
  entries: LeaderboardEntry[]
  viewOptions: PracticeLeaderboardViewOptions
}

export function PracticeLeaderboardPodium({ entries, viewOptions }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()

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
          <Text style={styles.heroTitle}>Top performers</Text>
          <Text style={styles.heroSub}>Weekly practice rankings in your section</Text>
        </View>
      </LinearGradient>

      <View style={styles.podiumRow}>
        {podium.second ? (
          <AnimatedPodiumBlock
            entry={podium.second}
            rank={2}
            delayMs={90}
            tokens={tokens}
            native={native}
            viewOptions={viewOptions}
          />
        ) : (
          <View style={styles.podiumSpacer} />
        )}
        <AnimatedPodiumBlock
          entry={podium.first}
          rank={1}
          delayMs={0}
          tokens={tokens}
          native={native}
          viewOptions={viewOptions}
        />
        {podium.third ? (
          <AnimatedPodiumBlock
            entry={podium.third}
            rank={3}
            delayMs={180}
            tokens={tokens}
            native={native}
            viewOptions={viewOptions}
          />
        ) : (
          <View style={styles.podiumSpacer} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
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
  podiumMeta: { fontWeight: "600", textAlign: "center" },
  podiumScore: { fontWeight: "700", textAlign: "center" },
  podiumBar: {
    width: "100%",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
    marginTop: 2,
  },
  podiumBarFill: { flex: 1, width: "100%" },
  youBadge: { fontWeight: "700", marginTop: 2 },
  streakHint: { marginTop: 2 },
})
