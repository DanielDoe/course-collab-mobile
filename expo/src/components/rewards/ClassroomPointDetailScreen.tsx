import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { shortenTaskTitle } from "../../lib/classroom-submission"
import type { ClassroomPointRow } from "../../lib/instructor-api"
import { FacultySubmissionReviewPanel } from "../faculty/FacultySubmissionReviewPanel"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import {
  categoryLabel,
  formatRelativeTime,
  rewardsApi,
  type ClassroomPointRecord,
} from "../../lib/rewards-api"
import { TaskMetaChip, TaskSectionCard, useRewardsTheme } from "./rewards-shared"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function normalizePointRecord(raw: ClassroomPointRecord): ClassroomPointRow {
  return {
    id: raw.id,
    student_id: 0,
    points: raw.points,
    reason: raw.reason,
    category: raw.category,
    status: raw.status,
    created_at: raw.created_at ?? raw.awarded_at ?? "",
    awarded_at: raw.awarded_at,
    submission_id: raw.submission_id,
    submission_title: raw.submission_title,
    instructor_name: raw.instructor_name,
    code: raw.code ?? raw.submission_code ?? null,
    plot_image: raw.plot_image ?? null,
    solution_answer_json: raw.solution_answer_json,
    assignment_question_config: raw.assignment_question_config,
    point_booster: raw.point_booster,
  }
}

function pointStatusColor(status: string | undefined): string {
  if (status === "approved") return "#16a34a"
  if (status === "pending") return "#d97706"
  if (status === "rejected") return "#dc2626"
  return "#64748b"
}

export function ClassroomPointDetailScreen() {
  const session = useStudentSession()
  const scrollPad = useModuleScrollContentPadding(24)
  const theme = useRewardsTheme()
  const tokens = useAppThemeTokens()
  const { id } = useLocalSearchParams<{ id: string }>()
  const pointId = Number(id)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [point, setPoint] = useState<ClassroomPointRecord | null>(null)

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(pointId)) return
    try {
      const data = await rewardsApi.getClassroomPoints(session)
      const found = (data.points ?? []).find((row) => row.id === pointId) ?? null
      if (!found) {
        setError("This award record could not be found.")
        setPoint(null)
        return
      }
      setPoint(found)
      setError("")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load submission details.")
      setPoint(null)
    }
  }, [session, pointId])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [session, load])

  const title = useMemo(() => {
    if (!point) return "Submission"
    return shortenTaskTitle(point.submission_title?.trim() || point.reason)
  }, [point])

  const reviewPoint = useMemo(
    () => (point ? normalizePointRecord(point) : null),
    [point],
  )

  const pts = Number(point?.points ?? 0)
  const feedbackText =
    typeof point?.ai_feedback === "string"
      ? point.ai_feedback
      : point?.ai_feedback &&
          typeof point.ai_feedback === "object" &&
          "text" in (point.ai_feedback as Record<string, unknown>) &&
          typeof (point.ai_feedback as { text?: unknown }).text === "string"
        ? (point.ai_feedback as { text: string }).text
        : null

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: tokens.background }]}>
        <NotetakerScreenHeader title="Submission" fallbackHref="/module/classroom-points" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <NotetakerScreenHeader title={title} fallbackHref="/module/classroom-points" />
      <ScrollView
        contentContainerStyle={[styles.content, scrollPad]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {point ? (
          <>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.chipRow}>
                <TaskMetaChip label={categoryLabel(point.category)} tone="kind" />
                <TaskMetaChip
                  label={point.status ?? "Awarded"}
                  tone={point.status === "pending" ? "pending" : "due"}
                />
                <TaskMetaChip label={`+${pts.toFixed(pts % 1 ? 1 : 0)} pts`} tone="due" />
              </View>
            </View>

            <TaskSectionCard title="Award summary" icon="ribbon-outline">
              <View style={styles.summaryRows}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Status</Text>
                  <Text style={[styles.summaryValue, { color: pointStatusColor(point.status) }]}>
                    {point.status ?? "Awarded"}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Awarded</Text>
                  <Text style={styles.summaryValue}>
                    {formatRelativeTime(point.awarded_at) || "—"}
                  </Text>
                </View>
                {point.instructor_name ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Instructor</Text>
                    <Text style={styles.summaryValue}>{point.instructor_name}</Text>
                  </View>
                ) : null}
              </View>
            </TaskSectionCard>

            {feedbackText ? (
              <View style={styles.feedbackBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#b45309" />
                <Text style={styles.feedbackText}>{feedbackText}</Text>
              </View>
            ) : null}

            {reviewPoint ? <FacultySubmissionReviewPanel point={reviewPoint} /> : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: "#b91c1c", fontSize: 14, lineHeight: 20 },
  titleBlock: { gap: 10 },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryRows: { gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  summaryValue: { fontSize: 14, fontWeight: "700", color: "#0f172a", textAlign: "right", flex: 1 },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  feedbackText: { flex: 1, fontSize: 13, color: "#92400e", lineHeight: 18 },
})
