import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { Ionicons } from "@/components/icons/AppIcon"
import type { InstructorDashboardStats } from "../../lib/instructor-api"
import { MODERN, kpiLabelTextA11yProps, kpiMetricTextA11yProps } from "../../constants/faculty-native-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FACULTY_DASHBOARD_KPI_THUMBS,
  facultyDashboardKpiThumb,
} from "../../lib/faculty-dashboard-theme"
import { DASHBOARD_SURFACE } from "../dashboard/DashboardCard"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import {
  facultyDashboardKpiHref,
  type FacultyDashboardKpiId,
} from "../../lib/faculty-dashboard-kpi-nav"

type KpiDef = {
  id: FacultyDashboardKpiId
  label: string
  value: string
  sub?: string
  icon: keyof typeof Ionicons.glyphMap
  thumb: SolidListThumb
  href?: string
}

function buildKpis(
  stats: InstructorDashboardStats,
  sessionCode?: string | null,
  termLabel?: string | null,
): KpiDef[] {
  const pendingIssues = stats.pendingIssues ?? 0
  return [
    {
      id: "active-quizzes",
      label: "Active Quizzes",
      value: String(stats.activeQuizzes),
      sub: termLabel ? `${stats.totalQuizzes} scheduled · ${termLabel}` : `${stats.totalQuizzes} scheduled this term`,
      icon: "clipboard-outline",
      thumb: FACULTY_DASHBOARD_KPI_THUMBS.activeQuizzes,
      href: facultyDashboardKpiHref("active-quizzes"),
    },
    {
      id: "students",
      label: "Students",
      value: String(stats.totalStudents),
      sub: sessionCode ? "Enrolled in selected section" : "Enrolled in selected course",
      icon: "people-outline",
      thumb: FACULTY_DASHBOARD_KPI_THUMBS.students,
      href: facultyDashboardKpiHref("students"),
    },
    {
      id: "attempts",
      label: "Quiz Attempts",
      value: String(stats.totalAttempts),
      sub: termLabel ? `Submissions · ${termLabel}` : "Submissions this term",
      icon: "bar-chart-outline",
      thumb: FACULTY_DASHBOARD_KPI_THUMBS.quizAttempts,
      href: facultyDashboardKpiHref("attempts"),
    },
    {
      id: "issues",
      label: "Pending Issues",
      value: String(pendingIssues),
      sub: pendingIssues > 0 ? "Student reports" : "All clear",
      icon: "alert-circle-outline",
      thumb: facultyDashboardKpiThumb("pendingIssues", pendingIssues > 0),
      href: facultyDashboardKpiHref("issues"),
    },
    {
      id: "upcoming",
      label: "Upcoming",
      value: String(stats.upcomingAssessments),
      sub: "Opening within 7 days",
      icon: "calendar-outline",
      thumb: FACULTY_DASHBOARD_KPI_THUMBS.upcoming,
      href: facultyDashboardKpiHref("upcoming"),
    },
    {
      id: "submissions-24h",
      label: "Submissions (24h)",
      value: String(stats.recentSubmissions24h),
      sub: "New attempts today",
      icon: "pulse-outline",
      thumb: FACULTY_DASHBOARD_KPI_THUMBS.submissions24h,
      href: facultyDashboardKpiHref("submissions-24h"),
    },
  ]
}

export function FacultyKpiGrid({
  stats,
  sessionCode,
  termLabel,
}: {
  stats: InstructorDashboardStats
  sessionCode?: string | null
  termLabel?: string | null
}) {
  const { native, tokens, type } = useModuleTheme()
  const router = useRouter()
  const cardLayout = useKpiGridCardStyle()
  const kpis = buildKpis(stats, sessionCode, termLabel)

  return (
    <View style={styles.grid}>
      {kpis.map((kpi) => {
        const body = (
          <View style={styles.cardRow}>
            <View style={styles.copy}>
              <Text {...kpiLabelTextA11yProps} style={[type.caption, styles.label, { color: native.secondaryLabel }]}>{kpi.label}</Text>
              <Text {...kpiMetricTextA11yProps} style={[type.bodyEmphasis, styles.value, { color: native.label }]}>{kpi.value}</Text>
              {kpi.sub ? <Text {...kpiLabelTextA11yProps} style={[type.caption, styles.sub, { color: native.secondaryLabel }]}>{kpi.sub}</Text> : null}
            </View>
            <SolidListThumbTile thumb={kpi.thumb} icon={kpi.icon} size="compact" style={styles.iconTile} />
          </View>
        )
        const surfaceStyle = [styles.card, cardLayout, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]
        if (!kpi.href) {
          return (
            <View key={kpi.id} style={surfaceStyle}>
              {body}
            </View>
          )
        }
        return (
          <Pressable
            key={kpi.id}
            onPress={() => router.push(kpi.href as never)}
            accessibilityRole="button"
            accessibilityLabel={`${kpi.label}, ${kpi.value}. Open ${kpi.label}`}
            style={({ pressed }) => [surfaceStyle, { opacity: pressed ? 0.86 : 1 }]}
          >
            {body}
          </Pressable>
        )
      })}
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
