import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { pushStudentAppHref } from "../../lib/student-app-href"
import Svg, { Rect } from "react-native-svg"
import { Ionicons } from "@/components/icons/AppIcon"
import type { StudentDashboardStats } from "../../types/dashboard"
import { DashboardCard } from "./DashboardCard"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { useNativeType } from "../../lib/themed-module-theme"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { DASHBOARD_ENGAGEMENT, type DashboardEngagementId } from "../../lib/dashboard-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

type EngagementVariant = DashboardEngagementId

type EngagementStat = {
  id: EngagementVariant
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  progress: number
  href: string
  streakDays?: number
}

const STREAK_DOT_COUNT = 8
const POINTS_VISUAL_MAX = 250

function buildEngagementStats(stats: StudentDashboardStats): EngagementStat[] {
  const unavailable = stats.unavailable ?? {}
  const streakLabel =
    stats.attendanceStreak === 1 ? "1 day" : `${stats.attendanceStreak} days`

  return [
    {
      id: "points",
      icon: "flash-outline",
      label: "Classroom points",
      value: unavailable.points ? "—" : formatPoints(stats.classroomPoints),
      progress: unavailable.points ? 0 : Math.min(stats.classroomPoints / POINTS_VISUAL_MAX, 1),
      href: "/module/classroom-points",
    },
    {
      id: "streak",
      icon: "flame-outline",
      label: "Attendance streak",
      value: unavailable.streaks ? "—" : streakLabel,
      progress: unavailable.streaks ? 0 : Math.min(stats.attendanceStreak / STREAK_DOT_COUNT, 1),
      streakDays: unavailable.streaks ? 0 : stats.attendanceStreak,
      href: "/module/attendance",
    },
    {
      id: "credits",
      icon: "sparkles-outline",
      label: "Engagement credits",
      value: unavailable.grade ? "—" : `${stats.engagementCredits}/100`,
      progress: unavailable.grade ? 0 : Math.min(stats.engagementCredits / 100, 1),
      href: "/module/grades?focus=engagement",
    },
    {
      id: "attendance",
      icon: "shield-checkmark-outline",
      label: "Attendance",
      value: unavailable.attendance ? "—" : `${stats.attendancePct}%`,
      progress: unavailable.attendance ? 0 : Math.min(stats.attendancePct / 100, 1),
      href: "/module/attendance",
    },
  ]
}

export function EngagementStats({ stats }: { stats: StudentDashboardStats }) {
  const items = buildEngagementStats(stats)

  return (
    <DashboardCard title="Engagement" subtitle="Participation, points, and streaks">
      <View style={styles.grid}>
        {items.map((item) => (
          <EngagementTile key={item.id} {...item} />
        ))}
      </View>
    </DashboardCard>
  )
}

function EngagementTile({
  id,
  icon,
  label,
  value,
  progress,
  href,
  streakDays = 0,
}: EngagementStat) {
  const router = useRouter()
  const type = useNativeType()
  const cardLayout = useKpiGridCardStyle("47.5%")
  const theme = DASHBOARD_ENGAGEMENT[id]
  const surface = theme.surface()

  return (
    <Pressable
      onPress={() => pushStudentAppHref(router, href)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${label}`}
      style={[styles.stat, cardLayout, { backgroundColor: surface.background, borderColor: surface.border }]}
    >
      <TileDecoration variant={id} color={surface.deco} />

      <SolidListThumbTile thumb={surface.iconThumb} icon={icon} size="compact" style={styles.iconTile} />

      <Text style={[styles.value, { color: surface.value }]}>{value}</Text>
      <Text style={[type.footnote, styles.label, { color: surface.label }]}>{label}</Text>

      <TileProgress
        variant={id}
        trackColor={surface.progressTrack}
        fillColor={surface.progressFill}
        progress={progress}
        streakDays={streakDays}
      />
    </Pressable>
  )
}

function TileDecoration({
  variant,
  color,
}: {
  variant: EngagementVariant
  color: string
}) {
  switch (variant) {
    case "points":
      return <PointsChartDeco color={color} />
    case "streak":
      return (
        <View style={styles.decoIcon} pointerEvents="none">
          <Ionicons name="flame-outline" size={62} color={color} />
        </View>
      )
    case "credits":
      return (
        <View style={styles.decoIcon} pointerEvents="none">
          <Ionicons name="sparkles-outline" size={68} color={color} />
        </View>
      )
    case "attendance":
      return (
        <View style={styles.decoIcon} pointerEvents="none">
          <Ionicons name="shield-checkmark-outline" size={60} color={color} />
        </View>
      )
  }
}

function PointsChartDeco({ color }: { color: string }) {
  const bars = [12, 18, 22, 28, 36]

  return (
    <Svg width={62} height={44} viewBox="0 0 62 44" style={styles.decoChart} pointerEvents="none">
      {bars.map((height, index) => (
        <Rect
          key={height}
          x={6 + index * 11}
          y={44 - height}
          width={8}
          height={height}
          rx={4}
          fill={color}
          opacity={index === bars.length - 1 ? 0.55 : 0.22 + index * 0.05}
        />
      ))}
    </Svg>
  )
}

function TileProgress({
  variant,
  trackColor,
  fillColor,
  progress,
  streakDays,
}: {
  variant: EngagementVariant
  trackColor: string
  fillColor: string
  progress: number
  streakDays: number
}) {
  const clamped = Math.max(0, Math.min(progress, 1))
  const emptyDot = hexToRgba("#FFFFFF", 0.28)

  if (variant === "streak") {
    const filledDots = Math.min(streakDays, STREAK_DOT_COUNT)

    return (
      <View style={styles.dotRow}>
        {Array.from({ length: STREAK_DOT_COUNT }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index < filledDots ? fillColor : emptyDot },
            ]}
          />
        ))}
      </View>
    )
  }

  const fillWidth = `${Math.max(clamped * 100, variant === "attendance" && clamped > 0 ? 8 : 0)}%` as `${number}%`

  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      <View style={[styles.progressFill, { width: fillWidth, backgroundColor: fillColor }]} />
    </View>
  )
}

function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 0,
    borderWidth: 1,
    overflow: "hidden",
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    marginBottom: 6,
  },
  value: {
    fontSize: 20,
    fontWeight: NATIVE.titleWeight,
    letterSpacing: NATIVE.titleTracking,
    lineHeight: 24,
  },
  label: {
    marginTop: 1,
    marginBottom: 6,
  },
  decoChart: {
    position: "absolute",
    right: 4,
    top: 12,
  },
  decoIcon: {
    position: "absolute",
    right: 2,
    top: 8,
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 0,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    minWidth: 8,
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
})
