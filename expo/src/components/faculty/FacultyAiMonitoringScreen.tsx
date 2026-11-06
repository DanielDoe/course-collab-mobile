import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import {
  instructorApi,
  type FacultyAiConsentedStruggle,
  type FacultyAiHotTopic,
  type FacultyAiStruggleAlert,
} from "../../lib/instructor-api"
import { FacultyEmptyState } from "./faculty-shared"
import {
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  useFacultyStickyHeaderScrollLayout,
} from "./faculty-module-shell"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_STUDENT_PROGRESS_COLOR } from "../../lib/faculty-student-progress-theme"

type MonitorTab = "struggles" | "topics" | "shared"

const TABS: Array<{ id: MonitorTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "struggles", label: "Who needs help", icon: "warning-outline" },
  { id: "topics", label: "Common errors", icon: "flame-outline" },
  { id: "shared", label: "Shared Cora", icon: "shield-checkmark-outline" },
]

function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  return !q || haystack.toLowerCase().includes(q)
}

export function FacultyAiMonitoringScreen() {
  const { styles: moduleStyles } = useModuleTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [tab, setTab] = useState<MonitorTab>("struggles")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [alerts, setAlerts] = useState<FacultyAiStruggleAlert[]>([])
  const [topics, setTopics] = useState<FacultyAiHotTopic[]>([])
  const [shared, setShared] = useState<FacultyAiConsentedStruggle[]>([])
  const [criticalCount, setCriticalCount] = useState(0)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const [struggleRes, topicRes, sharedRes] = await Promise.allSettled([
      instructorApi.getAiMonitoringStruggles(scope),
      instructorApi.getAiMonitoringHotTopics(scope),
      instructorApi.getAiTutorConsentedStruggles(scope),
    ])
    const failures: string[] = []

    if (struggleRes.status === "fulfilled") {
      setAlerts(struggleRes.value.struggles ?? [])
      setCriticalCount(struggleRes.value.criticalCount ?? 0)
    } else {
      failures.push("Who needs help")
    }

    if (topicRes.status === "fulfilled") {
      setTopics(topicRes.value)
    } else {
      setTopics([])
      failures.push("Common errors")
    }

    if (sharedRes.status === "fulfilled") {
      setShared(sharedRes.value)
    } else {
      failures.push("Shared Cora")
    }

    if (failures.length === 3) {
      setError("Could not load AI Monitoring. Pull to refresh.")
    } else if (failures.length > 0) {
      setError(`${failures.join(" · ")} could not be loaded.`)
    }
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    void load()
      .catch(() => {
        setError("Could not load AI Monitoring. Pull to refresh.")
      })
      .finally(() => setLoading(false))
  }, [load, ready])

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((row) =>
        matchesQuery(`${row.student_name ?? ""} ${row.topic ?? ""} ${row.section ?? ""}`, search),
      ),
    [alerts, search],
  )
  const filteredTopics = useMemo(
    () => topics.filter((row) => matchesQuery(row.topic ?? "", search)),
    [search, topics],
  )
  const filteredShared = useMemo(
    () =>
      shared.filter((row) => matchesQuery(`${row.student_name ?? ""} ${row.topic ?? ""}`, search)),
    [search, shared],
  )

  if (!ready) {
    return (
      <View style={moduleStyles.center}>
        <FacultyEmptyState
          icon="pulse-outline"
          title="Select a course"
          body="AI Monitoring needs an active course to show Cora struggles."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={TABS} tab={tab} onChange={setTab} scrollable />
        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={
            tab === "topics" ? "Search topics…" : tab === "shared" ? "Search shared Cora…" : "Search students…"
          }
        />
      </FacultyModuleStickyHeader>

      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
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

        <Text style={moduleStyles.metaText}>
          {criticalCount > 0
            ? `${criticalCount} critical struggle alert${criticalCount === 1 ? "" : "s"} in the last day.`
            : "Repeated Cora questions and class-wide topics. Shared Cora only includes students who opted in."}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={FACULTY_STUDENT_PROGRESS_COLOR.link} />
        ) : tab === "struggles" ? (
          filteredAlerts.length === 0 ? (
            <FacultyEmptyState
              icon="checkmark-circle-outline"
              title="No struggle alerts"
              body="Students repeating the same Cora topic will appear here."
            />
          ) : (
            filteredAlerts.map((row, index) => (
              <View key={`${row.student_id ?? index}-${row.topic ?? index}`} style={moduleStyles.card}>
                <Text style={moduleStyles.cardTitle}>{row.student_name ?? "Student"}</Text>
                <Text style={moduleStyles.cardDates}>
                  {row.topic ?? "Topic"} · {row.question_count ?? 0} questions
                  {row.severity ? ` · ${row.severity}` : ""}
                </Text>
              </View>
            ))
          )
        ) : tab === "topics" ? (
          filteredTopics.length === 0 ? (
            <FacultyEmptyState
              icon="flame-outline"
              title="No common topics yet"
              body="Frequent Cora questions across the class show up here as common errors."
            />
          ) : (
            filteredTopics.map((row, index) => (
              <View key={`${row.topic ?? index}`} style={moduleStyles.card}>
                <Text style={moduleStyles.cardTitle}>{row.topic ?? "Topic"}</Text>
                <Text style={moduleStyles.cardDates}>
                  {row.question_count ?? 0} questions · {row.student_count ?? 0} students
                  {row.trend ? ` · ${row.trend}` : ""}
                </Text>
              </View>
            ))
          )
        ) : filteredShared.length === 0 ? (
          <FacultyEmptyState
            icon="shield-checkmark-outline"
            title="No shared Cora data"
            body="Students must turn on “Share with instructor” in Cora before their struggles appear here."
          />
        ) : (
          filteredShared.map((row, index) => (
            <View key={`${row.id ?? index}-${row.topic ?? index}`} style={moduleStyles.card}>
              <Text style={moduleStyles.cardTitle}>{row.student_name ?? "Student"}</Text>
              <Text style={moduleStyles.cardDates}>
                {row.topic ?? "Topic"} · {row.question_count ?? 0} repeats
                {row.last_seen ? ` · ${row.last_seen}` : ""}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
})
