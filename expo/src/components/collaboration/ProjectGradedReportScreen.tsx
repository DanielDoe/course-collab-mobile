import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { collaborationApi, type GradedReport } from "../../lib/collaboration-api"
import { CommGroupedList, CommSectionFooter, CommSectionHeader } from "../faculty/faculty-communication-ui"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { CollabFlowHeader } from "./collab-nav"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function ProjectGradedReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = Number(id)
  const session = useStudentSession()
  const native = useThemedNative()
  const type = useNativeType()
  const SN = useThemedStudentNative()
  const [report, setReport] = useState<GradedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(projectId)) return
    setError("")
    try {
      setReport(await collaborationApi.getGradedReport(session, projectId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load report.")
      setReport(null)
    }
  }, [session, projectId])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, session])

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
        <CollabFlowHeader title="Reports" fallbackHref="/module/projects" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={native.tint} />
        </View>
      </View>
    )
  }

  if (!report) {
    return (
      <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
        <CollabFlowHeader title="Reports" fallbackHref="/module/projects" />
        <View style={styles.center}>
          <Text style={type.destructive}>{error || "Report not found."}</Text>
        </View>
      </View>
    )
  }

  const grades = report.grades ?? []
  const gradeBySection = new Map(grades.map((g) => [Number(g.workspace_section_id), g]))
  const earned = grades.reduce((sum, g) => sum + (Number(g.score) || 0), 0)
  const max = report.maxPoints ?? grades.reduce((sum, g) => sum + (Number(g.max_score) || 0), 0)

  return (
    <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
      <CollabFlowHeader
        title={report.title ?? "Graded Report"}
        subtitle={report.groupName ?? "Group project"}
        fallbackHref={`/collaboration/projects/${projectId}`}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <CommGroupedList>
          <View style={styles.summaryRow}>
            <FacultyStatusPill
              label={report.provisional ? "Provisional" : report.submissionStatus || "Report"}
              tone="neutral"
            />
            {report.showScore !== false ? (
              <Text style={[styles.score, { color: SN.accent }]}>
                {earned} / {max}
              </Text>
            ) : (
              <Text style={[type.caption, { color: native.secondaryLabel }]}>Scores hidden until release</Text>
            )}
          </View>
        </CommGroupedList>

        {(report.sections ?? []).map((section) => {
          const grade = gradeBySection.get(Number(section.id))
          return (
            <View key={section.id} style={{ gap: 8 }}>
              <CommSectionHeader title={section.title} />
              <CommGroupedList>
                <View style={styles.blockRow}>
                  {report.showSectionScores !== false && grade ? (
                    <Text style={[type.bodyEmphasis, { color: native.label }]}>
                      {grade.score ?? "—"} / {grade.max_score ?? section.config?.points ?? "—"}
                    </Text>
                  ) : null}
                  {section.instructions ? (
                    <Text style={[type.callout, { color: native.secondaryLabel }]}>{section.instructions}</Text>
                  ) : null}
                  {report.showFeedback !== false && grade?.feedback ? (
                    <Text style={[type.callout, { color: native.label }]}>{grade.feedback}</Text>
                  ) : null}
                </View>
              </CommGroupedList>
            </View>
          )
        })}

        <CommSectionFooter>
          This is the same graded report students see on the web after the instructor releases feedback.
        </CommSectionFooter>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: NATIVE.pagePadding, gap: 12, paddingBottom: 40 },
  summaryRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  score: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  blockRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
})
