import { useCallback, useEffect, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { instructorApi, type FacultyAiInsightsSummary } from "../../lib/instructor-api"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultyAiInsightsPanel } from "./FacultyAiInsightsPanel"
import { FacultyModuleStickyHeader, useFacultyStickyHeaderScrollLayout } from "./faculty-module-shell"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_STUDENT_PROGRESS_COLOR } from "../../lib/faculty-student-progress-theme"

export function FacultyAiInsightsScreen() {
  const { styles: moduleStyles } = useModuleTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<FacultyAiInsightsSummary | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    setSummary(await instructorApi.getAiInsightsSummary(scope))
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, ready])

  if (!ready) {
    return (
      <View style={moduleStyles.center}>
        <FacultyEmptyState
          icon="sparkles-outline"
          title="Select a course"
          body="AI Insights needs an active course to summarize Cora and mastery signals."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader />
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
        <FacultyAiInsightsPanel loading={loading} error={error} summary={summary} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
})
