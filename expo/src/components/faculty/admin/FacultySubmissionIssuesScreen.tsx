import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import {
  instructorAdminApi,
  type SubmissionDiagnosticsResponse} from "../../../lib/instructor-admin-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { NATIVE, SYSTEM } from "../../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import { semanticSoft } from "../../../lib/themed-module-theme"
import { FacultyModuleTabBar } from "../faculty-module-shell"
import { FacultyEmptyState, FacultyStatusPill } from "../faculty-shared"
import {
  FacultyAdminCourseGate,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminStatRow,
  useAdminStyles} from "../faculty-admin-ui"

type DaysFilter = "7" | "14" | "30" | "90"

const DAY_TABS: Array<{ id: DaysFilter; label: string }> = [
  { id: "7", label: "7 Days" },
  { id: "14", label: "14 Days" },
  { id: "30", label: "30 Days" },
  { id: "90", label: "90 Days" },
]

function formatWhen(value: string): string {
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
  } catch {
    return value
  }
}

function formatAssessmentType(type: string): string {
  const map: Record<string, string> = {
    quiz: "Quiz",
    homework: "Homework",
    mid_semester: "Midterm",
    final: "Final"}
  return map[type] ?? type.replace(/_/g, " ")
}

export function FacultySubmissionIssuesScreen() {
  const { scope, course, ready } = useFacultyScope()

  const [days, setDays] = useState<DaysFilter>("7")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SubmissionDiagnosticsResponse | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    setError(null)
    const response = await instructorAdminApi.getSubmissionDiagnostics(scope, Number(days))
    setData(response)
  }, [scope, days])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      setData(null)
      return
    }
    setLoading(true)
    load()
      .catch((err) => {
        setData(null)
        setError(err instanceof Error ? err.message : "Could not load diagnostics.")
      })
      .finally(() => setLoading(false))
  }, [ready, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : "Could not load diagnostics.")
    } finally {
      setRefreshing(false)
    }
  }

  const recentItems = (data?.recentItems ?? []).slice(0, 20)
  const totalIssues = data?.summary.totalIssues ?? 0
  const showContent = !loading && !error && data
  const styles = useSubmissionIssuesStyles()

  return (
    <FacultyAdminCourseGate>
      <FacultyAdminScreen
        loading={loading}
        refreshing={refreshing}
        error={showContent ? null : error}
        onRefresh={() => void handleRefresh()}
      >
        {showContent ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  {totalIssues === 0 ? "No open issues" : `${totalIssues} flagged answer${totalIssues === 1 ? "" : "s"}`}
                </Text>
                <Text style={styles.heroSub}>
                  Failed saves and manual-review flags in the last {days} days
                  {course?.course_code ? ` · ${course.course_code}` : ""}
                </Text>
              </View>
              <FacultyStatusPill
                label={totalIssues > 0 ? "Needs review" : "All clear"}
                tone={totalIssues > 0 ? "warning" : "success"}
              />
            </View>

            <FacultyModuleTabBar tabs={DAY_TABS} tab={days} onChange={setDays} scrollable />

            <FacultyAdminStatRow
              stats={[
                {
                  label: "Issues",
                  value: String(totalIssues),
                  icon: "alert-circle-outline",
                  iconColor: totalIssues > 0 ? SYSTEM.orange.color : SYSTEM.green.color,
                  iconBg: totalIssues > 0 ? SYSTEM.orange.soft : SYSTEM.green.soft},
                {
                  label: "Students",
                  value: String(data.byStudent.length),
                  icon: "people-outline",
                  iconColor: SYSTEM.blue.color,
                  iconBg: SYSTEM.blue.soft},
                {
                  label: "Error types",
                  value: String(data.byErrorType.length),
                  icon: "layers-outline",
                  iconColor: SYSTEM.purple.color,
                  iconBg: SYSTEM.purple.soft},
                {
                  label: "Assessments",
                  value: String(data.byAssessment.length),
                  icon: "document-text-outline",
                  iconColor: SYSTEM.blue.color,
                  iconBg: SYSTEM.blue.soft},
              ]}
            />

            <FacultyAdminSection title="By Error Type">
              {data.byErrorType.length === 0 ? (
                <DiagnosticEmptyRow message="No error types in this window." />
              ) : (
                data.byErrorType.map((row, index, arr) => (
                  <DiagnosticCountRow
                    key={row.errorType}
                    label={row.errorType}
                    count={row.count}
                    isLast={index === arr.length - 1}
                  />
                ))
              )}
            </FacultyAdminSection>

            <FacultyAdminSection title="Top Students">
              {data.byStudent.length === 0 ? (
                <DiagnosticEmptyRow message="No students with issues in this window." />
              ) : (
                data.byStudent.slice(0, 10).map((row, index, arr) => (
                  <DiagnosticCountRow
                    key={row.studentId}
                    label={`${row.studentName} · ${row.studentIdDisplay}`}
                    count={row.issueCount}
                    isLast={index === Math.min(arr.length, 10) - 1}
                  />
                ))
              )}
            </FacultyAdminSection>

            <FacultyAdminSection title="Recent Items" footer="Showing up to 20 most recent submission issues.">
              {recentItems.length === 0 ? (
                <DiagnosticEmptyRow message="No recent submission issues." />
              ) : (
                recentItems.map((item, index) => (
                  <View
                    key={`${item.answerId}-${item.attemptId}`}
                    style={[styles.itemRow, index < recentItems.length - 1 && styles.itemBorder]}
                  >
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.quizTitle}
                      </Text>
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        {item.studentName} · {item.errorType}
                      </Text>
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        {formatAssessmentType(item.assessmentType)} · Attempt #{item.attemptId}
                        {item.answeredAt ? ` · ${formatWhen(item.answeredAt)}` : ""}
                      </Text>
                    </View>
                    {item.requiresReview ? (
                      <View style={styles.reviewBadge}>
                        <Ionicons name="eye-outline" size={14} color={SYSTEM.orange.color} />
                        <Text style={styles.reviewText}>Review</Text>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </FacultyAdminSection>
          </>
        ) : !loading && error ? (
          <View style={styles.errorWrap}>
            <FacultyEmptyState
              icon="cloud-offline-outline"
              title="Diagnostics unavailable"
              body={error}
            />
            <Pressable style={styles.retryBtn} onPress={() => void handleRefresh()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
      </FacultyAdminScreen>
    </FacultyAdminCourseGate>
  )
}

function DiagnosticCountRow({
  label,
  count,
  isLast}: {
  label: string
  count: number
  isLast?: boolean
}) {
  const styles = useSubmissionIssuesStyles()
  return (
    <View style={[styles.countRow, !isLast && styles.itemBorder]}>
      <Text style={styles.countLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.countValue}>{count}</Text>
    </View>
  )
}

function DiagnosticEmptyRow({ message }: { message: string }) {
  const styles = useSubmissionIssuesStyles()
  return (
    <View style={styles.emptyRow}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  )
}

function useSubmissionIssuesStyles() {
  const adminStyles = useAdminStyles()
  const { native, tokens, type } = adminStyles
  const sheet = useMemo(
    () =>
      StyleSheet.create({
        hero: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          padding: 16,
          borderRadius: NATIVE.sectionRadius,
          backgroundColor: native.secondaryGrouped,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          ...tokens.cardShadow,
        },
        heroCopy: { flex: 1, gap: 4 },
        heroTitle: { ...type.sheetTitle, fontSize: 18, color: native.label },
        heroSub: { ...type.secondary, lineHeight: 20, color: native.secondaryLabel },
        countRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: native.secondaryGrouped,
        },
        countLabel: { flex: 1, ...type.body, color: native.label },
        countValue: {
          ...type.bodyEmphasis,
          fontVariant: ["tabular-nums"],
          color: native.secondaryLabel,
        },
        itemRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: native.secondaryGrouped,
        },
        itemBorder: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
        },
        itemCopy: { flex: 1, gap: 2 },
        itemTitle: { ...type.bodyEmphasis, fontSize: 15, color: native.label },
        itemMeta: { ...type.caption, color: native.secondaryLabel },
        reviewBadge: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
          backgroundColor: semanticSoft(tokens.warning, tokens.isDark),
        },
        reviewText: { ...type.caption, fontWeight: "600", color: tokens.warning },
        emptyRow: {
          paddingHorizontal: 14,
          paddingVertical: 16,
          backgroundColor: native.secondaryGrouped,
        },
        emptyText: { ...type.secondary, textAlign: "center", color: native.secondaryLabel },
        retryBtn: {
          alignSelf: "center",
          borderRadius: 10,
          paddingHorizontal: 18,
          paddingVertical: 10,
          backgroundColor: FACULTY_ADMIN_COLOR.action,
        },
        errorWrap: { alignItems: "center", gap: 12, paddingVertical: 24 },
        retryText: { ...type.bodyEmphasis, color: "#ffffff" },
      }),
    [native, tokens, type],
  )
  return { ...sheet, tokens }
}
