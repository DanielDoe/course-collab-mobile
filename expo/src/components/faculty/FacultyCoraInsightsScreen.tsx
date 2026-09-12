import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useFacultyModuleNestedHeader } from "../../context/FacultyModuleHeaderContext"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { instructorApi } from "../../lib/instructor-api"
import { FACULTY_STUDENT_PROGRESS_COLOR } from "../../lib/faculty-student-progress-theme"
import {
  CORA_INSIGHTS_RANGES,
  CORA_INSIGHTS_TABS,
  coraInsightsKpiPage,
  mapCoraInsightsHref,
  type CoraInsightsAssistance,
  type CoraInsightsFilterOption,
  type CoraInsightsGaps,
  type CoraInsightsLive,
  type CoraInsightsLiveFilter,
  type CoraInsightsMistake,
  type CoraInsightsNeedStudent,
  type CoraInsightsOverview,
  type CoraInsightsPredictions,
  type CoraInsightsQueryExtra,
  type CoraInsightsRangeId,
  type CoraInsightsStudentProfile,
  type CoraInsightsTabId,
  type CoraInsightsUsage,
} from "../../lib/cora-insights-faculty"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyEmptyState } from "./faculty-shared"
import {
  FacultyFilterChip,
  FacultyFilterSheet,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  useFacultyStickyHeaderScrollLayout,
} from "./faculty-module-shell"
import { FacultyStudentReportSheet } from "./FacultyStudentReportSheet"
import {
  InsightsAssistance,
  InsightsGaps,
  InsightsInterventions,
  InsightsLive,
  InsightsMistakeSheet,
  InsightsNeeds,
  InsightsOverview,
  InsightsPredictions,
  InsightsKpiDetail,
  InsightsStudentSheet,
  InsightsUsage,
} from "./cora-insights/FacultyCoraInsightsViews"

type FilterSheet = "range" | "assessment" | "topic" | "student" | null

export function FacultyCoraInsightsScreen() {
  const router = useRouter()
  const { styles: moduleStyles } = useModuleTheme()
  const { listScrollPad, scrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [tab, setTab] = useState<CoraInsightsTabId>("overview")
  const [range, setRange] = useState<CoraInsightsRangeId>("7d")
  const [assessmentId, setAssessmentId] = useState("all")
  const [topic, setTopic] = useState("all")
  const [studentId, setStudentId] = useState("all")
  const [liveFilter, setLiveFilter] = useState<CoraInsightsLiveFilter>("all")
  const [filterSheet, setFilterSheet] = useState<FilterSheet>(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState<CoraInsightsFilterOption | null>(null)
  const [data, setData] = useState<unknown>(null)

  const [profileId, setProfileId] = useState<number | null>(null)
  const [profileSeed, setProfileSeed] = useState<CoraInsightsNeedStudent | null>(null)
  const [profile, setProfile] = useState<CoraInsightsStudentProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [mistake, setMistake] = useState<CoraInsightsMistake | null>(null)
  const [kpiId, setKpiId] = useState<string | null>(null)
  const [kpiLoading, setKpiLoading] = useState(false)
  const [kpiNeeds, setKpiNeeds] = useState<{ students?: CoraInsightsNeedStudent[] } | null>(null)
  const [kpiLive, setKpiLive] = useState<CoraInsightsLive | null>(null)
  const [kpiAssistance, setKpiAssistance] = useState<CoraInsightsAssistance | null>(null)
  const [kpiTick, setKpiTick] = useState(0)

  const extra = useMemo<CoraInsightsQueryExtra>(
    () => ({ range, assessmentId, topic, studentId }),
    [range, assessmentId, topic, studentId],
  )

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    try {
      const [nextFilters, nextData] = await Promise.all([
        instructorApi.getCoraInsightsFilters(scope, extra),
        instructorApi.getCoraInsights(scope, tab, extra),
      ])
      setFilters(nextFilters)
      setData(nextData)
    } catch {
      setData(null)
      setError("Could not load Cora Insights. Pull to refresh.")
    }
  }, [scope, extra, tab])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, ready])

  useEffect(() => {
    if (!scope || !kpiId) {
      setKpiNeeds(null)
      setKpiLive(null)
      setKpiAssistance(null)
      setKpiLoading(false)
      return
    }
    const page = coraInsightsKpiPage(kpiId)
    if (!page) return
    let cancelled = false
    setKpiLoading(true)
    void Promise.all(
      page.sources.map(async (source) => {
        const payload = await instructorApi.getCoraInsights(scope, source, extra)
        return [source, payload] as const
      }),
    )
      .then((rows) => {
        if (cancelled) return
        for (const [source, payload] of rows) {
          if (source === "needs") setKpiNeeds(payload as { students?: CoraInsightsNeedStudent[] })
          if (source === "live") setKpiLive(payload as CoraInsightsLive)
          if (source === "assistance") setKpiAssistance(payload as CoraInsightsAssistance)
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load that Insight. Pull to refresh.")
      })
      .finally(() => {
        if (!cancelled) setKpiLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope, kpiId, extra, kpiTick])

  useEffect(() => {
    if (!scope || profileId == null) {
      setProfile(null)
      setProfileLoading(false)
      return
    }
    let cancelled = false
    setProfileLoading(true)
    void instructorApi
      .getCoraInsightsStudent(scope, profileId, range)
      .then((next) => {
        if (!cancelled) setProfile(next)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope, profileId, range])

  const openStudent = useCallback((student: CoraInsightsNeedStudent) => {
    setProfileId(student.id)
    setProfileSeed(student)
    setProfile(null)
  }, [])

  const closeStudent = useCallback(() => {
    setProfileId(null)
    setProfileSeed(null)
    setProfile(null)
    setRecordOpen(false)
  }, [])

  const closeKpi = useCallback(() => setKpiId(null), [])
  const kpiPage = coraInsightsKpiPage(kpiId)
  useFacultyModuleNestedHeader({
    active: Boolean(kpiPage),
    title: kpiPage?.title ?? "Cora Insights",
    onBack: closeKpi,
  })

  const handleKpi = useCallback((id: string) => {
    if (!coraInsightsKpiPage(id)) return
    setKpiId(id)
  }, [])

  const handleConcept = useCallback(
    async (concept: string) => {
      if (!scope) return
      try {
        const next = await instructorApi.getCoraInsights<CoraInsightsGaps>(scope, "gaps", { ...extra, concept })
        setData(next)
      } catch {
        setError("Could not load that concept. Pull to refresh.")
      }
    },
    [scope, extra],
  )

  const handleAssign = useCallback(async () => {
    if (!scope || profileId == null || assigning) return
    setAssigning(true)
    try {
      await instructorApi.assignCoraInsightsPractice(scope, profileId, range)
      Alert.alert("Targeted practice assigned", `${profileSeed?.name ?? "Student"} was messaged and notified.`)
    } catch (err) {
      Alert.alert("Could not assign practice", err instanceof Error ? err.message : "Try again.")
    } finally {
      setAssigning(false)
    }
  }, [scope, profileId, assigning, range, profileSeed?.name])

  const handleHref = useCallback(
    (href?: string | null) => {
      const route = mapCoraInsightsHref(href)
      if (route) router.push(route as never)
    },
    [router],
  )

  const rangeLabel = CORA_INSIGHTS_RANGES.find((row) => row.id === range)?.label ?? "7 Days"
  const assessmentLabel =
    assessmentId === "all"
      ? "All assessments"
      : filters?.assessments.find((row) => String(row.id) === assessmentId)?.title ?? "Assessment"
  const topicLabel = topic === "all" ? "All topics" : topic
  const studentLabel =
    studentId === "all"
      ? "All students"
      : filters?.students.find((row) => String(row.id) === studentId)?.name ?? "Student"

  const filterOptions = useMemo(() => {
    if (filterSheet === "range") {
      return CORA_INSIGHTS_RANGES.map((row) => ({ value: row.id, label: row.label }))
    }
    if (filterSheet === "assessment") {
      return [
        { value: "all", label: "All assessments" },
        ...(filters?.assessments ?? []).map((row) => ({ value: String(row.id), label: row.title })),
      ]
    }
    if (filterSheet === "topic") {
      return [
        { value: "all", label: "All topics" },
        ...(filters?.topics ?? []).map((row) => ({ value: row, label: row })),
      ]
    }
    if (filterSheet === "student") {
      return [
        { value: "all", label: "All students" },
        ...(filters?.students ?? []).map((row) => ({
          value: String(row.id),
          label: row.name,
          detail: [row.code, row.section].filter(Boolean).join(" · ") || undefined,
        })),
      ]
    }
    return []
  }, [filterSheet, filters])

  const filterValue =
    filterSheet === "range"
      ? range
      : filterSheet === "assessment"
        ? assessmentId
        : filterSheet === "topic"
          ? topic
          : studentId

  if (!ready) {
    return (
      <View style={moduleStyles.center}>
        <FacultyEmptyState
          icon="sparkles-outline"
          title="Select a course"
          body="Cora Insights needs an active offering to show student Cora use."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      {kpiPage ? null : (
        <FacultyModuleStickyHeader>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <FacultyFilterChip label={rangeLabel} active={range !== "7d"} onPress={() => setFilterSheet("range")} />
            <FacultyFilterChip
              label={assessmentLabel}
              active={assessmentId !== "all"}
              onPress={() => setFilterSheet("assessment")}
            />
            <FacultyFilterChip label={topicLabel} active={topic !== "all"} onPress={() => setFilterSheet("topic")} />
            <FacultyFilterChip
              label={studentLabel}
              active={studentId !== "all"}
              onPress={() => setFilterSheet("student")}
            />
          </ScrollView>
          <FacultyModuleTabBar tabs={[...CORA_INSIGHTS_TABS]} tab={tab} onChange={setTab} scrollable />
        </FacultyModuleStickyHeader>
      )}

      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[styles.content, kpiPage ? scrollPad : listScrollPad]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              if (kpiId) setKpiTick((value) => value + 1)
              void load().finally(() => setRefreshing(false))
            }}
            tintColor={FACULTY_STUDENT_PROGRESS_COLOR.link}
          />
        }
      >
        {error ? (
          <View style={moduleStyles.errorBox}>
            <Text style={moduleStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        {kpiId ? (
          <InsightsKpiDetail
            kpiId={kpiId}
            kpi={(data as CoraInsightsOverview | null)?.kpis?.find((row) => row.id === kpiId)}
            rangeLabel={rangeLabel}
            loading={kpiLoading}
            needs={kpiNeeds}
            live={kpiLive}
            assistance={kpiAssistance}
            onStudent={openStudent}
          />
        ) : loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={FACULTY_STUDENT_PROGRESS_COLOR.link} />
          </View>
        ) : tab === "overview" ? (
          <InsightsOverview
            data={data as CoraInsightsOverview | null}
            onKpi={handleKpi}
            onStudent={openStudent}
            onOpenHref={handleHref}
          />
        ) : tab === "needs" ? (
          <InsightsNeeds data={data as { students?: CoraInsightsNeedStudent[] } | null} onStudent={openStudent} />
        ) : tab === "gaps" ? (
          <InsightsGaps
            data={data as CoraInsightsGaps | null}
            onConcept={(concept) => void handleConcept(concept)}
            onMistake={setMistake}
          />
        ) : tab === "usage" ? (
          <InsightsUsage data={data as CoraInsightsUsage | null} />
        ) : tab === "assistance" ? (
          <InsightsAssistance data={data as CoraInsightsAssistance | null} />
        ) : tab === "live" ? (
          <InsightsLive
            data={data as CoraInsightsLive | null}
            liveFilter={liveFilter}
            onFilter={setLiveFilter}
            onStudent={openStudent}
          />
        ) : tab === "predictions" ? (
          <InsightsPredictions data={data as CoraInsightsPredictions | null} onStudent={openStudent} />
        ) : (
          <InsightsInterventions data={data} onOpenHref={handleHref} />
        )}
      </ScrollView>

      <FacultyFilterSheet
        visible={filterSheet != null}
        title={
          filterSheet === "range"
            ? "Date range"
            : filterSheet === "assessment"
              ? "Assessment"
              : filterSheet === "topic"
                ? "Topic"
                : "Student"
        }
        options={filterOptions}
        value={filterValue}
        onSelect={(value) => {
          if (filterSheet === "range") setRange(value as CoraInsightsRangeId)
          if (filterSheet === "assessment") setAssessmentId(value)
          if (filterSheet === "topic") setTopic(value)
          if (filterSheet === "student") setStudentId(value)
        }}
        onClose={() => setFilterSheet(null)}
      />

      <InsightsStudentSheet
        visible={profileId != null && !recordOpen}
        loading={profileLoading}
        profile={profile}
        seed={profileSeed}
        assigning={assigning}
        onClose={closeStudent}
        onAssign={() => void handleAssign()}
        onOpenRecord={() => setRecordOpen(true)}
      />

      <InsightsMistakeSheet mistake={mistake} onClose={() => setMistake(null)} />

      {scope ? (
        <FacultyStudentReportSheet
          visible={recordOpen}
          scope={scope}
          studentId={profileId}
          attemptSearch=""
          onClose={() => setRecordOpen(false)}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  filterRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36, gap: 14 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
})
