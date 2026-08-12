import { StyleSheet, Text, View } from "react-native"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { Ionicons } from "@/components/icons/AppIcon"
import type { InstructorDashboardStats } from "../../lib/instructor-api"
import { MODERN, kpiLabelTextA11yProps, kpiMetricTextA11yProps } from "../../constants/faculty-native-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FACULTY_DASHBOARD_KPI_THUMBS,
  facultyDashboardKpiThumb,
} from "../../lib/faculty-dashboard-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import type { SolidListThumb } from "../../lib/solid-list-thumb"

type KpiDef = {
  id: string
  label: string
  value: string
  sub?: string
  icon: keyof typeof Ionicons.glyphMap
  thumb: SolidListThumb
}

function buildKpis(stats: InstructorDashboardStats): KpiDef[] {
  const pendingIssues = stats.pendingIssues ?? 0
  return [
    {
      id: "active-quizzes",
      label: "Active Quizzes",
      value: String(stats.activeQuizzes),
      sub: `${stats.totalQuizzes} total in course`,
      icon: "clipboard-outline",
      thumb: FACULTY_DASHBOARD_KPI_THUMBS.activeQuizzes,
    },
    {
      id: "students",
      label: "Students",
      value: String(stats.totalStudents),
      sub: "Enrolled in selected course",
      icon: "people-outline",
      thumb: FACULTY_DASHBOARD_KPI_THUMBS.students,
    },
    {
      id: "attempts",
      label: "Quiz Attempts",
      value: String(stats.totalAttempts),
      sub: "All-time submissions",
      icon: "bar-chart-outline",
      thumb: FACULTY_DASHBOARD_KPI_THUMBS.quizAttempts,
    },
    {
      id: "issues",
      label: "Pending Issues",
      value: String(pendingIssues),
      sub: pendingIssues > 0 ? "Student reports" : "All clear",
      icon: "alert-circle-outline",
      thumb: facultyDashboardKpiThumb("pendingIssues", pendingIssues > 0),
    },
    {
      id: "upcoming",
      label: "Upcoming",
      value: String(stats.upcomingAssessments),
      sub: "Opening within 7 days",
      icon: "calendar-outline",
      thumb: FACULTY_DASHBOARD_KPI_THUMBS.upcoming,
    },
    {
      id: "submissions-24h",
      label: "Submissions (24h)",
      value: String(stats.recentSubmissions24h),
      sub: "New attempts today",
      icon: "pulse-outline",
      thumb: FACULTY_DASHBOARD_KPI_THUMBS.submissions24h,
    },
  ]
}

export function FacultyKpiGrid({ stats }: { stats: InstructorDashboardStats }) {
  const { native, tokens, type } = useModuleTheme()
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
              <Text {...kpiLabelTextA11yProps} style={[type.caption, styles.label, { color: native.secondaryLabel }]}>{kpi.label}</Text>
              <Text {...kpiMetricTextA11yProps} style={[type.bodyEmphasis, styles.value, { color: native.label }]}>{kpi.value}</Text>
              {kpi.sub ? <Text {...kpiLabelTextA11yProps} style={[type.caption, styles.sub, { color: native.tertiaryLabel }]}>{kpi.sub}</Text> : null}
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
