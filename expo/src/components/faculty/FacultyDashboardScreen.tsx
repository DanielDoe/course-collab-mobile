import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type InstructorDashboardCharts,
  type InstructorDashboardStats,
  type InstructorRecentActivity} from "../../lib/instructor-api"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import {
  buildFacultyBreakdownChartHtml,
  buildFacultyScoreTrendChartHtml,
  buildFacultySubmissionsChartHtml,
  hasBreakdownChartData,
  hasScoreTrendChartData,
  hasSubmissionsChartData} from "./faculty-chart-html"
import { FacultyChartCard, ChartLegendItem } from "./FacultyChartCard"
import { FacultyKpiGrid } from "./FacultyKpiGrid"
import { FacultyEmptyState, FacultyListRow, FacultySectionCard, NativeCountBadge } from "./faculty-shared"
import { DashboardWelcomeCard } from "../dashboard/DashboardWelcomeCard"
import { consumeFacultyDashboardBootstrap } from "../../lib/app-bootstrap-cache"
import { ensureAppBootstrap } from "../../lib/post-login-bootstrap"
import { FACULTY_CHART_COLORS } from "../../lib/faculty-dashboard-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { useDashboardContentStyle, useKpiGridCardStyle } from "../../lib/responsive-layout"
import { useChromeScrollPadding } from "../../context/ChromeInsetContext"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

/**
 * Instructor dashboard — native grouped canvas + modern KPI/chart personality.
 */
export function FacultyDashboardScreen() {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const scrollPad = useChromeScrollPadding(32)
  const { width } = useWindowDimensions()
  const dashboardContentStyle = useDashboardContentStyle()
  const router = useRouter()
  const { session, course, scope, ready } = useFacultyScope()
  const { badges, openCoursePicker, refreshFacultyData } = useFacultyShell()

  const [stats, setStats] = useState<InstructorDashboardStats | null>(null)
  const [charts, setCharts] = useState<InstructorDashboardCharts | null>(null)
  const [activity, setActivity] = useState<InstructorRecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const chartWidth = Math.max(280, width - 64)

  const load = useCallback(async () => {
    if (!scope || !session) return
    setError("")

    await ensureAppBootstrap(session)

    const cached = consumeFacultyDashboardBootstrap()
    if (cached && cached.courseId === scope.courseId) {
      setStats(cached.stats)
      setCharts(cached.charts)
      setActivity(cached.activity)
      setChartsLoading(false)
      return
    }

    try {
      const [nextStats, nextCharts, nextActivity] = await Promise.all([
        instructorApi.getDashboardStats(scope),
        instructorApi.getDashboardCharts(scope),
        instructorApi.getRecentActivity(scope),
      ])
      setStats(nextStats)
      setCharts(nextCharts)
      setActivity(nextActivity.slice(0, 8))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load dashboard.")
    } finally {
      setChartsLoading(false)
    }
  }, [scope, session])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    setChartsLoading(true)
    load().finally(() => setLoading(false))
  }, [ready, load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    setChartsLoading(true)
    try {
      await Promise.all([load(), refreshFacultyData?.(undefined, { force: true })])
    } finally {
      setRefreshing(false)
    }
  }, [load, refreshFacultyData])

  useNotificationModuleRefresh("dashboard", handleRefresh)

  const submissionsHtml = useMemo(
    () => (charts ? buildFacultySubmissionsChartHtml(charts.submissionsOverTime, chartWidth) : ""),
    [charts, chartWidth],
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
        portal="faculty"
        name={session.name}
        roleLabel="Instructor"
        roleIcon="school-outline"
        badge={course?.course_code ?? undefined}
        subtitle={course?.course_title ?? undefined}
      />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={[type.caption, styles.loadingText, { color: native.secondaryLabel }]}>Loading course dashboard…</Text>
        </View>
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

          <FacultyKpiGrid stats={stats} />

          <FacultyChartCard
            title="Submissions (Last 7 Days)"
            html={submissionsHtml}
            loading={chartsLoading}
            empty={!charts || !hasSubmissionsChartData(charts.submissionsOverTime)}
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
            <View style={styles.actions}>
              <ActionChip
                label="Approve Points"
                count={badges.pendingPoints}
                onPress={() => router.push("/module/classroom-points" as never)}
              />
              <ActionChip
                label="Assessment Issues"
                count={badges.pendingIssues}
                onPress={() => router.push("/module/quizzes?segment=issues" as never)}
              />
              <ActionChip
                label="Office Hours"
                count={badges.officeHours}
                onPress={() => router.push("/module/office-hours" as never)}
              />
              <ActionChip label="Playground" onPress={() => router.push("/module/playground" as never)} />
              <ActionChip
                label="Announcements"
                onPress={() => router.push("/module/announcements" as never)}
              />
            </View>
          </FacultySectionCard>

          <FacultySectionCard
            title="Recent Activity"
            icon="time-outline"
            action={
              activity.length > 0 ? (
                <Pressable onPress={() => router.push("/module/recent-activity" as never)}>
                  <Text style={styles.viewAll}>View All</Text>
                </Pressable>
              ) : null
            }
          >
            {activity.length === 0 ? (
              <FacultyEmptyState
                icon="pulse-outline"
                title="No Recent Submissions"
                body="Student assessment activity will appear here."
              />
            ) : (
              activity.map((item) => (
                <FacultyListRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.message}
                  meta={item.created_at ? formatFacultyRelativeTime(item.created_at) : undefined}
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
  const cardLayout = useKpiGridCardStyle("47%")
  return (
    <View style={[styles.snapshotItem, cardLayout, { backgroundColor: native.fill }]}>
      <Text style={[type.bodyEmphasis, styles.snapshotValue, { color: native.label }]}>{value}</Text>
      <Text style={[type.caption, styles.snapshotLabel, { color: native.secondaryLabel }]}>{label}</Text>
    </View>
  )
}

function ActionChip({
  label,
  count,
  onPress}: {
  label: string
  count?: number
  onPress: () => void
}) {
  const { native, type } = useModuleTheme()
  return (
    <Pressable
      style={({ pressed }) => [styles.chip, { backgroundColor: native.secondaryGrouped }, pressed && { opacity: NATIVE.pressedOpacity }]}
      onPress={onPress}
    >
      <Text style={[type.body, styles.chipText, { color: native.label }]}>{label}</Text>
      {count && count > 0 ? <NativeCountBadge count={count} variant="compact" /> : null}
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
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8},
  chipText: { fontSize: 14, fontWeight: "500", color: NATIVE.label },
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
