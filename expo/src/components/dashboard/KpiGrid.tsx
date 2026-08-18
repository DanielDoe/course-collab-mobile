import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { StudentDashboardStats } from "../../types/dashboard"
import { DASHBOARD_KPI_THUMBS } from "../../lib/dashboard-theme"
import { COLOR_HUNT } from "../../lib/flashcard-difficulty-theme"
import { REPORT_SOLID } from "../../lib/assessment-report-theme"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { MODERN, kpiLabelTextA11yProps, kpiMetricTextA11yProps } from "../../constants/faculty-native-theme"
import { DASHBOARD_SURFACE } from "./DashboardCard"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

type KpiDef = {
  id: string
  label: string
  value: string
  sub?: string
  icon: keyof typeof Ionicons.glyphMap
  thumb: SolidListThumb
}

function metricOrDash(unavailable: boolean | undefined, value: string): string {
  return unavailable ? "—" : value
}

function buildKpis(stats: StudentDashboardStats): KpiDef[] {
  const unavailable = stats.unavailable ?? {}
  const missing = !unavailable.homework && stats.missingAssignments > 0

  return [
    {
      id: "overall-grade",
      label: "Overall grade",
      value: metricOrDash(unavailable.grade, `${stats.overallGrade}%`),
      sub:
        unavailable.grade || !stats.letterGrade || stats.letterGrade === "—"
          ? undefined
          : /^[A-F][+-]?$/.test(stats.letterGrade)
            ? `Letter ${stats.letterGrade}`
            : stats.letterGrade,
      icon: "ribbon-outline",
      thumb: DASHBOARD_KPI_THUMBS.overallGrade,
    },
    {
      id: "quiz-average",
      label: "Quiz average",
      value: metricOrDash(unavailable.quizzes, `${stats.quizAverage}%`),
      sub: stats.classQuizAverage != null ? `Class average ${stats.classQuizAverage}%` : undefined,
      icon: "clipboard-outline",
      thumb: DASHBOARD_KPI_THUMBS.quizAverage,
    },
    {
      id: "homework-average",
      label: "Homework average",
      value: metricOrDash(unavailable.homework, `${stats.homeworkAverage}%`),
      sub: unavailable.homework ? undefined : "Completed assignments",
      icon: "book-outline",
      thumb: DASHBOARD_KPI_THUMBS.homeworkAverage,
    },
    {
      id: "attendance",
      label: "Attendance",
      value: metricOrDash(unavailable.attendance, `${stats.attendancePct}%`),
      sub: unavailable.attendance
        ? undefined
        : stats.attendanceStreak > 0
          ? `${stats.attendanceStreak} day streak · ${stats.classesMissed} missed`
          : `${stats.classesMissed} classes missed`,
      icon: "calendar-outline",
      thumb: DASHBOARD_KPI_THUMBS.attendance,
    },
    {
      id: "missing-work",
      label: "Missing work",
      value: metricOrDash(unavailable.homework, String(stats.missingAssignments)),
      sub: unavailable.homework ? undefined : missing ? "Needs attention" : "All caught up",
      icon: "alert-circle-outline",
      thumb: missing ? DASHBOARD_KPI_THUMBS.missingWork : DASHBOARD_KPI_THUMBS.missingWorkClear,
    },
    {
      id: "classroom-points",
      label: "Classroom points",
      value: metricOrDash(
        unavailable.points,
        String(Math.round(stats.classroomPoints * 10) / 10),
      ),
      sub: unavailable.grade
        ? undefined
        : `${stats.engagementCredits}/10 engagement credits`,
      icon: "flash-outline",
      thumb: DASHBOARD_KPI_THUMBS.classroomPoints,
    },
    {
      id: "deadlines",
      label: "Upcoming deadlines",
      value: metricOrDash(
        Boolean(unavailable.quizzes && unavailable.homework),
        String(stats.upcomingDeadlines),
      ),
      sub: "Quizzes and homework due soon",
      icon: "time-outline",
      thumb: DASHBOARD_KPI_THUMBS.upcoming,
    },
    {
      id: "engagement",
      label: "Engagement score",
      value: metricOrDash(unavailable.grade, `${stats.engagementCredits}/100`),
      sub: unavailable.grade ? undefined : "Participation credits this term",
      icon: "sparkles-outline",
      thumb: DASHBOARD_KPI_THUMBS.engagement,
    },
  ]
}

export function KpiGrid({ stats }: { stats: StudentDashboardStats }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const cardLayout = useKpiGridCardStyle()
  const kpis = buildKpis(stats)

  return (
    <View style={styles.grid}>
      {kpis.map((kpi) => (
        <View
          key={kpi.id}
          style={[styles.card, cardLayout, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}
        >
          <View style={styles.cardRow}>
            <View style={styles.copy}>
              <Text {...kpiLabelTextA11yProps} style={[type.caption, styles.label, { color: native.secondaryLabel }]}>
                {kpi.label}
              </Text>
              <Text {...kpiMetricTextA11yProps} style={[type.bodyEmphasis, styles.value, { color: native.label }]}>
                {kpi.value}
              </Text>
              {kpi.sub ? (
                <Text {...kpiLabelTextA11yProps} style={[type.caption, styles.sub, { color: native.tertiaryLabel }]}>
                  {kpi.sub}
                </Text>
              ) : null}
            </View>
            <SolidListThumbTile thumb={kpi.thumb} icon={kpi.icon} size="compact" style={styles.iconTile} />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    borderRadius: 16,
    padding: 14,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  iconTile: {
    width: MODERN.metricIconSize,
    height: MODERN.metricIconSize,
    borderRadius: MODERN.metricIconRadius,
    flexShrink: 0,
  },
  label: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  value: {
    fontSize: DASHBOARD_SURFACE.gridMetricSize,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: DASHBOARD_SURFACE.gridMetricLineHeight,
  },
  sub: { fontSize: 11, lineHeight: 15 },
})
