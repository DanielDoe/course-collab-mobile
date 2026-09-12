import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  buildAtRiskRows,
  buildPracticeScoreDistribution,
  filterAtRiskRows,
  filterPracticeProgress,
  hasPracticeScoreDistributionData,
  type AtRiskStudentRow,
  type StudentProgressTab,
} from "../../lib/faculty-analytics-utils"
import {
  buildClassAnalyticsRows,
  buildEngagementDistribution,
  computeClassAnalyticsOverview,
  filterClassAnalyticsRows,
  hasEngagementDistributionData,
  mapModuleFlashcardRows,
  mapModuleLectureRows,
  mapPlaygroundLeaderboardRows,
  sortClassAnalyticsRows,
  type ClassAnalyticsSort,
} from "../../lib/class-analytics-utils"
import {
  instructorApi,
  type AttendanceAnalytics,
  type ClassroomPointsSummaryRow,
  type FacultyAiInsightsSummary,
  type InstructorAssessmentResult,
  type InstructorDashboardCharts,
  type InstructorDashboardStats,
  type InstructorSession,
  type InstructorStudent,
  type PracticeStudentProgress,
  type ModuleStudentActivityPayload,
} from "../../lib/instructor-api"
import {
  buildFacultyAttendanceTrendChartHtml,
  buildFacultyBreakdownChartHtml,
  buildFacultyPracticeScoreDistributionChartHtml,
  buildFacultyScoreTrendChartHtml,
  hasAttendanceTrendChartData,
  hasBreakdownChartData,
  hasScoreTrendChartData,
} from "./faculty-chart-html"
import { sanitizeFacultyAttendanceAnalytics } from "../../lib/faculty-attendance-utils"
import {
  effectiveFacultySectionCode,
  useFacultySectionFilter,
} from "../../lib/faculty-section-scope"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FacultyChartCard } from "./FacultyChartCard"
import { FacultyKpiGrid } from "./FacultyKpiGrid"
import {
  FacultyAtRiskCard,
  FacultyClassAnalyticsStudentCard,
} from "./FacultyAnalyticsListCards"
import { FACULTY_STUDENT_PROGRESS_COLOR } from "../../lib/faculty-student-progress-theme"
import { FacultyAiInsightsPanel } from "./FacultyAiInsightsPanel"
import { FacultyEmptyState, FacultyHero, FacultySectionCard } from "./faculty-shared"
import {
  useFacultyStickyHeaderScrollLayout,
  FacultyFilterChip,
  FacultyFilterSheet,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  FacultyStatCard,
  FacultyStatRow,
  sectionFilterSheetOptions,
} from "./faculty-module-shell"
import { FacultyPracticeStudentReportModal } from "./FacultyPracticeStudentReportModal"
import { FacultyAtRiskActionSheet } from "./FacultyAtRiskActionSheet"
import { FacultyStudentDetailModal } from "./FacultyStudentDetailModal"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { useChartContentWidth, useDashboardContentStyle } from "../../lib/responsive-layout"

const TABS: Array<{ id: StudentProgressTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "overview", label: "Overview", icon: "stats-chart-outline" },
  { id: "students", label: "Class roster", icon: "people-outline" },
  { id: "at_risk", label: "At risk", icon: "warning-outline" },
  { id: "cora_insights", label: "Cora insights", icon: "sparkles-outline" },
]

const STUDENT_SORTS: Array<{ id: ClassAnalyticsSort; label: string }> = [
  { id: "engagement", label: "Engagement" },
  { id: "assessments", label: "Assessments" },
  { id: "practice", label: "Practice" },
  { id: "attendance", label: "Attendance" },
  { id: "points", label: "Points" },
  { id: "lectures", label: "Lectures" },
  { id: "flashcards", label: "Flashcards" },
  { id: "playground", label: "Playground" },
]

export function FacultyStudentProgressScreen() {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const dashboardContentStyle = useDashboardContentStyle()
  const chartWidth = useChartContentWidth()
  const { scope, ready } = useFacultyScope()
  const { sessionFilter, setSessionFilter } = useFacultySectionFilter(scope, "ALL")

  const [tab, setTab] = useState<StudentProgressTab>("overview")
  const [stats, setStats] = useState<InstructorDashboardStats | null>(null)
  const [charts, setCharts] = useState<InstructorDashboardCharts | null>(null)
  const [students, setStudents] = useState<PracticeStudentProgress[]>([])
  const [roster, setRoster] = useState<InstructorStudent[]>([])
  const [pointsSummary, setPointsSummary] = useState<ClassroomPointsSummaryRow[]>([])
  const [assessmentResults, setAssessmentResults] = useState<InstructorAssessmentResult[]>([])
  const [flashcardsActivity, setFlashcardsActivity] = useState<ModuleStudentActivityPayload | null>(null)
  const [lecturesActivity, setLecturesActivity] = useState<ModuleStudentActivityPayload | null>(null)
  const [playgroundLeaderboard, setPlaygroundLeaderboard] = useState<Awaited<
    ReturnType<typeof instructorApi.getPlaygroundLeaderboard>
  > | null>(null)
  const [attendance, setAttendance] = useState<AttendanceAnalytics | null>(null)
  const [sessions, setSessions] = useState<InstructorSession[]>([])
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [studentSort, setStudentSort] = useState<ClassAnalyticsSort>("engagement")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<PracticeStudentProgress | null>(null)
  const [selectedAtRisk, setSelectedAtRisk] = useState<AtRiskStudentRow | null>(null)
  const [profileStudent, setProfileStudent] = useState<InstructorStudent | null>(null)
  const [insightsSummary, setInsightsSummary] = useState<FacultyAiInsightsSummary | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState("")
  const [insightsLoaded, setInsightsLoaded] = useState(false)

  const sectionForScope = useMemo(
    () => effectiveFacultySectionCode(scope, sessionFilter, "ALL"),
    [scope, sessionFilter],
  )

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const sessionCode = sectionForScope ?? (sessionFilter === "ALL" ? undefined : sessionFilter)
    const [
      nextStats,
      nextCharts,
      nextStudents,
      nextAttendance,
      sessionRes,
      nextRoster,
      nextPoints,
      nextResults,
      flashcardsActivity,
      lecturesActivity,
      playgroundLeaderboard,
    ] = await Promise.all([
      instructorApi.getDashboardStats(scope),
      instructorApi.getDashboardCharts(scope),
      instructorApi.getPracticeStudentProgress(scope),
      instructorApi.getAttendanceAnalytics(scope, sessionCode).catch(() => null),
      instructorApi.getSessions(scope, scope.academicTermId ?? undefined),
      instructorApi.getStudents(scope, sessionCode).catch(() => [] as InstructorStudent[]),
      instructorApi.getClassroomPointsSummary(scope, sessionCode).catch(() => [] as ClassroomPointsSummaryRow[]),
      instructorApi
        .getAssessmentResults(scope, { sessionCode, limit: 500 })
        .catch(() => [] as InstructorAssessmentResult[]),
      instructorApi.getModuleStudentActivity(scope, "flashcards").catch(() => null),
      instructorApi.getModuleStudentActivity(scope, "lectures").catch(() => null),
      instructorApi.getPlaygroundLeaderboard(scope).catch(() => null),
    ])
    setStats(nextStats)
    setCharts(nextCharts)
    setStudents(nextStudents)
    setAttendance(nextAttendance)
    setSessions(sessionRes.sessions ?? [])
    setRoster(nextRoster)
    setPointsSummary(nextPoints)
    setAssessmentResults(nextResults)
    setFlashcardsActivity(flashcardsActivity)
    setLecturesActivity(lecturesActivity)
    setPlaygroundLeaderboard(playgroundLeaderboard)
  }, [scope, sessionFilter, sectionForScope])

  const loadInsights = useCallback(async () => {
    if (!scope) return
    setInsightsError("")
    const summary = await instructorApi.getAiInsightsSummary(scope)
    setInsightsSummary(summary)
    setInsightsLoaded(true)
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load class analytics."))
      .finally(() => setLoading(false))
  }, [ready, load])

  useEffect(() => {
    setInsightsSummary(null)
    setInsightsLoaded(false)
    setInsightsError("")
  }, [scope?.instructorId, scope?.courseId])

  useEffect(() => {
    if (!ready || tab !== "cora_insights" || insightsLoaded) return
    setInsightsLoading(true)
    void loadInsights()
      .catch((err) =>
        setInsightsError(err instanceof ApiError ? err.message : "Could not load Cora insights."),
      )
      .finally(() => setInsightsLoading(false))
  }, [ready, tab, insightsLoaded, loadInsights])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await Promise.all([
        load(),
        tab === "cora_insights"
          ? loadInsights().catch((err) => {
              setInsightsError(err instanceof ApiError ? err.message : "Could not refresh Cora insights.")
            })
          : Promise.resolve(),
      ])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }

  const scopedStudents = useMemo(
    () =>
      filterPracticeProgress(
        students,
        "",
        sectionForScope ?? (sessionFilter === "ALL" ? "ALL" : sessionFilter),
      ),
    [students, sectionForScope, sessionFilter],
  )

  const scopedAttendance = useMemo(
    () =>
      sanitizeFacultyAttendanceAnalytics(attendance, {
        sectionCode: sectionForScope ?? (sessionFilter === "ALL" ? "ALL" : sessionFilter),
        courseSessionCodes: sessions.map((s) => s.code),
      }),
    [attendance, sectionForScope, sessionFilter, sessions],
  )

  const classAnalyticsRows = useMemo(
    () =>
      buildClassAnalyticsRows({
        roster,
        practice: scopedStudents,
        attendanceSummaries: scopedAttendance?.studentSummaries ?? [],
        pointsSummary,
        assessmentResults,
        flashcardActivity: mapModuleFlashcardRows(flashcardsActivity),
        lectureActivity: mapModuleLectureRows(lecturesActivity),
        playgroundActivity: mapPlaygroundLeaderboardRows(playgroundLeaderboard?.leaderboard ?? []),
      }),
    [roster, scopedStudents, scopedAttendance, pointsSummary, assessmentResults, flashcardsActivity, lecturesActivity, playgroundLeaderboard],
  )

  const filteredClassStudents = useMemo(() => {
    const section = sectionForScope ?? (sessionFilter === "ALL" ? "ALL" : sessionFilter)
    const filtered = filterClassAnalyticsRows(classAnalyticsRows, search, section)
    return sortClassAnalyticsRows(filtered, studentSort)
  }, [classAnalyticsRows, search, studentSort, sectionForScope, sessionFilter])

  const classOverview = useMemo(
    () => computeClassAnalyticsOverview(classAnalyticsRows),
    [classAnalyticsRows],
  )

  const lowPractice = useMemo(
    () => scopedStudents.filter((s) => (s.avg_score ?? 100) < 60 && (s.total_attempts ?? 0) > 0),
    [scopedStudents],
  )

  const atRiskRows = useMemo(
    () => buildAtRiskRows(scopedAttendance?.flaggedStudents, scopedAttendance?.chronicAbsentees, lowPractice),
    [scopedAttendance, lowPractice],
  )

  const filteredAtRisk = useMemo(() => filterAtRiskRows(atRiskRows, search), [atRiskRows, search])
  const studentsPager = useFacultyListPager(filteredClassStudents, `${search}:${sessionFilter}:${studentSort}`, "students")
  const atRiskPager = useFacultyListPager(filteredAtRisk, `${search}:${sessionFilter}`, "students")

  const tabs = TABS.map((t) => ({
    ...t,
    label:
      t.id === "at_risk" && atRiskRows.length > 0
        ? `${t.label} · ${atRiskRows.length}`
        : t.id === "students" && classAnalyticsRows.length > 0
          ? `${t.label} · ${classAnalyticsRows.length}`
          : t.label}))

  const practiceDistribution = useMemo(
    () => buildPracticeScoreDistribution(scopedStudents),
    [scopedStudents],
  )
  const engagementDistribution = useMemo(
    () => buildEngagementDistribution(classAnalyticsRows),
    [classAnalyticsRows],
  )
  const practiceDistributionHtml = useMemo(
    () => buildFacultyPracticeScoreDistributionChartHtml(practiceDistribution, chartWidth),
    [practiceDistribution, chartWidth],
  )
  const engagementDistributionHtml = useMemo(
    () => buildFacultyPracticeScoreDistributionChartHtml(engagementDistribution, chartWidth),
    [engagementDistribution, chartWidth],
  )
  const attendanceTrendHtml = useMemo(
    () =>
      scopedAttendance?.weeklyTrend
        ? buildFacultyAttendanceTrendChartHtml(scopedAttendance.weeklyTrend, chartWidth)
        : "",
    [scopedAttendance, chartWidth],
  )
  const breakdownHtml = useMemo(
    () => (charts ? buildFacultyBreakdownChartHtml(charts.assessmentBreakdown, chartWidth) : ""),
    [charts, chartWidth],
  )
  const scoreTrendHtml = useMemo(
    () => (charts ? buildFacultyScoreTrendChartHtml(charts.scoreTrend, chartWidth) : ""),
    [charts, chartWidth],
  )

  useSuppressModuleSearchDock(
    selectedAtRisk != null || profileStudent != null || selectedStudent != null,
  )

  if (!ready) {
    return (
      <View style={moduleStyles.center}>
        <FacultyEmptyState
          icon="analytics-outline"
          title="Select a course"
          body="Class analytics require an active course."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabs} tab={tab} onChange={setTab} scrollable />

        {tab !== "overview" && tab !== "cora_insights" ? (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder={tab === "students" ? "Search students…" : "Search at-risk students…"}
            filterActive={tab === "students" && !sectionForScope && sessionFilter !== "ALL"}
            onOpenFilter={tab === "students" ? () => setSessionSheetOpen(true) : undefined}
            showFilter={tab === "students"}
          />
        ) : null}

        {tab === "students" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortChipRow}
            keyboardShouldPersistTaps="handled"
          >
            {STUDENT_SORTS.map((option) => (
              <FacultyFilterChip
                key={option.id}
                label={option.label}
                active={studentSort === option.id}
                onPress={() => setStudentSort(option.id)}
              />
            ))}
          </ScrollView>
        ) : null}
      </FacultyModuleStickyHeader>

      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_STUDENT_PROGRESS_COLOR.link} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={moduleStyles.errorBox}>
            <Text style={moduleStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading && tab !== "cora_insights" ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={FACULTY_STUDENT_PROGRESS_COLOR.link} />
          </View>
        ) : tab === "overview" ? (
          stats ? (
            <View style={styles.sectionGap}>
              <FacultyHero
                badge="Course analytics"
                title="Class Analytics"
                subtitle="Assessments, practice, attendance, classroom points, and engagement signals across your roster."
                stat={String(stats.totalStudents)}
                statLabel="Enrolled"
                badgeBackground={`${FACULTY_STUDENT_PROGRESS_COLOR.tabActive}22`}
                badgeColor={FACULTY_STUDENT_PROGRESS_COLOR.tabActive}
                statColor={FACULTY_STUDENT_PROGRESS_COLOR.link}
              />
              <FacultyKpiGrid stats={stats} />
              <FacultySectionCard title="Class signals" icon="pulse-outline">
                <View style={styles.classSignals}>
                <FacultyStatRow>
                  <FacultyStatCard
                    icon="school-outline"
                    iconBg={`${FACULTY_STUDENT_PROGRESS_COLOR.tabActive}22`}
                    iconColor={FACULTY_STUDENT_PROGRESS_COLOR.tabActive}
                    value={classOverview.avgAssessment != null ? `${classOverview.avgAssessment}%` : "—"}
                    label="Avg assessment"
                    badge={classOverview.submissionCount > 0 ? `${classOverview.submissionCount} submissions` : undefined}
                    badgeTone="violet"
                  />
                  <FacultyStatCard
                    icon="fitness-outline"
                    iconBg={`${FACULTY_STUDENT_PROGRESS_COLOR.link}22`}
                    iconColor={FACULTY_STUDENT_PROGRESS_COLOR.link}
                    value={String(classOverview.activePracticers)}
                    label="Active in practice"
                    badge={classAnalyticsRows.length > 0 ? `of ${classAnalyticsRows.length}` : undefined}
                    badgeTone="blue"
                  />
                </FacultyStatRow>
                <FacultyStatRow>
                  <FacultyStatCard
                    icon="checkmark-circle-outline"
                    iconBg={`${FACULTY_STUDENT_PROGRESS_COLOR.success}22`}
                    iconColor={FACULTY_STUDENT_PROGRESS_COLOR.success}
                    value={classOverview.avgAttendance != null ? `${classOverview.avgAttendance}%` : "—"}
                    label="Avg attendance"
                    badgeTone="green"
                  />
                  <FacultyStatCard
                    icon="star-outline"
                    iconBg={`${FACULTY_STUDENT_PROGRESS_COLOR.warning}22`}
                    iconColor={FACULTY_STUDENT_PROGRESS_COLOR.warning}
                    value={String(Math.round(classOverview.totalClassPoints))}
                    label="Classroom points"
                    badgeTone="amber"
                  />
                </FacultyStatRow>
                </View>
              </FacultySectionCard>
              {hasEngagementDistributionData(engagementDistribution) ? (
                <FacultyChartCard title="Engagement distribution" html={engagementDistributionHtml} />
              ) : null}
              {hasPracticeScoreDistributionData(practiceDistribution) ? (
                <FacultyChartCard title="Practice mastery distribution" html={practiceDistributionHtml} />
              ) : null}
              {hasBreakdownChartData(charts?.assessmentBreakdown ?? []) ? (
                <FacultyChartCard title="Assessment breakdown" html={breakdownHtml} />
              ) : null}
              {hasScoreTrendChartData(charts?.scoreTrend ?? []) ? (
                <FacultyChartCard title="Score trend" html={scoreTrendHtml} />
              ) : null}
              {scopedAttendance?.weeklyTrend && hasAttendanceTrendChartData(scopedAttendance.weeklyTrend) ? (
                <FacultyChartCard title="Attendance trend" html={attendanceTrendHtml} />
              ) : null}
              {attendance?.overall?.average_attendance_rate != null ? (
                <FacultySectionCard title="Attendance snapshot" icon="checkmark-circle-outline">
                  <Text style={[type.body, { color: native.secondaryLabel, fontWeight: "600", lineHeight: 20 }]}>
                    {Math.round(attendance.overall.average_attendance_rate)}% average attendance across{" "}
                    {attendance.overall.total_sessions ?? 0} sessions
                  </Text>
                  {atRiskRows.length > 0 ? (
                    <Pressable style={styles.linkRow} onPress={() => setTab("at_risk")}>
                      <Text style={[type.caption, { color: FACULTY_STUDENT_PROGRESS_COLOR.link, fontWeight: NATIVE.titleWeight }]}>
                        {atRiskRows.length} students need attention
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={FACULTY_STUDENT_PROGRESS_COLOR.link} />
                    </Pressable>
                  ) : null}
                </FacultySectionCard>
              ) : null}
            </View>
          ) : (
            <FacultyEmptyState icon="analytics-outline" title="No overview data" body="Analytics will appear once students engage with the course." />
          )
        ) : tab === "cora_insights" ? (
          <FacultyAiInsightsPanel
            loading={insightsLoading && !insightsSummary}
            error={insightsError}
            summary={insightsSummary}
          />
        ) : tab === "students" ? (
          filteredClassStudents.length === 0 ? (
            <FacultyEmptyState
              icon="people-outline"
              title={classAnalyticsRows.length === 0 ? "No student activity yet" : "No matches"}
              body={
                classAnalyticsRows.length === 0
                  ? "Assessment submissions, practice, attendance, and classroom points will appear here as students engage."
                  : "Try another search, sort, or section filter."
              }
            />
          ) : (
            <View style={styles.list}>
              {studentsPager.items.map((row) => (
                <FacultyClassAnalyticsStudentCard
                  key={row.student.id || row.student.student_id}
                  row={row}
                  onPress={() => setProfileStudent(row.student)}
                />
              ))}
              <FacultyListPagerFooter pager={studentsPager} />
            </View>
          )
        ) : filteredAtRisk.length === 0 ? (
          <FacultyEmptyState
            icon="checkmark-circle-outline"
            title="No at-risk signals"
            body="Students flagged by attendance or low practice scores will appear here."
          />
        ) : (
          <View style={styles.list}>
            {atRiskPager.items.map((row) => (
              <FacultyAtRiskCard key={row.id} row={row} onPress={() => setSelectedAtRisk(row)} />
            ))}
            <FacultyListPagerFooter pager={atRiskPager} />
          </View>
        )}
      </ScrollView>

      <FacultyFilterSheet
        visible={sessionSheetOpen}
        title="Filter by section"
        subtitle="Limit class roster to one section."
        options={sectionFilterSheetOptions(sessions)}
        value={sessionFilter}
        onSelect={setSessionFilter}
        onClose={() => setSessionSheetOpen(false)}
      />

      <FacultyPracticeStudentReportModal
        visible={selectedStudent != null}
        scope={scope}
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      <FacultyAtRiskActionSheet
        visible={selectedAtRisk != null}
        row={selectedAtRisk}
        allRows={atRiskRows}
        scope={scope}
        onClose={() => setSelectedAtRisk(null)}
        onOpenProfile={(student) => {
          setSelectedAtRisk(null)
          setProfileStudent(student)
        }}
        onOpenPracticeReport={(student) => {
          setSelectedAtRisk(null)
          setSelectedStudent(student)
        }}
      />

      <FacultyStudentDetailModal
        student={profileStudent}
        scope={scope}
        profileEyebrow="Student profile"
        onClose={() => setProfileStudent(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  segmentBar: { marginHorizontal: -16, paddingHorizontal: 16, paddingBottom: 2 },
  sectionGap: { gap: 14 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  list: { gap: 12 },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  sortChipRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  classSignals: { gap: 8 },
})
