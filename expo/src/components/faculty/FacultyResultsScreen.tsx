import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import {
  instructorApi,
  type InstructorAssessmentResult} from "../../lib/instructor-api"
import {
  countResultsByTab,
  filterResults,
  resultsTabLabel,
  type ResultsTab} from "../../lib/faculty-results-utils"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyStickyHeaderScrollLayout,
  FacultyFilterSheet,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  sectionFilterSheetOptions,
  resolveSessionFilterCode} from "./faculty-module-shell"
import type { InstructorSession } from "../../lib/instructor-api"
import { FacultyAttemptReportModal } from "./FacultyAttemptReportModal"
import { FacultyResultCard } from "./FacultyResultsListCards"
import { FACULTY_RESULTS_COLOR } from "../../lib/faculty-results-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"

const RESULT_TABS: Array<{ id: ResultsTab; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "all", icon: "layers-outline" },
  { id: "quiz", icon: "clipboard-outline" },
  { id: "homework", icon: "book-outline" },
  { id: "mid_semester", icon: "school-outline" },
  { id: "final", icon: "ribbon-outline" },
  { id: "flagged", icon: "flag-outline" },
]

export function FacultyResultsScreen() {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [tab, setTab] = useState<ResultsTab>("all")
  const [results, setResults] = useState<InstructorAssessmentResult[]>([])
  const [sessions, setSessions] = useState<InstructorSession[]>([])
  const [sessionFilter, setSessionFilter] = useState("ALL")
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [selectedResult, setSelectedResult] = useState<InstructorAssessmentResult | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const sessionCode = resolveSessionFilterCode(sessions, sessionFilter)
    const [rows, sessionRes] = await Promise.all([
      instructorApi.getAssessmentResults(scope, { sessionCode, limit: 500 }),
      instructorApi.getSessions(scope),
    ])
    setResults(rows)
    setSessions(sessionRes.sessions ?? [])
  }, [scope, sessionFilter])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load results."))
      .finally(() => setLoading(false))
  }, [ready, load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }, [load])

  useNotificationModuleRefresh(["assessments", "grades"], handleRefresh)

  const counts = useMemo(() => countResultsByTab(results), [results])
  const filtered = useMemo(
    () => filterResults(results, tab, search),
    [results, tab, search],
  )

  const tabs = RESULT_TABS.map((t) => ({
    ...t,
    label:
      t.id === "flagged" && counts.flagged > 0
        ? `${resultsTabLabel(t.id)} · ${counts.flagged}`
        : counts[t.id] > 0 && t.id !== "all"
          ? `${resultsTabLabel(t.id)} · ${counts[t.id]}`
          : resultsTabLabel(t.id)}))

  if (!ready) {
    return (
      <View style={moduleStyles.center}>
        <FacultyEmptyState
          icon="bar-chart-outline"
          title="Select a course"
          body="Results and grading require an active course."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader>
        <View style={styles.segmentBar}>
          <FacultyModuleTabBar tabs={tabs} tab={tab} onChange={setTab} scrollable />
        </View>

        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search student, assessment, section…"
          filterActive={sessionFilter !== "ALL"}
          onOpenFilter={() => setSessionSheetOpen(true)}
        />
      </FacultyModuleStickyHeader>

      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_RESULTS_COLOR.link} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={moduleStyles.errorBox}>
            <Text style={moduleStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={FACULTY_RESULTS_COLOR.link} />
          </View>
        ) : filtered.length === 0 ? (
          <FacultyEmptyState
            icon="bar-chart-outline"
            title={results.length === 0 ? "No results yet" : "No matches"}
            body={
              results.length === 0
                ? "Student assessment submissions will appear here."
                : "Try another filter or search term."
            }
          />
        ) : (
          filtered.slice(0, 80).map((item) => (
            <FacultyResultCard key={item.attempt_id} item={item} onPress={() => setSelectedResult(item)} />
          ))
        )}

        {!loading && filtered.length > 80 ? (
          <Text style={[type.caption, styles.moreNote, { color: native.tertiaryLabel }]}>
            Showing first 80 matches. Refine your search to see more.
          </Text>
        ) : null}
      </ScrollView>

      <FacultyFilterSheet
        visible={sessionSheetOpen}
        title="Filter by section"
        subtitle="Limit results to one session."
        options={sectionFilterSheetOptions(sessions)}
        value={sessionFilter}
        onSelect={setSessionFilter}
        onClose={() => setSessionSheetOpen(false)}
      />

      <FacultyAttemptReportModal
        visible={selectedResult != null}
        scope={scope}
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  moreNote: { textAlign: "center", paddingVertical: 8, lineHeight: 18 },
  segmentBar: { marginHorizontal: -16, paddingHorizontal: 16, paddingBottom: 2 },
})
