import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, LayoutAnimation, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, UIManager, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import type { AssessmentAttemptResults, AssessmentResultQuestion } from "../../lib/assessment-results-api"
import { dedupeAssessmentResultQuestions } from "../../lib/assessment-results-api"
import { downloadAssessmentReportPdf } from "../../lib/assessment-report-pdf"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type InstructorAssessmentResult,
  type InstructorAssessmentResultSummary,
} from "../../lib/instructor-api"
import { assessmentTypeLabel } from "../../lib/faculty-results-utils"
import { FACULTY_RESULTS_COLOR } from "../../lib/faculty-results-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { semanticSoft } from "../../lib/themed-module-theme"
import { ASSESSMENT_CONFIG, type AssessmentListKind } from "../assessments/assessment-config"
import { AssessmentQuestionDetail } from "../assessments/AssessmentQuestionDetail"
import {
  extractStudentAnswer,
  formatDisplayAnswer,
} from "../assessments/assessment-question-detail"
import { GradeSummaryCard } from "../assessments/GradeSummaryCard"
import { QuestionContentWebView } from "../rewards/QuestionContent"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  FacultySheetActionRow,
  FacultySheetToggleRow,
} from "./faculty-collab-sheet-ui"
import { SHEET_METRIC, SHEET_SECTION } from "./faculty-sheet-semantics"

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type FacultyScope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: FacultyScope | null
  result: InstructorAssessmentResult | null
  onClose: () => void
}

type QuestionFilter = "all" | "correct" | "incorrect" | "pending"

function resolveKind(type?: string): AssessmentListKind {
  const t = (type ?? "quiz").toLowerCase().replace(/-/g, "_")
  if (t === "homework") return "homework"
  if (t === "mid_semester" || t === "midsem") return "mid_semester"
  if (t === "final") return "final"
  return "quiz"
}

function questionStatus(q: AssessmentResultQuestion): "correct" | "incorrect" | "pending" | "skipped" {
  if (q.requires_review) return "pending"
  if (q.is_correct === true) return "correct"
  const earned = Number(q.points_earned ?? 0)
  const hasAnswer = q.selected_answer != null && String(q.selected_answer).trim() !== ""
  if (!hasAnswer && earned <= 0) return "skipped"
  return "incorrect"
}

function statusMeta(
  status: ReturnType<typeof questionStatus>,
  tokens: ReturnType<typeof useModuleTheme>["tokens"],
) {
  switch (status) {
    case "correct":
      return {
        label: "Correct",
        icon: "checkmark-circle" as const,
        bg: semanticSoft(tokens.success, tokens.isDark),
        text: tokens.success,
      }
    case "pending":
      return {
        label: "Pending",
        icon: "time" as const,
        bg: semanticSoft(tokens.warning, tokens.isDark),
        text: tokens.warning,
      }
    case "skipped":
      return {
        label: "Skipped",
        icon: "remove-circle-outline" as const,
        bg: semanticSoft(tokens.border, tokens.isDark),
        text: tokens.border,
      }
    default:
      return {
        label: "Missed",
        icon: "close-circle" as const,
        bg: semanticSoft(tokens.danger, tokens.isDark),
        text: tokens.danger,
      }
  }
}

function formatQuestionType(type?: string): string {
  if (!type) return "Question"
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function computeShowPnd(data: AssessmentAttemptResults, pendingCount: number, total: number): boolean {
  if (data.should_show_pnd === true) return true
  if (data.should_show_pnd === false) return !!(data.auto_submitted || data.violation_reason)
  if (pendingCount > 0 && pendingCount === total) return true
  return !!(data.auto_submitted && data.violation_reason)
}

function QuestionCard({ q, index }: { q: AssessmentResultQuestion; index: number }) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const [expanded, setExpanded] = useState(true)
  const status = questionStatus(q)
  const meta = statusMeta(status, tokens)
  const maxPts = Number(q.max_points ?? q.points ?? 1)
  const earned = Number(q.points_earned ?? 0)
  const studentAnswer = formatDisplayAnswer(extractStudentAnswer(q), q)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((v) => !v)
  }

  return (
    <Pressable style={[moduleStyles.card, styles.questionCard]} onPress={toggle}>
      <View style={styles.questionTop}>
        <View style={[styles.questionIndex, { backgroundColor: meta.bg }]}>
          <Text style={[styles.questionIndexText, { color: meta.text }]}>{index + 1}</Text>
        </View>
        <View style={styles.questionHead}>
          {expanded || !(q.question_text ?? "").trim() ? (
            <Text
              style={[type.bodyEmphasis, { color: native.label, lineHeight: 20, fontSize: 14 }]}
              numberOfLines={expanded ? undefined : 2}
            >
              {!(q.question_text ?? "").trim() ? `Question ${index + 1}` : null}
            </Text>
          ) : null}
          {!expanded && (q.question_text ?? "").trim() ? (
            <View style={styles.promptPreview}>
              <QuestionContentWebView text={q.question_text ?? ""} embedded compact />
            </View>
          ) : null}
          {expanded && (q.question_text ?? "").trim() ? (
            <QuestionContentWebView text={q.question_text ?? ""} embedded compact />
          ) : null}
          {!expanded && studentAnswer ? (
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", lineHeight: 18 }]} numberOfLines={2}>
              Student: {studentAnswer}
            </Text>
          ) : null}
          <View style={styles.questionMetaRow}>
            <View style={[styles.chip, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={11} color={meta.text} />
              <Text style={[type.caption, { color: meta.text, fontWeight: "600", fontSize: 11 }]}>{meta.label}</Text>
            </View>
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", fontSize: 10 }]}>
              {formatQuestionType(q.question_type)}
            </Text>
            <Text style={[type.caption, { color: FACULTY_RESULTS_COLOR.link, fontWeight: "700", fontSize: 11 }]}>
              {earned}/{maxPts} pts
            </Text>
            {q.override_points != null ? (
              <FacultyStatusPill label={`Override ${q.override_points}`} tone="warning" />
            ) : null}
          </View>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={native.tertiaryLabel} />
      </View>

      {expanded ? (
        <View style={[styles.questionBody, { borderTopColor: native.separator }]}>
          <AssessmentQuestionDetail q={q} />
        </View>
      ) : null}
    </Pressable>
  )
}

export function FacultyAttemptReportModal({ visible, scope, result, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [summary, setSummary] = useState<InstructorAssessmentResultSummary | null>(null)
  const [data, setData] = useState<AssessmentAttemptResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<QuestionFilter>("all")
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [isTogglingFinalized, setIsTogglingFinalized] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [isReevaluating, setIsReevaluating] = useState(false)
  const [isEmailing, setIsEmailing] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const attemptId = result?.attempt_id
  const kind = resolveKind(result?.assessment_type ?? data?.assessment_type)
  const config = ASSESSMENT_CONFIG[kind]

  const load = useCallback(async () => {
    if (!scope || !attemptId) return
    setError("")
    const nextSummary = await instructorApi.getAssessmentResultSummary(scope, attemptId)
    setSummary(nextSummary)
    let report: AssessmentAttemptResults
    try {
      report = await instructorApi.getAssessmentAttemptReportView(scope, attemptId)
    } catch {
      if (!nextSummary.student_id) throw new Error("Could not load attempt report.")
      report = await instructorApi.getAssessmentAttemptReport(scope, attemptId, nextSummary.student_id)
    }
    setData({
      ...report,
      questions: dedupeAssessmentResultQuestions(report.questions ?? []),
    })
  }, [scope, attemptId])

  useEffect(() => {
    if (!visible || !scope || !attemptId) {
      setSummary(null)
      setData(null)
      setError("")
      setFilter("all")
      setSelectedSection(null)
      return
    }
    setLoading(true)
    load()
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load attempt report.")
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [visible, scope, attemptId, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }

  const questions = data?.questions ?? []
  const locked = data?.results_review_locked === true
  const quizId = data?.quiz_id ?? summary?.quiz_id ?? result?.assessment_id
  const isFinalized = Boolean(
    result?.results_finalized ?? data?.results_finalized,
  )

  const counts = useMemo(() => {
    let correct = 0
    let incorrect = 0
    let pending = 0
    for (const q of questions) {
      const s = questionStatus(q)
      if (s === "correct") correct += 1
      else if (s === "pending") pending += 1
      else incorrect += 1
    }
    return { correct, incorrect, pending, total: questions.length }
  }, [questions])

  const showPnd = data ? computeShowPnd(data, counts.pending, counts.total) : false

  const sectionFilteredQuestions = useMemo(() => {
    if (!selectedSection) return questions
    return questions.filter((q) => q.section_title === selectedSection)
  }, [questions, selectedSection])

  const filteredQuestions = useMemo(() => {
    const list = sectionFilteredQuestions
    if (filter === "all") return list
    return list.filter((q) => {
      const s = questionStatus(q)
      if (filter === "correct") return s === "correct"
      if (filter === "pending") return s === "pending"
      return s === "incorrect" || s === "skipped"
    })
  }, [sectionFilteredQuestions, filter])

  async function handleToggleFinalized(finalized: boolean) {
    if (!scope || !attemptId) return
    setIsTogglingFinalized(true)
    try {
      const res = await instructorApi.setAssessmentResultFinalized(scope, attemptId, finalized)
      setData((prev) =>
        prev
          ? {
              ...prev,
              results_finalized: res.results_finalized ?? finalized,
              results_finalized_at: res.results_finalized_at ?? prev.results_finalized_at ?? null,
              results_finalized_by: res.results_finalized_by ?? prev.results_finalized_by ?? null,
            }
          : prev,
      )
      AppAlert.alert(
        finalized ? "Results finalized" : "Finalized cleared",
        res.message ?? (finalized ? "Student can view released results." : "Finalized flag removed."),
      )
    } catch (err) {
      AppAlert.alert("Could not update finalized", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setIsTogglingFinalized(false)
    }
  }

  async function handleRecalculateScore() {
    if (!attemptId || !quizId) {
      AppAlert.alert("Cannot recalculate", "Quiz id is missing for this attempt.")
      return
    }
    setIsRecalculating(true)
    try {
      await instructorApi.recalculateAssessmentScore(attemptId, quizId)
      await load()
      AppAlert.alert("Score recalculated", "Attempt totals were refreshed from saved answers.")
    } catch (err) {
      AppAlert.alert("Recalculate failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setIsRecalculating(false)
    }
  }

  async function runBulkReevaluate(mode: "failed" | "all" | "stuck") {
    if (!scope || !attemptId) return
    setIsReevaluating(true)
    try {
      await instructorApi.bulkReevaluateAssessmentAttempt(scope, attemptId, mode)
      await load()
      AppAlert.alert("Re-evaluation complete", "Answers were re-processed. Review updated scores below.")
    } catch (err) {
      AppAlert.alert("Re-evaluate failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setIsReevaluating(false)
    }
  }

  function promptBulkReevaluate() {
    AppAlert.alert("Bulk re-evaluate", "Choose which answers to re-run through grading.", [
      { text: "Cancel", style: "cancel" },
      { text: "Failed only", onPress: () => void runBulkReevaluate("failed") },
      { text: "Stuck / pending", onPress: () => void runBulkReevaluate("stuck") },
      { text: "All answers", onPress: () => void runBulkReevaluate("all") },
    ])
  }

  async function handleDownloadPdf() {
    if (!data) return
    setIsDownloadingPdf(true)
    try {
      await downloadAssessmentReportPdf(data)
    } catch (err) {
      AppAlert.alert("PDF failed", err instanceof Error ? err.message : "Could not generate PDF.")
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  async function handleEmailStudent() {
    if (!scope || !attemptId) return
    AppAlert.alert(
      "Email student",
      "Send a grades-updated email and mark results as finalized?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send email",
          onPress: () => {
            void (async () => {
              setIsEmailing(true)
              try {
                const res = await instructorApi.emailAssessmentGradesUpdated(scope, attemptId)
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        results_finalized: res.results_finalized ?? true,
                        results_finalized_at: res.results_finalized_at ?? prev.results_finalized_at ?? null,
                        results_finalized_by: res.results_finalized_by ?? prev.results_finalized_by ?? null,
                      }
                    : prev,
                )
                AppAlert.alert("Email sent", res.message ?? "Student was notified about updated grades.")
              } catch (err) {
                AppAlert.alert("Email failed", err instanceof ApiError ? err.message : "Try again.")
              } finally {
                setIsEmailing(false)
              }
            })()
          },
        },
      ],
    )
  }

  if (!result) return null

  const title = result.assessment_title ?? result.quiz_title ?? data?.quiz_title ?? "Assessment"
  const pct = data?.percentage ?? result.percentage ?? 0
  const totalPoints = data?.total_points ?? data?.total_questions ?? counts.total
  const busy = isTogglingFinalized || isRecalculating || isReevaluating || isEmailing || isDownloadingPdf

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Attempt report" onClose={onClose} accentColor={FACULTY_RESULTS_COLOR.link} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_RESULTS_COLOR.link} />
          }
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={title}
            subtitle={`${result.student_name} · ${result.student_id}${result.section ? ` · ${result.section}` : ""}`}
            icon="document-text-outline"
            pills={
              <>
                <FacultyStatusPill label={assessmentTypeLabel(result.assessment_type)} tone="neutral" />
                {result.is_flagged ? <FacultyStatusPill label="Flagged" tone="warning" /> : null}
                {result.is_in_progress ? <FacultyStatusPill label="In progress" tone="live" /> : null}
                {isFinalized ? <FacultyStatusPill label="Finalized" tone="warning" /> : null}
                {result.completed_at ? (
                  <FacultyStatusPill label={formatFacultyRelativeTime(result.completed_at)} tone="neutral" />
                ) : null}
              </>
            }
          />

          {data ? (
            <FacultySheetStatRow>
              <FacultySheetStatChip icon="checkmark-circle-outline" label="Score" value={`${Math.round(pct)}%`} tone={SHEET_METRIC.primary} />
              <FacultySheetStatChip icon="help-circle-outline" label="Correct" value={`${counts.correct}/${counts.total}`} tone={SHEET_METRIC.info} />
              <FacultySheetStatChip
                icon="time-outline"
                label="Pending"
                value={String(counts.pending)}
                tone={counts.pending > 0 ? SHEET_METRIC.pending : SHEET_METRIC.neutral}
              />
            </FacultySheetStatRow>
          ) : null}

          {loading && !data ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={FACULTY_RESULTS_COLOR.link} />
              <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>Loading full report…</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <FacultySheetErrorBanner message={error} />
              <Pressable style={[styles.retryBtn, { backgroundColor: FACULTY_RESULTS_COLOR.action }]} onPress={() => void load()}>
                <Text style={[type.bodyEmphasis, { color: "#ffffff", fontSize: 14 }]}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {data ? (
            <>
              <FacultySheetSection label="Instructor actions" tone={SHEET_SECTION.workflow}>
                <View style={styles.actionsBlock}>
                  <FacultySheetToggleRow
                    icon="checkmark-done-outline"
                    title="Finalized"
                    subtitle={
                      isFinalized
                        ? data.results_finalized_by
                          ? `Reviewed by ${data.results_finalized_by}`
                          : "Marked reviewed for student"
                        : "Release results to student when ready"
                    }
                    value={isFinalized}
                    disabled={busy}
                    onValueChange={(next) => void handleToggleFinalized(next)}
                  />
                  <FacultySheetGroupedList>
                    <FacultySheetActionRow
                      icon="calculator-outline"
                      label={isRecalculating ? "Recalculating…" : "Recalculate score"}
                      subtitle="Refresh totals from saved answers"
                      accent="sky"
                      loading={isRecalculating}
                      disabled={busy || !quizId}
                      onPress={() => void handleRecalculateScore()}
                    />
                    <FacultySheetActionRow
                      icon="refresh-outline"
                      label={isReevaluating ? "Re-evaluating…" : "Bulk re-evaluate"}
                      subtitle="Re-run AI or auto grading on answers"
                      accent="violet"
                      loading={isReevaluating}
                      disabled={busy}
                      onPress={promptBulkReevaluate}
                    />
                    <FacultySheetActionRow
                      icon="document-outline"
                      label={isDownloadingPdf ? "Generating PDF…" : "Download PDF"}
                      subtitle="Share a printable attempt report"
                      accent="amber"
                      loading={isDownloadingPdf}
                      disabled={busy}
                      onPress={() => void handleDownloadPdf()}
                    />
                    <FacultySheetActionRow
                      icon="mail-outline"
                      label={isEmailing ? "Sending…" : "Email student"}
                      subtitle="Notify student and finalize results"
                      accent="teal"
                      loading={isEmailing}
                      disabled={busy}
                      onPress={() => void handleEmailStudent()}
                    />
                  </FacultySheetGroupedList>
                </View>
              </FacultySheetSection>

              <GradeSummaryCard
                title={data.quiz_title ?? title}
                kind={kind}
                percentage={pct}
                score={data.score ?? Number(result.score ?? 0)}
                totalPoints={totalPoints}
                correctAnswers={data.correct_answers}
                totalQuestions={data.total_questions ?? counts.total}
                completedAt={data.completed_at ?? result.completed_at}
                showPnd={showPnd}
                pendingCount={counts.pending}
                autoSubmitted={data.auto_submitted}
                violationReason={data.violation_reason}
                sectionBreakdown={data.section_breakdown}
                locked={locked}
                selectedSection={selectedSection}
                onSectionPress={(section) => {
                  setSelectedSection((prev) => (prev === section ? null : section))
                  setFilter("all")
                }}
              />

              {(data.tab_switch_count != null ||
                data.copy_paste_attempts != null ||
                data.violation_reason ||
                summary?.time_taken_seconds != null) && (
                <FacultySheetSection label="Integrity & session" tone={SHEET_SECTION.workflow}>
                  <FacultySheetGroupedList>
                    {data.tab_switch_count != null ? (
                      <FacultySheetMetricRow icon="swap-horizontal-outline" label="Tab switches" value={String(data.tab_switch_count)} />
                    ) : null}
                    {data.copy_paste_attempts != null ? (
                      <FacultySheetMetricRow
                        icon="clipboard-outline"
                        label="Copy/paste attempts"
                        value={String(data.copy_paste_attempts)}
                      />
                    ) : null}
                    {summary?.time_taken_seconds != null ? (
                      <FacultySheetMetricRow
                        icon="timer-outline"
                        label="Time taken"
                        value={`${Math.max(0, Math.round(summary.time_taken_seconds / 60))} min`}
                        isLast={!data.violation_reason}
                      />
                    ) : null}
                    {data.violation_reason ? (
                      <FacultySheetMetricRow icon="alert-circle-outline" label="Violation" value={data.violation_reason} isLast />
                    ) : null}
                  </FacultySheetGroupedList>
                </FacultySheetSection>
              )}

              {locked ? (
                <View
                  style={[
                    styles.lockedBanner,
                    { backgroundColor: `${tokens.warning}14`, borderColor: `${tokens.warning}33` },
                  ]}
                >
                  <View style={[styles.lockedBannerIcon, { backgroundColor: native.secondaryGrouped }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={tokens.warning} />
                  </View>
                  <View style={styles.lockedBannerCopy}>
                    <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 14 }]}>Student review locked</Text>
                    <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", lineHeight: 19 }]}>
                      The student cannot open full review yet. You still see all answers below as the instructor.
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.questionsSection}>
                <View style={styles.questionsHeader}>
                  <View style={styles.questionsTitleRow}>
                    <View style={[styles.sectionIcon, { backgroundColor: FACULTY_RESULTS_COLOR.tabActive }]}>
                      <Ionicons name={config.icon} size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 15 }]}>Question review</Text>
                  </View>
                  {selectedSection ? (
                    <Pressable
                      style={[styles.clearSection, { backgroundColor: `${FACULTY_RESULTS_COLOR.link}14` }]}
                      onPress={() => setSelectedSection(null)}
                      accessibilityRole="button"
                      accessibilityLabel={`Clear section filter ${selectedSection}`}
                    >
                      <Text
                        style={[type.caption, { color: FACULTY_RESULTS_COLOR.link, fontWeight: "700", fontSize: 11, flexShrink: 1 }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {selectedSection}
                      </Text>
                      <Text style={[type.caption, { color: FACULTY_RESULTS_COLOR.link, fontWeight: "700", fontSize: 13 }]}>
                        ×
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                  {(
                    [
                      { id: "all" as const, label: "All", count: sectionFilteredQuestions.length },
                      { id: "correct" as const, label: "Correct", count: counts.correct },
                      { id: "incorrect" as const, label: "Missed", count: counts.incorrect },
                      { id: "pending" as const, label: "Pending", count: counts.pending },
                    ] as const
                  ).map((item) => {
                    const active = filter === item.id
                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: native.fill,
                            borderColor: native.separator,
                          },
                          active && {
                            backgroundColor: `${FACULTY_RESULTS_COLOR.link}14`,
                            borderColor: FACULTY_RESULTS_COLOR.link,
                          },
                        ]}
                        onPress={() => setFilter(item.id)}
                      >
                        <Text
                          style={[
                            type.caption,
                            { fontWeight: "600", color: native.secondaryLabel, fontSize: 11 },
                            active && { color: FACULTY_RESULTS_COLOR.link },
                          ]}
                        >
                          {item.label} ({item.count})
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>

                {filteredQuestions.length === 0 ? (
                  <FacultyEmptyState icon="help-circle-outline" title="No questions" body="No questions match this filter." />
                ) : (
                  filteredQuestions.map((q) => {
                    const originalIndex = questions.indexOf(q)
                    const displayIndex = q.question_order != null ? Number(q.question_order) - 1 : originalIndex
                    return (
                      <QuestionCard
                        key={String(q.question_id ?? q.id ?? displayIndex)}
                        q={q}
                        index={displayIndex >= 0 ? displayIndex : originalIndex}
                      />
                    )
                  })
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  loadingBox: { alignItems: "center", gap: 10, paddingVertical: 32 },
  errorBox: { gap: 10 },
  retryBtn: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionsBlock: { gap: 10 },
  lockedBanner: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lockedBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBannerCopy: { flex: 1, gap: 4 },
  questionsSection: { gap: 10 },
  questionsHeader: { gap: 8 },
  questionsTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  clearSection: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  filterRow: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  questionCard: { padding: 12 },
  questionTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  questionIndex: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  questionIndexText: { fontSize: 12, fontWeight: "600" },
  questionHead: { flex: 1, gap: 6, minWidth: 0 },
  promptPreview: { maxHeight: 72, overflow: "hidden" },
  questionMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  questionBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
})
