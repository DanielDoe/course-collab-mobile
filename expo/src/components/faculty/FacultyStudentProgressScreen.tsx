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
  instructorApi,
  type AttendanceAnalytics,
  type InstructorDashboardCharts,
  type InstructorDashboardStats,
  type InstructorSession,
  type InstructorStudent,
  type PracticeStudentProgress,
} from "../../lib/instructor-api"
import {
  buildFacultyBreakdownChartHtml,
  buildFacultyPracticeScoreDistributionChartHtml,
  buildFacultyScoreTrendChartHtml,
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
import { FacultyStudentProgressCard, FacultyAtRiskCard } from "./FacultyAnalyticsListCards"
import { FACULTY_STUDENT_PROGRESS_COLOR } from "../../lib/faculty-student-progress-theme"
import { FacultyEmptyState, FacultyHero, FacultySectionCard } from "./faculty-shared"
import { useFacultyStickyHeaderScrollLayout,
  FacultyFilterSheet,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  sectionFilterSheetOptions} from "./faculty-module-shell"
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
  { id: "students", label: "Students", icon: "people-outline" },
  { id: "at_risk", label: "At risk", icon: "warning-outline" },
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
  const [attendance, setAttendance] = useState<AttendanceAnalytics | null>(null)
  const [sessions, setSessions] = useState<InstructorSession[]>([])
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<PracticeStudentProgress | null>(null)
  const [selectedAtRisk, setSelectedAtRisk] = useState<AtRiskStudentRow | null>(null)
  const [profileStudent, setProfileStudent] = useState<InstructorStudent | null>(null)

  const sectionForScope = useMemo(
    () => effectiveFacultySectionCode(scope, sessionFilter, "ALL"),
    [scope, sessionFilter],
  )

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const sessionCode = sectionForScope ?? (sessionFilter === "ALL" ? undefined : sessionFilter)
    const [nextStats, nextCharts, nextStudents, nextAttendance, sessionRes] = await Promise.all([
      instructorApi.getDashboardStats(scope),
      instructorApi.getDashboardCharts(scope),
      instructorApi.getPracticeStudentProgress(scope),
      instructorApi.getAttendanceAnalytics(scope, sessionCode).catch(() => null),
      instructorApi.getSessions(scope),
    ])
    setStats(nextStats)
    setCharts(nextCharts)
    setStudents(nextStudents)
    setAttendance(nextAttendance)
    setSessions(sessionRes.sessions ?? [])
  }, [scope, sessionFilter, sectionForScope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load student progress."))
      .finally(() => setLoading(false))
  }, [ready, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
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

  const filteredStudents = useMemo(
    () => filterPracticeProgress(students, search, sectionForScope ?? sessionFilter),
    [students, search, sectionForScope, sessionFilter],
  )

  const lowPractice = useMemo(
    () => scopedStudents.filter((s) => (s.avg_score ?? 100) < 60 && (s.total_attempts ?? 0) > 0),
    [scopedStudents],
  )

  const scopedAttendance = useMemo(
    () =>
      sanitizeFacultyAttendanceAnalytics(attendance, {
        sectionCode: sectionForScope ?? (sessionFilter === "ALL" ? "ALL" : sessionFilter),
        courseSessionCodes: sessions.map((s) => s.code),
      }),
    [attendance, sectionForScope, sessionFilter, sessions],
  )

  const atRiskRows = useMemo(
    () => buildAtRiskRows(scopedAttendance?.flaggedStudents, scopedAttendance?.chronicAbsentees, lowPractice),
    [scopedAttendance, lowPractice],
  )

  const filteredAtRisk = useMemo(() => filterAtRiskRows(atRiskRows, search), [atRiskRows, search])
  const studentsPager = useFacultyListPager(filteredStudents, `${search}:${sessionFilter}`, "students")
  const atRiskPager = useFacultyListPager(filteredAtRisk, `${search}:${sessionFilter}`, "students")

  const tabs = TABS.map((t) => ({
    ...t,
    label:
      t.id === "at_risk" && atRiskRows.length > 0
        ? `${t.label} · ${atRiskRows.length}`
        : t.id === "students" && scopedStudents.length > 0
          ? `${t.label} · ${scopedStudents.length}`
          : t.label}))

  const practiceDistribution = useMemo(
    () => buildPracticeScoreDistribution(scopedStudents),
    [scopedStudents],
  )
  const practiceDistributionHtml = useMemo(
    () => buildFacultyPracticeScoreDistributionChartHtml(practiceDistribution, chartWidth),
    [practiceDistribution, chartWidth],
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
          body="Student progress analytics require an active course."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabs} tab={tab} onChange={setTab} scrollable />

        {tab !== "overview" ? (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder={tab === "students" ? "Search students…" : "Search at-risk students…"}
            filterActive={tab === "students" && !sectionForScope && sessionFilter !== "ALL"}
            onOpenFilter={tab === "students" ? () => setSessionSheetOpen(true) : undefined}
            showFilter={tab === "students"}
          />
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

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={FACULTY_STUDENT_PROGRESS_COLOR.link} />
          </View>
        ) : tab === "overview" ? (
          stats ? (
            <View style={styles.sectionGap}>
              <FacultyHero
                badge="Course analytics"
                title="Student progress"
                subtitle="Engagement, assessment trends, and mastery signals for your course."
                stat={String(stats.totalStudents)}
                statLabel="Enrolled"
                badgeBackground={`${FACULTY_STUDENT_PROGRESS_COLOR.tabActive}22`}
                badgeColor={FACULTY_STUDENT_PROGRESS_COLOR.tabActive}
                statColor={FACULTY_STUDENT_PROGRESS_COLOR.link}
              />
              <FacultyKpiGrid stats={stats} />
              {hasPracticeScoreDistributionData(practiceDistribution) ? (
                <FacultyChartCard title="Practice mastery distribution" html={practiceDistributionHtml} />
              ) : null}
              {hasBreakdownChartData(charts?.assessmentBreakdown ?? []) ? (
                <FacultyChartCard title="Assessment breakdown" html={breakdownHtml} />
              ) : null}
              {hasScoreTrendChartData(charts?.scoreTrend ?? []) ? (
                <FacultyChartCard title="Score trend" html={scoreTrendHtml} />
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
        ) : tab === "students" ? (
          filteredStudents.length === 0 ? (
            <FacultyEmptyState
              icon="people-outline"
              title={scopedStudents.length === 0 ? "No practice progress yet" : "No matches"}
              body={
                scopedStudents.length === 0
                  ? "Student practice activity will appear here."
                  : "Try another search or section filter."
              }
            />
          ) : (
            <View style={styles.list}>
              {studentsPager.items.map((student) => (
                <FacultyStudentProgressCard
                  key={student.student_id}
                  student={student}
                  onPress={() => setSelectedStudent(student)}
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
        subtitle="Limit practice progress to one section."
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
})
