import { useMemo } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { LinearGradient } from "expo-linear-gradient"
import type {
  PlaygroundLeaderboardEntry,
  PlaygroundLeaderboardStats,
} from "../../lib/instructor-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { semanticSoft } from "../../lib/themed-module-theme"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import {
  FACULTY_PLAYGROUND_COLOR,
  facultyPlaygroundLeaderboardThumb,
} from "../../lib/faculty-playground-theme"
import { APP_BUTTON_RADIUS } from "../../constants/app-button"
import {
  PODIUM_BAR_HEIGHT_TALL,
  podiumHeroGradient,
  podiumRankStyle,
  type PodiumRank,
} from "../../lib/leaderboard-podium-theme"

function StatTile({ label, value }: { label: string; value: string }) {
  const { native, type } = useModuleTheme()
  return (
    <View style={[styles.statTile, { backgroundColor: native.fill, borderColor: native.separator }]}>
      <Text style={[type.bodyEmphasis, { fontSize: 16, color: native.label }]}>{value}</Text>
      <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>{label}</Text>
    </View>
  )
}

function PodiumBlock({
  rank,
  name,
  score,
}: {
  rank: PodiumRank
  name: string
  score: number
}) {
  const { native, type, tokens } = useModuleTheme()
  const config = podiumRankStyle(rank, tokens.isDark)
  const barHeight = PODIUM_BAR_HEIGHT_TALL[rank]
  return (
    <View style={styles.podiumCol}>
      {rank === 1 ? (
        <View style={styles.crownWrap}>
          <Ionicons name="trophy" size={18} color={config.crown} />
        </View>
      ) : null}
      <View style={[styles.podiumAvatar, { backgroundColor: config.color, borderColor: config.color }]}>
        <Ionicons name={config.icon} size={rank === 1 ? 22 : 18} color={config.iconInk} />
      </View>
      <Text style={[styles.podiumRank, { color: config.color }]}>#{rank}</Text>
      <Text style={[type.caption, styles.podiumName, { color: native.label }]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[type.caption, { color: FACULTY_PLAYGROUND_COLOR.scoreStar, fontWeight: "700" }]}>
        {score} pts
      </Text>
      <View style={[styles.podiumBar, { height: barHeight, backgroundColor: config.barWash }]}>
        <LinearGradient colors={config.barGradient} style={styles.podiumBarFill} />
      </View>
    </View>
  )
}

function leaderboardStatusMeta(
  status: PlaygroundLeaderboardEntry["status"],
): { label: string; color: string; icon: "time-outline" | "checkmark-circle-outline" | "flash-outline" } {
  if (status === "waiting") {
    return { label: "Waiting", color: FACULTY_PLAYGROUND_COLOR.waiting, icon: "time-outline" }
  }
  if (status === "completed") {
    return { label: "Done", color: FACULTY_PLAYGROUND_COLOR.success, icon: "checkmark-circle-outline" }
  }
  return { label: "Playing", color: FACULTY_PLAYGROUND_COLOR.playing, icon: "flash-outline" }
}

function sortPodiumEntries(entries: PlaygroundLeaderboardEntry[]): PlaygroundLeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (a.rank != null && b.rank != null && a.rank !== b.rank) return a.rank - b.rank
    if (b.score !== a.score) return b.score - a.score
    return (a.displayName || a.studentName).localeCompare(b.displayName || b.studentName)
  })
}

export function FacultyPlaygroundLeaderboard({
  loading,
  refreshing = false,
  entries,
  stats,
  compact,
}: {
  loading: boolean
  refreshing?: boolean
  entries: PlaygroundLeaderboardEntry[]
  stats: PlaygroundLeaderboardStats | null
  compact?: boolean
}) {
  const { native, tokens, type } = useModuleTheme()

  const sorted = useMemo(() => sortPodiumEntries(entries), [entries])

  const podium = useMemo(() => {
    const top = sorted.slice(0, 3)
    return { second: top[1], first: top[0], third: top[2] }
  }, [sorted])

  if (loading && entries.length === 0) {
    return <ActivityIndicator color={FACULTY_PLAYGROUND_COLOR.link} style={{ marginVertical: 24 }} />
  }

  if (entries.length === 0) {
    return (
      <FacultyEmptyState
        icon="podium-outline"
        title="No scores yet"
        body="Leaderboard appears once students join and play."
      />
    )
  }

  return (
    <View style={styles.wrap}>
      {refreshing ? (
        <View style={[styles.refreshRow, { backgroundColor: native.fill, borderColor: native.separator }]}>
          <ActivityIndicator size="small" color={FACULTY_PLAYGROUND_COLOR.link} />
          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
            Updating scores…
          </Text>
        </View>
      ) : null}
      <LinearGradient
        colors={podiumHeroGradient(tokens.isDark)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroIcon}>
          <Ionicons name="podium" size={22} color="#ffffff" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Leaderboard</Text>
          <Text style={styles.heroSub}>
            {stats?.uniqueStudents ?? entries.length} player
            {(stats?.uniqueStudents ?? entries.length) === 1 ? "" : "s"}
            {stats?.maxScore ? ` · Top score ${stats.maxScore}` : ""}
          </Text>
        </View>
      </LinearGradient>

      {!compact && stats ? (
        <View style={styles.statsRow}>
          <StatTile label="Players" value={String(stats.uniqueStudents)} />
          <StatTile label="Waiting" value={String(stats.waitingParticipants)} />
          <StatTile label="Avg score" value={stats.avgScore ? stats.avgScore.toFixed(0) : "0"} />
          <StatTile label="Top score" value={String(stats.maxScore)} />
        </View>
      ) : null}

      {podium.first ? (
        <View style={[styles.podiumRow, compact && styles.podiumRowCompact]}>
          {podium.second ? (
            <PodiumBlock
              rank={2}
              name={podium.second.displayName || podium.second.studentName}
              score={podium.second.score}
            />
          ) : (
            <View style={styles.podiumSpacer} />
          )}
          <PodiumBlock
            rank={1}
            name={podium.first.displayName || podium.first.studentName}
            score={podium.first.score}
          />
          {podium.third ? (
            <PodiumBlock
              rank={3}
              name={podium.third.displayName || podium.third.studentName}
              score={podium.third.score}
            />
          ) : (
            <View style={styles.podiumSpacer} />
          )}
        </View>
      ) : null}

      {!compact ? (
        <View style={styles.list}>
          <Text style={[type.caption, { color: native.label, fontWeight: "600", marginBottom: 2 }]}>
            All players
          </Text>
          {sorted.map((entry, index) => {
            const thumb = facultyPlaygroundLeaderboardThumb(String(entry.resultId))
            const displayRank = entry.rank ?? index + 1
            const status = leaderboardStatusMeta(entry.status)
            return (
              <FacultySignatureListCard
                key={entry.resultId}
                thumb={thumb}
                thumbChild={
                  <Text style={[type.caption, { color: thumb.icon, fontWeight: "800", fontSize: 11 }]}>
                    #{displayRank}
                  </Text>
                }
                title={entry.displayName || entry.studentName}
                description={`${entry.correctAnswers}/${entry.questionsAnswered} correct${
                  entry.accuracyPercentage ? ` · ${entry.accuracyPercentage.toFixed(0)}%` : ""
                }`}
                status={status}
                trailing={
                  <View style={[styles.scorePill, { backgroundColor: semanticSoft(FACULTY_PLAYGROUND_COLOR.scoreStar, tokens.isDark) }]}>
                    <Ionicons name="star" size={12} color={FACULTY_PLAYGROUND_COLOR.scoreStar} />
                    <Text style={[type.caption, { color: native.label, fontWeight: "600" }]}>{entry.score}</Text>
                  </View>
                }
              />
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: APP_BUTTON_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "center",
  },
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
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statTile: {
    flexGrow: 1,
    minWidth: "22%",
    borderRadius: 12,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  podiumRowCompact: { paddingTop: 0 },
  podiumSpacer: { width: 88 },
  podiumCol: { flex: 1, alignItems: "center", gap: 6, maxWidth: 112 },
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
    fontWeight: "700",
    textAlign: "center",
    minHeight: 32,
  },
  podiumBar: {
    width: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  podiumBarFill: { flex: 1, width: "100%" },
  list: { gap: 8 },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
})
