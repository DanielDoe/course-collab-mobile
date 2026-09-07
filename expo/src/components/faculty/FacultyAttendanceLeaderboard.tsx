import { useMemo } from "react"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { LinearGradient } from "expo-linear-gradient"
import type { AttendanceStudentSummary } from "../../lib/instructor-api"
import { formatAttendancePct } from "../../lib/faculty-attendance-utils"
import { FACULTY_ATTENDANCE_COLOR, facultyAttendanceStudentThumb } from "../../lib/faculty-attendance-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import type { AppThemeTokens } from "../../constants/app-themes"
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
  student,
  styles,
}: {
  rank: PodiumRank
  student: AttendanceStudentSummary
  styles: ReturnType<typeof createStyles>
}) {
  const tokens = useAppThemeTokens()
  const config = podiumRankStyle(rank, tokens.isDark)
  const barHeight = PODIUM_BAR_HEIGHT[rank]
  const streak = Number(student.current_streak ?? 0)
  return (
    <View style={styles.podiumCol} accessibilityLabel={`${student.full_name}, rank ${rank}`}>
      {rank === 1 ? (
        <View style={styles.crownWrap}>
          <Ionicons name="trophy" size={18} color={config.crown} />
        </View>
      ) : null}
      <View style={[styles.podiumAvatar, { backgroundColor: config.color, borderColor: config.color }]}>
        <Text style={[styles.podiumRank, { color: config.iconInk }]}>#{rank}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={2}>
        {student.full_name}
      </Text>
      <Text style={[styles.podiumScore, { color: FACULTY_ATTENDANCE_COLOR.trend }]}>
        {formatAttendancePct(student.attendance_percentage)}
      </Text>
      <Text style={styles.podiumMeta}>
        {streak > 0 ? `${streak}d streak` : student.student_id}
      </Text>
      <View style={[styles.podiumBar, { height: barHeight, backgroundColor: config.barWash }]}>
        <LinearGradient colors={config.barGradient} style={styles.podiumBarFill} />
      </View>
    </View>
  )
}

export function FacultyAttendanceLeaderboard({
  rows,
  compact = false,
  onSeeAll,
}: {
  rows: AttendanceStudentSummary[]
  compact?: boolean
  onSeeAll?: () => void
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const styles = useMemo(() => createStyles(tokens, native), [tokens, native])
  const podium = { first: rows[0], second: rows[1], third: rows[2] }
  const heroColors = podiumHeroGradient(tokens.isDark)
  const pager = useFacultyListPager(rows, `${compact}:${rows.length}:${rows[0]?.id ?? ""}`, "students")

  if (rows.length === 0) {
    return (
      <FacultyEmptyState
        icon="trophy-outline"
        title="No standings yet"
        body="The podium fills in after the first roll call."
      />
    )
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={heroColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="podium-outline" size={22} color="#ffffff" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Attendance podium</Text>
          <Text style={styles.heroSub}>
            {rows.length} student{rows.length === 1 ? "" : "s"} ranked by credit
          </Text>
        </View>
      </LinearGradient>

      {podium.first ? (
        <View style={styles.podiumRow}>
          {podium.second ? (
            <PodiumBlock rank={2} student={podium.second} styles={styles} />
          ) : (
            <View style={styles.podiumSpacer} />
          )}
          <PodiumBlock rank={1} student={podium.first} styles={styles} />
          {podium.third ? (
            <PodiumBlock rank={3} student={podium.third} styles={styles} />
          ) : (
            <View style={styles.podiumSpacer} />
          )}
        </View>
      ) : null}

      {compact && onSeeAll && rows.length > 3 ? (
        <Pressable
          style={styles.seeAll}
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel="See full attendance leaderboard"
        >
          <Text style={styles.seeAllText}>See full standings</Text>
          <Ionicons name="chevron-forward" size={16} color={FACULTY_ATTENDANCE_COLOR.link} />
        </Pressable>
      ) : null}

      {compact ? null : (
        <View style={styles.list}>
          {pager.items.map((student) => {
            const rank = rows.findIndex((row) => row.id === student.id) + 1
            const thumb =
              rank <= 3
                ? podiumRankSolidThumb(rank as PodiumRank)
                : facultyAttendanceStudentThumb(student.id)
            const streak = Number(student.current_streak ?? 0)
            return (
              <FacultySignatureListCard
                key={student.id}
                thumb={thumb}
                icon={rank === 1 ? "trophy-outline" : "person-outline"}
                title={student.full_name}
                eyebrow={student.student_id}
                metaLine={streak > 0 ? `${streak}-day streak` : undefined}
                accentLine={{
                  text: formatAttendancePct(student.attendance_percentage),
                  color: FACULTY_ATTENDANCE_COLOR.trend,
                }}
                status={{
                  label: `#${rank}`,
                  color:
                    rank === 1
                      ? FACULTY_ATTENDANCE_COLOR.trend
                      : rank <= 3
                        ? FACULTY_ATTENDANCE_COLOR.meeting
                        : FACULTY_ATTENDANCE_COLOR.link,
                  icon: rank === 1 ? "trophy-outline" : rank <= 3 ? "medal-outline" : "ellipse",
                }}
              />
            )
          })}
          <FacultyListPagerFooter pager={pager} />
        </View>
      )}
    </View>
  )
}

function createStyles(tokens: AppThemeTokens, native: ReturnType<typeof useThemedNative>) {
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
    podiumMeta: {
      fontSize: 11,
      fontWeight: "500",
      color: native.secondaryLabel,
      textAlign: "center",
    },
    podiumBar: {
      width: "100%",
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      overflow: "hidden",
    },
    podiumBarFill: { flex: 1, width: "100%" },
    seeAll: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 4,
    },
    seeAllText: { fontSize: 15, fontWeight: "600", color: FACULTY_ATTENDANCE_COLOR.link },
    list: { gap: 12 },
  })
}
