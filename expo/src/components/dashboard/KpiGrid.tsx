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
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

type KpiDef = {
  id: string
  label: string
  value: string
  sub?: string
  icon: keyof typeof Ionicons.glyphMap
  thumb: SolidListThumb
}

function buildKpis(stats: StudentDashboardStats): KpiDef[] {
  const missing = stats.missingAssignments > 0

  return [
    {
      id: "overall-grade",
      label: "Overall grade",
      value: `${stats.overallGrade}%`,
      sub: stats.letterGrade !== "—" ? `Letter ${stats.letterGrade}` : undefined,
      icon: "ribbon-outline",
      thumb: DASHBOARD_KPI_THUMBS.overallGrade,
    },
    {
      id: "quiz-average",
      label: "Quiz average",
      value: `${stats.quizAverage}%`,
      sub: `Class average ${stats.classQuizAverage}%`,
      icon: "clipboard-outline",
      thumb: DASHBOARD_KPI_THUMBS.quizAverage,
    },
    {
      id: "homework-average",
      label: "Homework average",
      value: `${stats.homeworkAverage}%`,
      sub: "Completed assignments",
      icon: "book-outline",
      thumb: DASHBOARD_KPI_THUMBS.homeworkAverage,
    },
    {
      id: "attendance",
      label: "Attendance",
      value: `${stats.attendancePct}%`,
      sub:
        stats.attendanceStreak > 0
          ? `${stats.attendanceStreak} day streak · ${stats.classesMissed} missed`
          : `${stats.classesMissed} classes missed`,
      icon: "calendar-outline",
      thumb: DASHBOARD_KPI_THUMBS.attendance,
    },
    {
      id: "missing-work",
      label: "Missing work",
      value: String(stats.missingAssignments),
      sub: missing ? "Needs attention" : "All caught up",
      icon: "alert-circle-outline",
      thumb: missing ? DASHBOARD_KPI_THUMBS.missingWork : DASHBOARD_KPI_THUMBS.missingWorkClear,
    },
    {
      id: "classroom-points",
      label: "Classroom points",
      value: String(Math.round(stats.classroomPoints * 10) / 10),
      sub: `${stats.engagementCredits}/10 engagement credits`,
      icon: "flash-outline",
      thumb: DASHBOARD_KPI_THUMBS.classroomPoints,
    },
    {
      id: "deadlines",
      label: "Upcoming deadlines",
      value: String(stats.upcomingDeadlines),
      sub: "Quizzes and homework due soon",
      icon: "time-outline",
      thumb: DASHBOARD_KPI_THUMBS.upcoming,
    },
    {
      id: "engagement",
      label: "Engagement score",
      value: `${stats.engagementCredits}/100`,
      sub: "Participation credits this term",
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
  const kpis = buildKpis(stats).slice(0, 4)

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
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sub: { fontSize: 11, lineHeight: 15 },
})
