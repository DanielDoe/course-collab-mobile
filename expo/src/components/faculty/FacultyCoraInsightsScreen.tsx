import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyStickyHeaderScrollLayout, FacultyModuleStickyHeader } from "./faculty-module-shell"
import { useModuleTheme } from "../../lib/themed-module-shell"

type ActivityRow = {
  id: number
  student_name: string
  topic?: string
  message: string
  created_at: string
}

export function FacultyCoraInsightsScreen() {
  const { styles: moduleStyles, native } = useModuleTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [engagement, setEngagement] = useState<{
    activeUsers: number
    totalStudents: number
    totalQuestions?: number
    engagementRate: number
  } | null>(null)
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [hotTopics, setHotTopics] = useState<Array<{ topic: string; question_count: number; student_count: number }>>([])
  const [struggles, setStruggles] = useState<Array<{ student_name: string; topic: string; question_count: number; severity: string }>>([])

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const [eng, act, hot, struggle] = await Promise.all([
      instructorApi.getCoraInsightsEngagement(scope, 7),
      instructorApi.getCoraInsightsActivity(scope, 10080),
      instructorApi.getCoraInsightsHotTopics(scope, 168),
      instructorApi.getCoraInsightsStruggles(scope, 168),
    ])
    setEngagement(eng)
    setActivity(act.activity ?? [])
    setHotTopics(hot.hotTopics ?? [])
    setStruggles(struggle.struggles ?? [])
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load Cora Insights."))
      .finally(() => setLoading(false))
  }, [ready, load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } catch {
      /* keep last good data */
    } finally {
      setRefreshing(false)
    }
  }, [load])

  return (
    <View style={moduleStyles.screen}>
      <FacultyModuleStickyHeader title="Cora Insights" subtitle="Student Cora use for this offering" />
      <ScrollView
        contentContainerStyle={[styles.body, listScrollPad]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator color={native.accent} style={{ marginTop: 32 }} />
        ) : error ? (
          <FacultyEmptyState title="Could not load" body={error} />
        ) : (
          <>
            <View style={styles.kpiRow}>
              <Kpi label="Active" value={String(engagement?.activeUsers ?? 0)} hint="Last 7 days" />
              <Kpi label="Turns" value={String(engagement?.totalQuestions ?? activity.length)} hint="Last 7 days" />
              <Kpi
                label="Engaged"
                value={`${engagement?.engagementRate ?? 0}%`}
                hint={`${engagement?.activeUsers ?? 0} of ${engagement?.totalStudents ?? 0}`}
              />
              <Kpi label="Struggles" value={String(struggles.length)} hint="Repeat topics" />
            </View>

            <Text style={styles.section}>Hot topics</Text>
            {hotTopics.length === 0 ? (
              <Text style={styles.muted}>No Cora topics in this offering yet.</Text>
            ) : (
              hotTopics.slice(0, 8).map((topic) => (
                <View key={topic.topic} style={styles.card}>
                  <Text style={styles.cardTitle}>{topic.topic}</Text>
                  <Text style={styles.muted}>
                    {topic.question_count} turns · {topic.student_count} students
                  </Text>
                </View>
              ))
            )}

            <Text style={styles.section}>Recent questions</Text>
            {activity.length === 0 ? (
              <Text style={styles.muted}>No Cora questions in the last 7 days.</Text>
            ) : (
              activity.slice(0, 20).map((row) => (
                <View key={`${row.id}-${row.created_at}`} style={styles.card}>
                  <Text style={styles.cardTitle}>{row.student_name}</Text>
                  <Text style={styles.topic}>{row.topic || "Cora"}</Text>
                  <Text style={styles.message} numberOfLines={3}>
                    {row.message}
                  </Text>
                </View>
              ))
            )}

            <Text style={styles.section}>Students needing help</Text>
            {struggles.length === 0 ? (
              <Text style={styles.muted}>No repeat-topic alerts this week.</Text>
            ) : (
              struggles.slice(0, 12).map((row, idx) => (
                <View key={`${row.student_name}-${row.topic}-${idx}`} style={styles.card}>
                  <Text style={styles.cardTitle}>{row.student_name}</Text>
                  <Text style={styles.muted}>
                    {row.topic} · {row.question_count} questions · {row.severity}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.muted}>{hint}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 10, paddingBottom: 40 },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpi: {
    width: "47%",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  kpiValue: { fontSize: 22, fontWeight: "700" },
  kpiLabel: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  section: { fontSize: 16, fontWeight: "700", marginTop: 12 },
  card: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(15,23,42,0.04)",
    gap: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  topic: { fontSize: 12, fontWeight: "600", color: "#6366f1" },
  message: { fontSize: 13, lineHeight: 18 },
  muted: { fontSize: 12, opacity: 0.65 },
})
