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
import {
  activityFilterCounts,
  filterRecentActivity,
  type ActivityStatusFilter} from "../../lib/faculty-assessment-utils"
import { instructorApi, type InstructorRecentActivity } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { FacultyEmptyState } from "./faculty-shared"
import {
  FacultyRecentActivityCard,
  FacultyRecentActivityKpiRow,
} from "./FacultyAnalyticsListCards"
import { FACULTY_ACTIVITY_COLOR } from "../../lib/faculty-recent-activity-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { useFacultyStickyHeaderScrollLayout,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar} from "./faculty-module-shell"

const ACTIVITY_TABS: Array<{ id: ActivityStatusFilter; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "ALL", label: "All", icon: "layers-outline" },
  { id: "submitted", label: "Submitted", icon: "checkmark-circle-outline" },
  { id: "in_progress", label: "In progress", icon: "time-outline" },
  { id: "saved_for_later", label: "Saved", icon: "bookmark-outline" },
]

function activityTabLabel(id: ActivityStatusFilter): string {
  if (id === "ALL") return "All"
  if (id === "submitted") return "Submitted"
  if (id === "in_progress") return "In progress"
  return "Saved"
}

export function FacultyRecentActivityScreen() {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [activity, setActivity] = useState<InstructorRecentActivity[]>([])
  const [filter, setFilter] = useState<ActivityStatusFilter>("ALL")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    setActivity(await instructorApi.getRecentActivity(scope))
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch(() => setError("Could not load recent activity."))
      .finally(() => setLoading(false))
  }, [ready, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  const counts = useMemo(() => activityFilterCounts(activity), [activity])
  const filtered = useMemo(() => filterRecentActivity(activity, filter, search), [activity, filter, search])

  const tabs = ACTIVITY_TABS.map((t) => ({
    ...t,
    label:
      t.id !== "ALL" && counts[t.id] > 0
        ? `${activityTabLabel(t.id)} · ${counts[t.id]}`
        : activityTabLabel(t.id)}))

  if (!ready) {
    return (
      <View style={moduleStyles.center}>
        <FacultyEmptyState
          icon="pulse-outline"
          title="Select a course"
          body="Recent activity requires an active course."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader>
        <View style={styles.segmentBar}>
          <FacultyModuleTabBar tabs={tabs} tab={filter} onChange={setFilter} scrollable />
        </View>

        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search student or assessment…"
          showFilter={false}
        />
      </FacultyModuleStickyHeader>

      <ScrollView
        style={[moduleStyles.root, moduleStyles.scroll]}
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_ACTIVITY_COLOR.link} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FacultyRecentActivityKpiRow
          total={activity.length}
          submitted={counts.submitted}
          inProgress={counts.in_progress}
        />

        {error ? (
          <View style={moduleStyles.errorBox}>
            <Text style={moduleStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={FACULTY_ACTIVITY_COLOR.link} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <FacultyEmptyState
          icon="pulse-outline"
          title={activity.length === 0 ? "No activity yet" : "No matches"}
          body={
            activity.length === 0
              ? "Student assessment events will appear here."
              : "Try a different filter or search term."
          }
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((item) => (
            <FacultyRecentActivityCard key={item.id} item={item} />
          ))}
        </View>
      )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  segmentBar: { marginHorizontal: -16, paddingHorizontal: 16, paddingBottom: 2 },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  list: { gap: 12 },
})
