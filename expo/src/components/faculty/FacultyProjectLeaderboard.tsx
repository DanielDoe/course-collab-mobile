import { useEffect, useMemo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { LinearGradient } from "expo-linear-gradient"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"
import type { ProjectLeaderboardEntry, ProjectLeaderboardStats } from "../../lib/instructor-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { type AppThemeTokens } from "../../constants/app-themes"
import { FACULTY_PROJECTS_COLOR, facultyProjectPanelThumbFor } from "../../lib/faculty-projects-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { semanticSoft, useNativeType } from "../../lib/themed-module-theme"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import {
  PODIUM_BAR_HEIGHT_TALL,
  podiumHeroGradient,
  podiumRankStyle,
  type PodiumRank,
} from "../../lib/leaderboard-podium-theme"

function projectScore(entry: ProjectLeaderboardEntry): number {
  return Math.round(entry.totalScore ?? entry.engagementScore ?? 0)
}

function AnimatedPodiumBlock({
  entry,
  rank,
  delayMs,
  onPress,
  styles,
  tokens,
}: {
  entry: ProjectLeaderboardEntry
  rank: PodiumRank
  delayMs: number
  onPress: () => void
  styles: ReturnType<typeof createLeaderboardStyles>
  tokens: AppThemeTokens
}) {
  const config = podiumRankStyle(rank, tokens.isDark)
  const barHeight = PODIUM_BAR_HEIGHT_TALL[rank]
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(24)
  const barScale = useSharedValue(0)

  useEffect(() => {
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }))
    translateY.value = withDelay(delayMs, withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }))
    barScale.value = withDelay(
      delayMs + 120,
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }),
    )
  }, [barScale, delayMs, opacity, translateY])

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  const barStyle = useAnimatedStyle(() => ({
    height: barHeight * barScale.value,
  }))

  return (
    <Animated.View style={[styles.podiumCol, containerStyle]}>
      <Pressable
        onPress={onPress}
        style={styles.podiumPressable}
        accessibilityRole="button"
        accessibilityLabel={`${entry.title}, rank ${rank}, ${projectScore(entry)} points`}
      >
        {rank === 1 ? (
          <View style={styles.crownWrap}>
            <Ionicons name="trophy" size={18} color={config.crown} />
          </View>
        ) : null}
        <View style={[styles.podiumAvatar, { backgroundColor: config.color, borderColor: config.color }]}>
          <Ionicons name={config.icon} size={rank === 1 ? 22 : 18} color={config.iconInk} />
        </View>
        <Text style={[styles.podiumRank, { color: config.color }]}>#{rank}</Text>
        <Text style={styles.podiumName} numberOfLines={3}>
          {entry.title}
        </Text>
        <Text style={styles.podiumGroup} numberOfLines={1}>
          {entry.groupName}
        </Text>
        <Text style={styles.podiumScore}>{projectScore(entry)} pts</Text>
        <Animated.View
          style={[styles.podiumBar, { backgroundColor: config.barWash, minHeight: 0 }, barStyle]}
        >
          <LinearGradient colors={config.barGradient} style={styles.podiumBarFill} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  )
}

function LeaderboardRow({
  entry,
  onPress,
  styles,
  chevronColor,
}: {
  entry: ProjectLeaderboardEntry
  onPress: () => void
  styles: ReturnType<typeof createLeaderboardStyles>
  chevronColor: string
}) {
  const type = useNativeType()
  const rankThumb = facultyProjectPanelThumbFor("leaderboard", String(entry.id))

  return (
    <FacultySignatureListCard
      thumb={rankThumb}
      thumbChild={
        <Text style={[type.caption, { color: rankThumb.icon, fontWeight: "800", fontSize: 11 }]}>
          #{entry.rank}
        </Text>
      }
      title={entry.title}
      metaLine={`${entry.groupName} · ${entry.session}${entry.leaderName ? ` · ${entry.leaderName}` : ""}`}
      trailing={
        <View style={styles.trailing}>
          <View style={styles.scorePill}>
            <Ionicons name="star" size={12} color={FACULTY_PROJECTS_COLOR.scoreStar} />
            <Text style={styles.score}>{projectScore(entry)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={chevronColor} />
        </View>
      }
      onPress={onPress}
    />
  )
}

export function FacultyProjectLeaderboard({
  entries,
  stats,
  onSelect,
}: {
  entries: ProjectLeaderboardEntry[]
  stats?: ProjectLeaderboardStats | null
  onSelect: (entry: ProjectLeaderboardEntry) => void
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const styles = useMemo(() => createLeaderboardStyles(tokens, native), [tokens, native])

  const podium = useMemo(() => {
    const top = entries.slice(0, 3)
    return { second: top[1], first: top[0], third: top[2] }
  }, [entries])

  const rest = useMemo(() => entries.slice(3), [entries])

  const heroColors = podiumHeroGradient(tokens.isDark)

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={heroColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="podium" size={22} color="#ffffff" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Project rankings</Text>
          <Text style={styles.heroSub}>
            {stats?.totalProjects ?? entries.length} project{(stats?.totalProjects ?? entries.length) === 1 ? "" : "s"}
            {stats?.maxEngagement ? ` · Top score ${stats.maxEngagement}/50` : ""}
          </Text>
        </View>
      </LinearGradient>

      {podium.first ? (
        <View style={styles.podiumRow}>
          {podium.second ? (
            <AnimatedPodiumBlock
              entry={podium.second}
              rank={2}
              delayMs={80}
              onPress={() => onSelect(podium.second!)}
              styles={styles}
              tokens={tokens}
            />
          ) : (
            <View style={styles.podiumSpacer} />
          )}
          <AnimatedPodiumBlock
            entry={podium.first}
            rank={1}
            delayMs={0}
            onPress={() => onSelect(podium.first!)}
            styles={styles}
            tokens={tokens}
          />
          {podium.third ? (
            <AnimatedPodiumBlock
              entry={podium.third}
              rank={3}
              delayMs={160}
              onPress={() => onSelect(podium.third!)}
              styles={styles}
              tokens={tokens}
            />
          ) : (
            <View style={styles.podiumSpacer} />
          )}
        </View>
      ) : null}

      {entries.length < 3 && entries.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.listTitle}>Rankings</Text>
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              onPress={() => onSelect(entry)}
              styles={styles}
              chevronColor={native.tertiaryLabel}
            />
          ))}
        </View>
      ) : null}

      {rest.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.listTitle}>All projects</Text>
          {rest.map((entry) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              onPress={() => onSelect(entry)}
              styles={styles}
              chevronColor={native.tertiaryLabel}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function createLeaderboardStyles(
  tokens: AppThemeTokens,
  native: ReturnType<typeof useThemedNative>,
) {
  return StyleSheet.create({
    wrap: { gap: 16 },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 16,
      padding: 16,
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
    heroTitle: { fontSize: 18, fontWeight: "600", color: "#ffffff" },
    heroSub: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.88)" },
    podiumRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 10,
      paddingTop: 8,
      paddingHorizontal: 4,
    },
    podiumSpacer: { width: 88 },
    podiumCol: { flex: 1, alignItems: "center", minWidth: 0, paddingHorizontal: 2 },
    podiumPressable: { alignItems: "center", gap: 6, width: "100%" },
    crownWrap: { marginBottom: -4 },
    podiumAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    podiumRank: { fontSize: 12, fontWeight: "600" },
    podiumName: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "600",
      color: native.label,
      textAlign: "center",
      minHeight: 48,
      width: "100%",
    },
    podiumGroup: {
      fontSize: 10,
      fontWeight: "600",
      color: native.secondaryLabel,
      textAlign: "center",
    },
    podiumScore: { fontSize: 11, fontWeight: "700", color: FACULTY_PROJECTS_COLOR.totalScore },
    podiumBar: {
      width: "100%",
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      overflow: "hidden",
    },
    podiumBarFill: { flex: 1, width: "100%" },
    list: { gap: 8 },
    listTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: native.label,
      marginBottom: 2,
    },
    trailing: { flexDirection: "row", alignItems: "center", gap: 8 },
    scorePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: NATIVE.sectionRadius,
      backgroundColor: semanticSoft(FACULTY_PROJECTS_COLOR.scoreStar, tokens.isDark),
    },
    score: { fontSize: 13, fontWeight: "600", color: native.label },
  })
}
