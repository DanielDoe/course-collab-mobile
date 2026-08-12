import { useMemo } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { LinearGradient } from "expo-linear-gradient"
import type { ClassroomPointsSummaryRow } from "../../lib/instructor-api"
import { formatClassroomPoints } from "../../lib/faculty-classroom-points-utils"
import {
  FACULTY_CLASSROOM_POINTS_COLOR,
  facultyClassroomLeaderboardThumb,
} from "../../lib/faculty-classroom-points-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { type AppThemeTokens } from "../../constants/app-themes"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import {
  PODIUM_BAR_HEIGHT,
  podiumHeroGradient,
  podiumRankSolidThumb,
  podiumRankStyle,
  type PodiumRank,
} from "../../lib/leaderboard-podium-theme"

function PodiumBlock({
  rank,
  name,
  points,
  styles,
}: {
  rank: PodiumRank
  name: string
  points: string
  styles: ReturnType<typeof createLeaderboardStyles>
}) {
  const tokens = useAppThemeTokens()
  const config = podiumRankStyle(rank, tokens.isDark)
  const barHeight = PODIUM_BAR_HEIGHT[rank]
  return (
    <View style={styles.podiumCol}>
      {rank === 1 ? (
        <View style={styles.crownWrap}>
          <Ionicons name="trophy" size={18} color={config.crown} />
        </View>
      ) : null}
      <View style={[styles.podiumAvatar, { backgroundColor: config.color, borderColor: config.color }]}>
        <Text style={[styles.podiumRank, { color: config.iconInk }]}>#{rank}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[styles.podiumScore, { color: FACULTY_CLASSROOM_POINTS_COLOR.points }]}>{points} pts</Text>
      <View style={[styles.podiumBar, { height: barHeight, backgroundColor: config.barWash }]}>
        <LinearGradient colors={config.barGradient} style={styles.podiumBarFill} />
      </View>
    </View>
  )
}

export function FacultyClassroomPointsLeaderboard({
  loading,
  rows,
  search,
}: {
  loading: boolean
  rows: ClassroomPointsSummaryRow[]
  search?: string
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const styles = useMemo(() => createLeaderboardStyles(tokens, native), [tokens, native])

  const ranked = useMemo(() => {
    const withPoints = rows.filter((r) => Number(r.total_points) > 0)
    return withPoints.sort((a, b) => Number(b.total_points) - Number(a.total_points))
  }, [rows])

  const filtered = useMemo(() => {
    const q = search?.trim().toLowerCase()
    if (!q) return ranked
    return ranked.filter((row) =>
      [row.full_name, row.student_number, row.session].join(" ").toLowerCase().includes(q),
    )
  }, [ranked, search])

  const podium = useMemo(
    () => ({
      first: filtered[0],
      second: filtered[1],
      third: filtered[2],
    }),
    [filtered],
  )

  const heroColors = podiumHeroGradient(tokens.isDark)

  if (loading) {
    return <ActivityIndicator color={FACULTY_CLASSROOM_POINTS_COLOR.link} style={{ marginVertical: 24 }} />
  }

  if (filtered.length === 0) {
    return (
      <FacultyEmptyState
        icon="trophy-outline"
        title="No standings yet"
        body="Leaderboard fills in as you approve classroom point awards."
      />
    )
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={heroColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="trophy" size={22} color="#ffffff" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Classroom points</Text>
          <Text style={styles.heroSub}>
            {filtered.length} student{filtered.length === 1 ? "" : "s"} ranked
          </Text>
        </View>
      </LinearGradient>

      {podium.first ? (
        <View style={styles.podiumRow}>
          {podium.second ? (
            <PodiumBlock
              rank={2}
              name={podium.second.full_name}
              points={formatClassroomPoints(podium.second.total_points)}
              styles={styles}
            />
          ) : (
            <View style={styles.podiumSpacer} />
          )}
          <PodiumBlock
            rank={1}
            name={podium.first.full_name}
            points={formatClassroomPoints(podium.first.total_points)}
            styles={styles}
          />
          {podium.third ? (
            <PodiumBlock
              rank={3}
              name={podium.third.full_name}
              points={formatClassroomPoints(podium.third.total_points)}
              styles={styles}
            />
          ) : (
            <View style={styles.podiumSpacer} />
          )}
        </View>
      ) : null}

      <View style={styles.list}>
        {filtered.map((row, index) => {
          const rank = index + 1
          const thumb =
            rank <= 3
              ? podiumRankSolidThumb(rank as PodiumRank)
              : facultyClassroomLeaderboardThumb(`${row.student_id}-${row.session}`)
          return (
            <FacultySignatureListCard
              key={`${row.student_id}-${row.session}`}
              thumb={thumb}
              icon={rank === 1 ? "trophy-outline" : "person-outline"}
              title={row.full_name}
              eyebrow={[row.student_number, row.session].filter(Boolean).join(" · ")}
              metaLine={`${row.award_count} award${row.award_count === 1 ? "" : "s"}`}
              accentLine={{
                text: `${formatClassroomPoints(row.total_points)} pts`,
                color: FACULTY_CLASSROOM_POINTS_COLOR.points,
              }}
              status={{
                label: `#${rank}`,
                color:
                  rank === 1
                    ? FACULTY_CLASSROOM_POINTS_COLOR.points
                    : rank <= 3
                      ? FACULTY_CLASSROOM_POINTS_COLOR.leaderboard
                      : FACULTY_CLASSROOM_POINTS_COLOR.link,
                icon: rank === 1 ? "trophy-outline" : rank <= 3 ? "medal-outline" : "ellipse",
              }}
            />
          )
        })}
      </View>
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
    heroTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff" },
    heroSub: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.88)" },
    podiumRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 4,
    },
    podiumSpacer: { width: 88 },
    podiumCol: { flex: 1, alignItems: "center", gap: 6, maxWidth: 100, minWidth: 88 },
    crownWrap: { marginBottom: -4 },
    podiumAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    podiumRank: { fontSize: 13, fontWeight: "700" },
    podiumName: {
      fontSize: 12,
      fontWeight: "700",
      color: native.label,
      textAlign: "center",
      minHeight: 32,
    },
    podiumScore: { fontSize: 11, fontWeight: "700" },
    podiumBar: {
      width: "100%",
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      overflow: "hidden",
    },
    podiumBarFill: { flex: 1, width: "100%" },
    list: { gap: 10 },
  })
}
