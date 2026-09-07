import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type FacultyCourseEvaluationAnalytics,
  type FacultyCourseEvaluationRow,
} from "../../lib/instructor-api"
import {
  INSTRUCTOR_CLARITY_LIKERT,
  LIKERT_5,
  PLATFORM_HELPFULNESS_LIKERT,
  SURVEY_OTHER_OPTION,
  likertLabel,
} from "../../constants/course-evaluation-survey"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import { evaluationRowBelongsToCourse } from "../../lib/course-sections"
import { computeFacultyCourseEvaluationAnalytics } from "../../lib/faculty-course-evaluations-utils"
import { isEvaluationsEmptySuccess } from "../../lib/faculty-evaluations-load"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { semanticSoft, useNativeType } from "../../lib/themed-module-theme"
import {
  FACULTY_EVALUATIONS_COLOR,
  FACULTY_EVALUATIONS_HUNT,
  FACULTY_EVALUATIONS_KPI_SOLID,
  facultyEvaluationHeroThumb,
  facultyEvaluationStatusColor,
  facultyEvaluationStudentThumb,
  facultyEvaluationSurveySolid,
} from "../../lib/faculty-course-evaluations-theme"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import {
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  FacultySheetTextInput,
  FacultySheetWorkflow,
} from "./faculty-collab-sheet-ui"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import { FacultyEvaluationProofPreview } from "./FacultyEvaluationProofPreview"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import {
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  useFacultyStickyHeaderScrollLayout,
} from "./faculty-module-shell"

type Tab = "overview" | "pending" | "evaluations"
type StatusFilter = "all" | "pending" | "approved" | "rejected"

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  const s = status.toLowerCase()
  if (s === "approved") return "success"
  if (s === "pending") return "warning"
  if (s === "rejected") return "danger"
  return "neutral"
}

function statusLabel(status: string): string {
  const s = status.toLowerCase()
  if (s === "rejected") return "Returned"
  if (s === "pending") return "Pending"
  if (s === "approved") return "Approved"
  if (s === "draft") return "Draft"
  return status
}

function gradeMismatch(selfGrade?: string | null, actualGrade?: string | null): boolean {
  if (!selfGrade || !actualGrade) return false
  return selfGrade.trim().toUpperCase() !== actualGrade.trim().toUpperCase()
}

function KpiTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent: string
}) {
  const { native, type, tokens } = useModuleTheme()
  return (
    <View
      style={[
        styles.kpiTile,
        { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
      ]}
    >
      <View style={[styles.kpiDot, { backgroundColor: semanticSoft(accent, tokens.isDark) }]}>
        <View style={[styles.kpiDotInner, { backgroundColor: accent }]} />
      </View>
      <Text style={[type.footnote, { color: native.secondaryLabel, fontWeight: "700" }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: native.label }]}>{value}</Text>
      {hint ? (
        <Text style={[type.footnote, { color: native.tertiaryLabel }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

function EvaluationRowCard({
  row,
  onPress,
  onQuickApprove,
  busy,
}: {
  row: FacultyCourseEvaluationRow
  onPress: () => void
  onQuickApprove?: () => void
  busy?: boolean
}) {
  const { native, tokens, type } = useModuleTheme()
  const mismatch = gradeMismatch(row.self_assessed_letter_grade, row.actual_letter_grade)
  const pending = row.status?.toLowerCase() === "pending"
  const statusColor = facultyEvaluationStatusColor(row.status ?? "")
  const metaParts = [
    likertLabel(LIKERT_5, row.course_rating),
    row.nps_score != null ? `NPS ${row.nps_score}/10` : null,
    (row.proof_count ?? 0) > 0 ? `${row.proof_count} proof${(row.proof_count ?? 0) === 1 ? "" : "s"}` : null,
    mismatch ? "Grade mismatch" : null,
  ].filter(Boolean)

  return (
    <FacultySignatureListCard
      thumb={facultyEvaluationStudentThumb(row.student_id ?? row.id)}
      icon="person-outline"
      title={row.full_name}
      eyebrow={[row.student_code, row.section].filter(Boolean).join(" · ")}
      metaLine={
        row.submitted_at
          ? `${formatFacultyRelativeTime(row.submitted_at)}${metaParts.length ? ` · ${metaParts.join(" · ")}` : ""}`
          : metaParts.join(" · ")
      }
      description={row.improvement_suggestions?.trim() || undefined}
      status={{
        label: statusLabel(row.status),
        color: statusColor,
        icon:
          row.status?.toLowerCase() === "approved"
            ? "checkmark-circle-outline"
            : row.status?.toLowerCase() === "rejected"
              ? "close-circle-outline"
              : "time-outline",
      }}
      onPress={onPress}
      footer={
        pending && onQuickApprove ? (
          <Pressable
            onPress={onQuickApprove}
            disabled={busy}
            style={[styles.quickApprove, { backgroundColor: FACULTY_EVALUATIONS_COLOR.action }]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.quickApproveText}>Quick approve · 50 EC</Text>
              </>
            )}
          </Pressable>
        ) : undefined
      }
    />
  )
}

function DetailSheet({
  open,
  evaluation,
  loading,
  note,
  onChangeNote,
  onClose,
  onApprove,
  onReject,
  acting,
}: {
  open: boolean
  evaluation: FacultyCourseEvaluationRow | null
  loading: boolean
  note: string
  onChangeNote: (v: string) => void
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  acting: boolean
}) {
  useSuppressModuleSearchDock(open)
  const insets = useSafeAreaInsets()
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const pending = evaluation?.status?.toLowerCase() === "pending"
  const mismatch = gradeMismatch(
    evaluation?.self_assessed_letter_grade,
    evaluation?.actual_letter_grade,
  )

  const favoriteFeatures =
    (evaluation?.favorite_features ?? []).length > 0
      ? (evaluation?.favorite_features ?? [])
          .map((f) =>
            f === SURVEY_OTHER_OPTION && evaluation?.favorite_features_other?.trim()
              ? `Other — ${evaluation.favorite_features_other.trim()}`
              : f,
          )
          .join(", ")
      : "—"

  const improveFirst =
    evaluation?.feature_to_improve === SURVEY_OTHER_OPTION &&
    evaluation?.feature_to_improve_other?.trim()
      ? `Other — ${evaluation.feature_to_improve_other.trim()}`
      : evaluation?.feature_to_improve || "—"

  return (
    <GlassBottomSheetModal
      visible={open}
      onClose={onClose}
      maxHeight="88%"
      keyboardAvoiding
    >
      <GlassSheetBackground
        style={[styles.sheetSurface, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <FacultySheetChrome
          topInset={0}
          title="Course evaluation"
          subtitle={evaluation?.full_name}
          onClose={onClose}
          accentColor={FACULTY_EVALUATIONS_COLOR.link}
        />

        {loading || !evaluation ? (
          <View style={styles.sheetLoading}>
            <ActivityIndicator color={FACULTY_EVALUATIONS_COLOR.link} />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading evaluation…</Text>
          </View>
        ) : (
          <View style={[collabSheetStyles.scroll, { paddingBottom: 16 }]}>
            <FacultySheetHero
              title={evaluation.full_name}
              subtitle={[evaluation.student_code, evaluation.section ? `Section ${evaluation.section}` : null]
                .filter(Boolean)
                .join(" · ")}
              icon="person-outline"
              thumbColor={facultyEvaluationHeroThumb().fill}
              pills={<FacultyStatusPill label={statusLabel(evaluation.status)} tone={statusTone(evaluation.status)} />}
            />

            <FacultySheetStatRow>
              <FacultySheetStatChip
                icon="star-outline"
                label="Overall"
                value={likertLabel(LIKERT_5, evaluation.course_rating)}
                solidAccent={FACULTY_EVALUATIONS_KPI_SOLID.overall}
              />
              <FacultySheetStatChip
                icon="flag-outline"
                label="Pass goal"
                value={evaluation.self_assessed_letter_grade || "—"}
                solidAccent={FACULTY_EVALUATIONS_KPI_SOLID.passGoal}
              />
              <FacultySheetStatChip
                icon="school-outline"
                label="Current"
                value={evaluation.actual_letter_grade || "—"}
                solidAccent={
                  mismatch ? FACULTY_EVALUATIONS_KPI_SOLID.currentMismatch : FACULTY_EVALUATIONS_KPI_SOLID.current
                }
              />
            </FacultySheetStatRow>

            <FacultySheetSection label="Survey" tone="blue">
              <FacultySheetGroupedList>
                <FacultySheetMetricRow
                  icon="sparkles-outline"
                  label="CourseCollab improved learning"
                  value={likertLabel(PLATFORM_HELPFULNESS_LIKERT, evaluation.platform_helpfulness)}
                  solidAccent={facultyEvaluationSurveySolid(0)}
                />
                <FacultySheetMetricRow
                  icon="heart-outline"
                  label="Favorites"
                  value={favoriteFeatures}
                  solidAccent={facultyEvaluationSurveySolid(1)}
                  numberOfLines={3}
                />
                <FacultySheetMetricRow
                  icon="construct-outline"
                  label="Improve first"
                  value={improveFirst}
                  solidAccent={facultyEvaluationSurveySolid(2)}
                  numberOfLines={2}
                />
                {evaluation.instructor_clarity != null && evaluation.instructor_clarity > 0 ? (
                  <FacultySheetMetricRow
                    icon="mic-outline"
                    label="Instructor clarity"
                    value={likertLabel(INSTRUCTOR_CLARITY_LIKERT, evaluation.instructor_clarity)}
                    solidAccent={facultyEvaluationSurveySolid(3)}
                  />
                ) : null}
                {evaluation.workload ? (
                  <FacultySheetMetricRow
                    icon="barbell-outline"
                    label="Workload"
                    value={evaluation.workload}
                    solidAccent={facultyEvaluationSurveySolid(4)}
                  />
                ) : null}
                {evaluation.ai_tutor_usage ? (
                  <FacultySheetMetricRow
                    icon="chatbubbles-outline"
                    label="AI Tutor usage"
                    value={evaluation.ai_tutor_usage}
                    solidAccent={facultyEvaluationSurveySolid(5)}
                  />
                ) : null}
                {evaluation.nps_score != null ? (
                  <FacultySheetMetricRow
                    icon="trending-up-outline"
                    label="NPS"
                    value={`${evaluation.nps_score} / 10`}
                    solidAccent={facultyEvaluationSurveySolid(6)}
                    isLast
                  />
                ) : (
                  <FacultySheetMetricRow
                    icon="chatbox-ellipses-outline"
                    label="Open feedback"
                    value={evaluation.improvement_suggestions?.trim() || "—"}
                    solidAccent={facultyEvaluationSurveySolid(7)}
                    numberOfLines={4}
                    isLast={!(evaluation.proofs ?? []).length}
                  />
                )}
              </FacultySheetGroupedList>
            </FacultySheetSection>

            {evaluation.improvement_suggestions?.trim() && evaluation.nps_score != null ? (
              <FacultySheetSection label="Open feedback" tone="amber">
                <View
                  style={[
                    styles.quote,
                    { backgroundColor: semanticSoft(FACULTY_EVALUATIONS_HUNT.cream, tokens.isDark) },
                  ]}
                >
                  <Text style={[type.body, { color: native.label, lineHeight: 21 }]}>
                    {evaluation.improvement_suggestions}
                  </Text>
                </View>
              </FacultySheetSection>
            ) : null}

            <FacultySheetSection label="Canvas Proof" tone="teal">
              {(evaluation.proofs ?? []).length === 0 ? (
                <Text style={[type.secondary, { color: native.secondaryLabel }]}>No proof files attached.</Text>
              ) : (
                <View style={styles.proofList}>
                  {(evaluation.proofs ?? []).map((proof) => (
                    <FacultyEvaluationProofPreview
                      key={proof.id}
                      url={proof.url}
                      fileName={proof.file_name}
                      mime={proof.mime}
                    />
                  ))}
                </View>
              )}
            </FacultySheetSection>

            {pending ? (
              <>
                <FacultySheetField label="Instructor note (optional)">
                  <FacultySheetTextInput
                    value={note}
                    onChangeText={onChangeNote}
                    placeholder="Add a note for the student…"
                    multiline
                  />
                </FacultySheetField>
                <FacultySheetWorkflow
                  title="Review"
                  body="Approve to award 50 engagement credits, or return so the student can update proof or responses."
                  acting={acting}
                  onApprove={onApprove}
                  onReject={onReject}
                  approveLabel="Approve · 50 EC"
                  rejectLabel="Return"
                />
              </>
            ) : evaluation.instructor_note?.trim() ? (
              <FacultySheetSection label="Instructor note" tone="teal">
                <View style={[styles.quote, { backgroundColor: native.fill }]}>
                  <Text style={[type.body, { color: native.label, lineHeight: 21 }]}>
                    {evaluation.instructor_note}
                  </Text>
                </View>
              </FacultySheetSection>
            ) : null}
          </View>
        )}
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

export function FacultyCourseEvaluationsScreen() {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready, course } = useFacultyScope()

  const [tab, setTab] = useState<Tab>("pending")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [pending, setPending] = useState<FacultyCourseEvaluationRow[]>([])
  const [evaluations, setEvaluations] = useState<FacultyCourseEvaluationRow[]>([])
  const [analytics, setAnalytics] = useState<FacultyCourseEvaluationAnalytics | null>(null)
  const [actingId, setActingId] = useState<number | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<FacultyCourseEvaluationRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [note, setNote] = useState("")
  const [reviewing, setReviewing] = useState(false)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const [allRows, sessionRes] = await Promise.all([
      instructorApi.getCourseEvaluations(scope, { status: "all", session: "all" }),
      instructorApi.getSessions(scope, scope.academicTermId ?? undefined).catch(() => ({ sessions: [] as { code: string }[] })),
    ])
    const sessionCodes = (sessionRes.sessions ?? []).map((row) => row.code).filter(Boolean)
    const scoped = allRows.filter((row) =>
      evaluationRowBelongsToCourse(row, course?.course_code, sessionCodes),
    )
    setPending(scoped.filter((row) => String(row.status ?? "").toLowerCase() === "pending"))
    setEvaluations(
      statusFilter === "all"
        ? scoped
        : scoped.filter((row) => String(row.status ?? "").toLowerCase() === statusFilter),
    )
    setAnalytics(computeFacultyCourseEvaluationAnalytics(scoped))
  }, [scope, statusFilter, course?.course_code])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => {
        if (isEvaluationsEmptySuccess(err)) {
          setPending([])
          setEvaluations([])
          setAnalytics(computeFacultyCourseEvaluationAnalytics([]))
          setError("")
          return
        }
        setError(err instanceof ApiError ? err.message : "Unable to load evaluations.")
      })
      .finally(() => setLoading(false))
  }, [ready, load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      if (isEvaluationsEmptySuccess(err)) {
        setPending([])
        setEvaluations([])
        setAnalytics(computeFacultyCourseEvaluationAnalytics([]))
        setError("")
        return
      }
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }, [load])

  useNotificationModuleRefresh("course-evaluation", handleRefresh)

  const openDetail = useCallback(
    async (id: number) => {
      if (!scope) return
      setDetailId(id)
      setNote("")
      setDetailLoading(true)
      try {
        const row = await instructorApi.getCourseEvaluation(scope, id)
        if (!evaluationRowBelongsToCourse(row, course?.course_code)) {
          AppAlert.alert("Could not open", "This evaluation belongs to another course.")
          setDetailId(null)
          return
        }
        setDetail(row)
      } catch (err) {
        AppAlert.alert(
          "Could not open",
          err instanceof ApiError ? err.message : "Failed to load evaluation.",
        )
        setDetailId(null)
      } finally {
        setDetailLoading(false)
      }
    },
    [scope, course?.course_code],
  )

  const closeDetail = () => {
    setDetailId(null)
    setDetail(null)
    setNote("")
  }

  async function approveOne(id: number, instructorNote?: string) {
    if (!scope) return
    setActingId(id)
    try {
      const res = await instructorApi.reviewCourseEvaluation(scope, {
        id,
        action: "approve",
        note: instructorNote,
      })
      AppAlert.alert("Approved", res.message ?? "50 engagement credits applied.")
      await load()
      if (detailId === id) closeDetail()
    } catch (err) {
      AppAlert.alert("Approve failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActingId(null)
    }
  }

  async function rejectOne(id: number, instructorNote?: string) {
    if (!scope) return
    setReviewing(true)
    try {
      const res = await instructorApi.reviewCourseEvaluation(scope, {
        id,
        action: "reject",
        note: instructorNote,
      })
      AppAlert.alert("Returned", res.message ?? "Evaluation returned to the student.")
      await load()
      closeDetail()
    } catch (err) {
      AppAlert.alert("Return failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setReviewing(false)
    }
  }

  function confirmApproveAll() {
    if (!scope || pending.length === 0) return
    AppAlert.alert(
      "Approve all pending?",
      `${pending.length} evaluation(s) will be approved and each student receives 50 engagement credits.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve all",
          style: "default",
          onPress: () => {
            void (async () => {
              setActingId(-1)
              try {
                for (const row of pending) {
                  await instructorApi.reviewCourseEvaluation(scope, {
                    id: row.id,
                    action: "approve",
                  })
                }
                AppAlert.alert("Done", `Approved ${pending.length} evaluation(s).`)
                await load()
              } catch (err) {
                AppAlert.alert(
                  "Approve all stopped",
                  err instanceof ApiError ? err.message : "Some approvals may have completed.",
                )
                await load()
              } finally {
                setActingId(null)
              }
            })()
          },
        },
      ],
    )
  }

  const filterRows = useCallback(
    (rows: FacultyCourseEvaluationRow[]) => {
      const q = search.trim().toLowerCase()
      if (!q) return rows
      return rows.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.student_code.toLowerCase().includes(q) ||
          (r.section ?? "").toLowerCase().includes(q) ||
          (r.improvement_suggestions ?? "").toLowerCase().includes(q),
      )
    },
    [search],
  )

  const pendingFiltered = useMemo(() => filterRows(pending), [filterRows, pending])
  const evaluationsFiltered = useMemo(() => filterRows(evaluations), [filterRows, evaluations])
  const pendingPager = useFacultyListPager(pendingFiltered, `${search}:pending`, "evaluations")
  const evaluationsPager = useFacultyListPager(evaluationsFiltered, `${search}:${statusFilter}`, "evaluations")

  if (!ready) {
    return (
      <View style={[moduleStyles.center, styles.center]}>
        <FacultyEmptyState
          icon="clipboard-outline"
          title="Select a course"
          body="Course evaluations require an active course."
        />
      </View>
    )
  }

  return (
    <View style={[moduleStyles.root, styles.root]}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar
          tabs={[
            {
              id: "overview",
              label: "Overview",
              icon: "grid-outline",
            },
            {
              id: "pending",
              label: "Pending",
              icon: "time-outline",
              count: pending.length,
            },
            {
              id: "evaluations",
              label: "All",
              icon: "list-outline",
            },
          ]}
          tab={tab}
          onChange={(id) => setTab(id as Tab)}
          scrollable
        />

        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search students…"
          showFilter={false}
        />
      </FacultyModuleStickyHeader>

      <ScrollView
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_EVALUATIONS_COLOR.link}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {error ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: semanticSoft(tokens.danger, tokens.isDark) },
            ]}
          >
            <Text style={[type.caption, { color: tokens.danger }]}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={FACULTY_EVALUATIONS_COLOR.link} />
          </View>
        ) : null}

        {!loading && tab === "overview" ? (
          <View style={styles.section}>
            <View style={styles.kpiRow}>
              <KpiTile
                label="Pending"
                value={String(analytics?.totals.pending ?? pending.length)}
                hint="Awaiting review"
                accent={SYSTEM.orange.color}
              />
              <KpiTile
                label="Approved"
                value={String(analytics?.totals.approved ?? 0)}
                hint="50 EC each"
                accent={FACULTY_EVALUATIONS_COLOR.proof}
              />
              <KpiTile
                label="Returned"
                value={String(analytics?.totals.rejected ?? 0)}
                hint="To student"
                accent={tokens.danger}
              />
            </View>
            <View style={styles.kpiRow}>
              <KpiTile
                label="Avg experience"
                value={
                  analytics?.averages.overallExperience != null
                    ? analytics.averages.overallExperience.toFixed(1)
                    : "—"
                }
                hint="/ 5"
                accent={SYSTEM.yellow.color}
              />
              <KpiTile
                label="NPS"
                value={analytics?.nps.score != null ? String(analytics.nps.score) : "—"}
                hint={`${analytics?.nps.responses ?? 0} responses`}
                accent={FACULTY_EVALUATIONS_COLOR.proof}
              />
              <KpiTile
                label="Approval rate"
                value={
                  analytics?.approvalRate != null ? `${Math.round(analytics.approvalRate)}%` : "—"
                }
                hint={
                  analytics?.passGoalMismatchCount
                    ? `${analytics.passGoalMismatchCount} grade mismatches`
                    : "Reviewed"
                }
                accent={SYSTEM.teal.color}
              />
            </View>

            {(analytics?.favoriteFeatureCounts?.length ?? 0) > 0 ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
                ]}
              >
                <Text style={[type.bodyEmphasis, { color: native.label, marginBottom: 8 }]}>
                  Top favorite features
                </Text>
                {analytics!.favoriteFeatureCounts.slice(0, 5).map((item) => (
                  <View key={item.feature} style={styles.countRow}>
                    <Text style={[type.body, { color: native.label, flex: 1 }]}>{item.feature}</Text>
                    <Text style={[type.caption, { color: FACULTY_EVALUATIONS_COLOR.link, fontWeight: "700" }]}>
                      {item.count}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {(analytics?.improveFeatureCounts?.length ?? 0) > 0 ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
                ]}
              >
                <Text style={[type.bodyEmphasis, { color: native.label, marginBottom: 8 }]}>
                  Asked to improve first
                </Text>
                {analytics!.improveFeatureCounts.slice(0, 5).map((item) => (
                  <View key={item.feature} style={styles.countRow}>
                    <Text style={[type.body, { color: native.label, flex: 1 }]}>{item.feature}</Text>
                    <Text style={[type.caption, { color: FACULTY_EVALUATIONS_COLOR.link, fontWeight: "700" }]}>
                      {item.count}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {!loading && tab === "pending" ? (
          <View style={styles.section}>
            {pending.length > 0 ? (
              <Pressable
                onPress={confirmApproveAll}
                disabled={actingId != null}
                style={[styles.approveAll, { backgroundColor: FACULTY_EVALUATIONS_COLOR.action }]}
              >
                {actingId === -1 ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                    <Text style={styles.approveAllText}>Approve all ({pending.length})</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {error ? (
              <FacultyEmptyState
                icon="alert-circle-outline"
                title="Unable to load evaluations."
                body="Check your connection and try again."
                action={
                  <Pressable onPress={() => void handleRefresh()} accessibilityRole="button">
                    <Text style={[type.bodyEmphasis, { color: FACULTY_EVALUATIONS_COLOR.link }]}>Retry</Text>
                  </Pressable>
                }
              />
            ) : pendingFiltered.length === 0 ? (
              <FacultyEmptyState
                icon="checkmark-circle-outline"
                title="No evaluations yet"
                body="Course evaluations will appear here when students submit them."
              />
            ) : (
              <>
                {pendingPager.items.map((row) => (
                  <EvaluationRowCard
                    key={row.id}
                    row={row}
                    busy={actingId === row.id}
                    onPress={() => void openDetail(row.id)}
                    onQuickApprove={() => void approveOne(row.id)}
                  />
                ))}
                <FacultyListPagerFooter pager={pendingPager} />
              </>
            )}
          </View>
        ) : null}

        {!loading && tab === "evaluations" ? (
          <View style={styles.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((filter) => {
                const active = statusFilter === filter
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setStatusFilter(filter)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? semanticSoft(FACULTY_EVALUATIONS_COLOR.link, tokens.isDark) : native.fill,
                        borderColor: active ? `${FACULTY_EVALUATIONS_COLOR.link}33` : native.separator,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        type.caption,
                        { fontWeight: "700", color: active ? FACULTY_EVALUATIONS_COLOR.link : native.label },
                      ]}
                    >
                      {filter === "rejected" ? "Returned" : filter[0]!.toUpperCase() + filter.slice(1)}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {error ? (
              <FacultyEmptyState
                icon="alert-circle-outline"
                title="Unable to load evaluations."
                body="Check your connection and try again."
                action={
                  <Pressable onPress={() => void handleRefresh()} accessibilityRole="button">
                    <Text style={[type.bodyEmphasis, { color: FACULTY_EVALUATIONS_COLOR.link }]}>Retry</Text>
                  </Pressable>
                }
              />
            ) : evaluationsFiltered.length === 0 ? (
              <FacultyEmptyState
                icon="clipboard-outline"
                title="No evaluations yet"
                body="Course evaluations will appear here when students submit them."
              />
            ) : (
              <>
                {evaluationsPager.items.map((row) => (
                  <EvaluationRowCard
                    key={row.id}
                    row={row}
                    busy={actingId === row.id}
                    onPress={() => void openDetail(row.id)}
                    onQuickApprove={
                      row.status?.toLowerCase() === "pending"
                        ? () => void approveOne(row.id)
                        : undefined
                    }
                  />
                ))}
                <FacultyListPagerFooter pager={evaluationsPager} />
              </>
            )}
          </View>
        ) : null}
      </ScrollView>

      <DetailSheet
        open={detailId != null}
        evaluation={detailId != null ? detail : null}
        loading={detailLoading}
        note={note}
        onChangeNote={setNote}
        onClose={closeDetail}
        acting={reviewing || actingId === detailId}
        onApprove={() => {
          if (detailId == null) return
          void approveOne(detailId, note.trim() || undefined)
        }}
        onReject={() => {
          if (detailId == null) return
          AppAlert.alert("Return to student?", "They can update proof or responses and resubmit.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Return",
              style: "destructive",
              onPress: () => void rejectOne(detailId, note.trim() || undefined),
            },
          ])
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, padding: 24 },
  content: { gap: 12, paddingHorizontal: 16, paddingBottom: 28 },
  errorBox: { borderRadius: 12, padding: 12 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  section: { gap: 10 },
  kpiRow: { flexDirection: "row", gap: 8 },
  kpiTile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 3,
    minHeight: 96,
  },
  kpiDot: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  kpiDotInner: { width: 8, height: 8, borderRadius: 4 },
  kpiValue: { fontSize: 18, lineHeight: 24, fontWeight: "800", letterSpacing: -0.3 },
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  rowCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rowMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickApprove: {
    marginTop: 4,
    borderRadius: 12,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickApproveText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  approveAll: {
    borderRadius: 14,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  approveAllText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  filters: { gap: 8, paddingBottom: 4 },
  filterChip: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sheetSurface: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  sheetLoading: { paddingVertical: 40, alignItems: "center", gap: 10 },
  quote: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  proofList: { gap: 12 },
})
