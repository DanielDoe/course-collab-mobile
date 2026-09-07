import { useCallback, useMemo } from "react"
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { formatFacultyRelativeTime } from "../../lib/instructor-api"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import {
  buildFacultyBreakdownChartHtml,
  buildFacultyScoreTrendChartHtml,
  buildFacultySubmissionsChartHtml,
  hasBreakdownChartData,
  hasAnySubmissionsChartData,
  hasScoreTrendChartData,
  resolveSubmissionsChartSeries} from "./faculty-chart-html"
import { FacultyChartCard, ChartLegendItem } from "./FacultyChartCard"
import { FacultyKpiGrid } from "./FacultyKpiGrid"
import { FacultyQuickActions } from "./FacultyQuickActions"
import { facultyDashboardSnapshotHref } from "../../lib/faculty-dashboard-kpi-nav"
import { activityBelongsToCourse } from "../../lib/faculty-assessment-utils"
import { FacultyEmptyState, FacultyListRow, FacultySectionCard } from "./faculty-shared"
import { DashboardWelcomeCard } from "../dashboard/DashboardWelcomeCard"
import { facultyScopeKey, facultyScopeLabel } from "../../lib/faculty-scope-label"
import { useFacultyDashboard } from "../../hooks/query/useFacultyDashboard"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
import { QuerySkeleton } from "../query/QuerySkeleton"
import { FACULTY_CHART_COLORS } from "../../lib/faculty-dashboard-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { useDashboardContentStyle, useChartContentWidth, useKpiGridCardStyle } from "../../lib/responsive-layout"
import { useChromeScrollPadding } from "../../context/ChromeInsetContext"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

/**
 * Instructor dashboard — native grouped canvas + modern KPI/chart personality.
 */
export function FacultyDashboardScreen() {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const scrollPad = useChromeScrollPadding(32)
  const dashboardContentStyle = useDashboardContentStyle()
  const chartWidth = useChartContentWidth()
  const router = useRouter()
  const { session, course, scope, ready } = useFacultyScope()
  const { openCoursePicker, refreshFacultyData } = useFacultyShell()

  const dash = useFacultyDashboard(ready ? scope : null)
  const stats = dash.stats
  const charts = dash.charts
  const activity = dash.activity
  const loading = dash.isInitialLoading
  const chartsLoading = dash.isInitialLoading
  const refreshing = dash.isRefreshing && !dash.isInitialLoading
  const error = dash.error instanceof ApiError ? dash.error.message : dash.error ? "Could not load dashboard." : ""

  const handleRefresh = useCallback(async () => {
    await Promise.all([dash.refetch(), refreshFacultyData?.(undefined, { force: true })])
  }, [dash.refetch, refreshFacultyData])

  useNotificationModuleRefresh("dashboard", handleRefresh)

  const courseActivity = useMemo(
    () => activity.filter((item) => activityBelongsToCourse(item, course?.course_code)),
    [activity, course?.course_code],
  )

  const submissionsChart = useMemo(
    () => (charts ? resolveSubmissionsChartSeries(charts) : null),
    [charts],
  )
  const submissionsHtml = useMemo(
    () => (submissionsChart ? buildFacultySubmissionsChartHtml(submissionsChart.data, chartWidth) : ""),
    [submissionsChart, chartWidth],
  )
  const breakdownHtml = useMemo(
    () => (charts ? buildFacultyBreakdownChartHtml(charts.assessmentBreakdown, chartWidth) : ""),
    [charts, chartWidth],
  )
  const scoreTrendHtml = useMemo(
    () => (charts ? buildFacultyScoreTrendChartHtml(charts.scoreTrend, chartWidth) : ""),
    [charts, chartWidth],
  )

  if (!session) return null

  if (!ready) {
    return (
      <View style={[moduleStyles.center, styles.center]}>
        <FacultyEmptyState
          icon="book-outline"
          title="Select a Course"
          body="Choose a course to view instructor tools and live course data."
        />
        <Pressable style={[styles.primaryBtn, { backgroundColor: tokens.accent }]} onPress={openCoursePicker}>
          <Text style={[type.bodyEmphasis, styles.primaryBtnText]}>Choose Course</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView
      style={[moduleStyles.root, styles.root]}
      contentContainerStyle={[styles.content, dashboardContentStyle, scrollPad]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
          tintColor={tokens.accent}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <DashboardWelcomeCard
        key={facultyScopeKey(course)}
        portal="faculty"
        name={session.name}
        roleLabel="Instructor"
        roleIcon="school-outline"
        badge={facultyScopeLabel(course)}
      />

      <QueryRefreshBanner visible={dash.refreshFailed} onRetry={() => void handleRefresh()} />

      {loading ? (
        <QuerySkeleton rows={6} />
      ) : !stats ? (
        <View style={styles.loadingBox}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={SYSTEM.red.color} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <FacultyEmptyState
              icon="cloud-offline-outline"
              title="Dashboard Unavailable"
              body="Pull down to refresh or try again in a moment."
            />
          )}
        </View>
      ) : (
        <>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={SYSTEM.red.color} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <FacultyKpiGrid
            stats={stats}
            sessionCode={course?.session_code}
            termLabel={course?.term_label ?? course?.semester ?? null}
          />

          <FacultyChartCard
            title={submissionsChart?.title ?? "Submissions (Last 7 Days)"}
            html={submissionsHtml}
            loading={chartsLoading}
            empty={!hasAnySubmissionsChartData(charts)}
            emptyMessage="No submissions yet"
          />
          <FacultyChartCard
            title="Submissions by Type"
            html={breakdownHtml}
            loading={chartsLoading}
            empty={!charts || !hasBreakdownChartData(charts.assessmentBreakdown)}
            emptyMessage="No submissions yet"
          />
          <FacultyChartCard
            title="Class Average Score (Last 6 Weeks)"
            html={scoreTrendHtml}
            loading={chartsLoading}
            empty={!charts || !hasScoreTrendChartData(charts.scoreTrend)}
            emptyMessage="No score data yet"
            legend={
              <View style={styles.chartLegend}>
                <ChartLegendItem color={FACULTY_CHART_COLORS.primary} label="Avg Score" />
                <View style={styles.targetLegend}>
                  <View
                    style={[
                      styles.targetDot,
                      { borderColor: FACULTY_CHART_COLORS.targetBorder },
                    ]}
                  />
                  <Text style={styles.legendText}>80% target</Text>
                </View>
              </View>
            }
          />

          <FacultySectionCard title="Course Snapshot" icon="school-outline">
            <View style={styles.snapshotGrid}>
              <SnapshotItem label="Students" value={String(stats.totalStudents)} />
              <SnapshotItem label="Active Quizzes" value={String(stats.activeQuizzes)} />
              <SnapshotItem label="Total Quizzes" value={String(stats.totalQuizzes)} />
              <SnapshotItem label="Upcoming" value={String(stats.upcomingAssessments)} />
            </View>
          </FacultySectionCard>

          <FacultySectionCard title="Quick Actions" icon="flash-outline">
            <FacultyQuickActions />
          </FacultySectionCard>

          <FacultySectionCard
            title="Recent Activity"
            icon="time-outline"
            action={
              courseActivity.length > 0 ? (
                <Pressable
                  onPress={() => router.push("/module/recent-activity" as never)}
                  accessibilityRole="button"
                  accessibilityLabel="View all recent activity"
                  hitSlop={8}
                >
                  <Text style={styles.viewAll}>View All</Text>
                </Pressable>
              ) : null
            }
          >
            {courseActivity.length === 0 ? (
              <FacultyEmptyState
                icon="pulse-outline"
                title="No Recent Submissions"
                body="Student assessment activity will appear here."
              />
            ) : (
              courseActivity.map((item) => (
                <FacultyListRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.message}
                  meta={item.created_at ? formatFacultyRelativeTime(item.created_at) : undefined}
                  onPress={() => router.push("/module/recent-activity" as never)}
                />
              ))
            )}
          </FacultySectionCard>
        </>
      )}
    </ScrollView>
  )
}

function SnapshotItem({ label, value }: { label: string; value: string }) {
  const { native, type } = useModuleTheme()
  const router = useRouter()
  const cardLayout = useKpiGridCardStyle("47%")
  const href = facultyDashboardSnapshotHref(label)
  const body = (
    <>
      <Text style={[type.bodyEmphasis, styles.snapshotValue, { color: native.label }]}>{value}</Text>
      <Text style={[type.caption, styles.snapshotLabel, { color: native.secondaryLabel }]}>{label}</Text>
    </>
  )
  const surface = [styles.snapshotItem, cardLayout, { backgroundColor: native.fill }]
  if (!href) {
    return <View style={surface}>{body}</View>
  }
  return (
    <Pressable
      onPress={() => router.push(href as never)}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}. Open ${label}`}
      style={({ pressed }) => [surface, { opacity: pressed ? 0.86 : 1 }]}
    >
      {body}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1},
  content: { padding: NATIVE.pagePadding, gap: 14 },
  center: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 16},
  loadingBox: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  loadingText: { color: NATIVE.secondaryLabel, fontSize: 14 },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
    backgroundColor: SYSTEM.red.soft},
  errorText: { flex: 1, color: SYSTEM.red.color, fontSize: 14, lineHeight: 20 },
  snapshotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  snapshotItem: {
    borderRadius: 10,
    padding: 12,
    gap: 2,
  },
  snapshotValue: {
    fontSize: 20,
    fontWeight: NATIVE.titleWeight,
    color: NATIVE.label},
  snapshotLabel: { fontSize: 12, fontWeight: "500", color: NATIVE.secondaryLabel },
  viewAll: { fontSize: 15, fontWeight: "400", color: NATIVE.tint },
  primaryBtn: {
    alignSelf: "center",
    borderRadius: NATIVE.buttonRadius,
    paddingHorizontal: 18,
    paddingVertical: 12},
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  chartLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 4},
  targetLegend: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto" },
  targetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  legendText: { fontSize: 11, color: NATIVE.secondaryLabel, fontWeight: "500" }})
