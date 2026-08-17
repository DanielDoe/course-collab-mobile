import { useCallback, useEffect, useMemo, useState, memo, type ReactNode } from "react"
import { ActivityIndicator, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import {
  assessmentResultsApi,
  dedupeAssessmentResultQuestions,
  type AssessmentAttemptResults,
  type AssessmentResultQuestion,
} from "../../lib/assessment-results-api"
import { downloadAssessmentReportPdf } from "../../lib/assessment-report-pdf"
import { reportStatusMeta, type ReportQuestionStatus } from "../../lib/assessment-report-theme"
import { stripHtml } from "../../lib/practice-session"
import { needsQuestionRichRender, questionCardPreviewText } from "../../lib/classroom-submission"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { hexToRgba } from "../../constants/app-themes"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useAssessmentTheme, useThemedStudentNative } from "../../lib/themed-module-theme"
import { safeRouterBack } from "../../lib/safe-router-back"
import type { AssessmentListKind } from "./assessment-config"
import { assessmentModuleHrefForKind } from "./assessment-navigation"
import { GradeSummaryCard } from "./GradeSummaryCard"
import { AssessmentQuestionDetail } from "./AssessmentQuestionDetail"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { CommEmptyState } from "../faculty/faculty-communication-ui"
import { QuestionPrepareGate } from "../questions/QuestionPrepareGate"
import { extractAssessmentResultQuestionTexts } from "../../lib/question-prepare"

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type QuestionFilter = "all" | "correct" | "incorrect" | "pending"

function resolveKind(type?: string): AssessmentListKind {
  const t = (type ?? "quiz").toLowerCase().replace(/-/g, "_")
  if (t === "homework") return "homework"
  if (t === "mid_semester" || t === "midsem") return "mid_semester"
  if (t === "final") return "final"
  return "quiz"
}

function questionStatus(q: AssessmentResultQuestion): ReportQuestionStatus {
  if (q.requires_review) return "pending"
  if (q.is_correct === true) return "correct"
  const earned = Number(q.points_earned ?? 0)
  const hasAnswer = q.selected_answer != null && String(q.selected_answer).trim() !== ""
  if (!hasAnswer && earned <= 0) return "skipped"
  return "incorrect"
}

const QuestionCard = memo(function QuestionCard({ q, index }: { q: AssessmentResultQuestion; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const SN = useThemedStudentNative()
  const { tokens } = useAssessmentTheme()
  const status = questionStatus(q)
  const meta = reportStatusMeta(status, tokens)
  const maxPts = Number(q.max_points ?? q.points ?? 1)
  const earned = Number(q.points_earned ?? 0)
  const richPrompt = needsQuestionRichRender(q.question_text ?? "")
  const promptPreview = useMemo(
    () =>
      richPrompt
        ? questionCardPreviewText(q.question_text ?? "")
        : stripHtml(q.question_text ?? "Question"),
    [q.question_text, richPrompt],
  )

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((v) => !v)
  }

  return (
    <Pressable
      style={[styles.questionCard, { backgroundColor: SN.secondaryGrouped, borderColor: tokens.border }]}
      onPress={toggle}
    >
      <View style={styles.questionTop}>
        <View style={[styles.questionIndex, { backgroundColor: hexToRgba(tokens.accent, 0.1) }]}>
          <Text style={[styles.questionIndexText, { color: tokens.accent }]}>{index + 1}</Text>
        </View>
        <View style={styles.questionHead}>
          {!expanded ? (
            <Text style={[styles.questionPrompt, { color: tokens.text }]} numberOfLines={2}>
              {promptPreview || `Question ${index + 1}`}
            </Text>
          ) : null}
          <View style={styles.questionMetaRow}>
            <View style={[styles.chip, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={11} color={meta.text} />
              <Text style={[styles.chipText, { color: meta.text }]}>{meta.label}</Text>
            </View>
            <Text style={[styles.typeMini, { color: SN.secondaryLabel }]}>{formatQuestionType(q.question_type)}</Text>
            <Text style={[styles.pointsText, { color: tokens.accent }]}>{earned}/{maxPts} pts</Text>
          </View>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={SN.secondaryLabel} />
      </View>

      {expanded ? (
        <View style={[styles.questionBody, { borderTopColor: tokens.border }]}>
          <AssessmentQuestionDetail q={q} />
        </View>
      ) : null}
    </Pressable>
  )
})

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

type ReportShellProps = {
  native: ReturnType<typeof useThemedNative>
  title: string
  onBack: () => void
  onSave?: () => void
  saving?: boolean
  saveDisabled?: boolean
  children: ReactNode
}

function ReportSaveButton({
  onSave,
  saving,
  saveDisabled,
}: {
  onSave: () => void
  saving: boolean
  saveDisabled: boolean
}) {
  const tokens = useAssessmentTheme().tokens
  const native = useThemedNative()

  return (
    <Pressable
      style={[
        styles.saveBtn,
        {
          backgroundColor: saveDisabled ? native.fill : tokens.accentSoftStrong,
          borderColor: saveDisabled ? native.separator : tokens.accentBorder,
          opacity: saveDisabled ? 0.55 : 1,
        },
      ]}
      onPress={onSave}
      disabled={saveDisabled || saving}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Save PDF report"
    >
      {saving ? (
        <ActivityIndicator size="small" color={tokens.accent} />
      ) : (
        <>
          <Ionicons name="download-outline" size={18} color={tokens.accent} />
          <Text style={[styles.saveText, { color: tokens.accent }]}>Save</Text>
        </>
      )}
    </Pressable>
  )
}

/** Fixed immersive header below the Dynamic Island; scroll content stays underneath. */
function AssessmentReportShell({
  native,
  title,
  onBack,
  onSave,
  saving,
  saveDisabled,
  children,
}: ReportShellProps) {
  return (
    <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader
        title={title}
        onBackPress={onBack}
        rightSlot={
          onSave ? (
            <ReportSaveButton
              onSave={onSave}
              saving={saving ?? false}
              saveDisabled={saveDisabled ?? false}
            />
          ) : undefined
        }
      />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

export function AssessmentReportScreen() {
  const { attemptId: attemptIdParam, type: typeParam } = useLocalSearchParams<{
    attemptId: string
    type?: string
  }>()
  const attemptId = Number(attemptIdParam)
  const router = useRouter()
  const session = useStudentSession()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const { configFor, tokens } = useAssessmentTheme()

  const [data, setData] = useState<AssessmentAttemptResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<QuestionFilter>("all")
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [savingPdf, setSavingPdf] = useState(false)

  const kind = resolveKind(typeParam ?? data?.assessment_type)
  const config = configFor(kind)
  /** Reports open via router.replace from web deep links — back must not dead-end. */
  const handleBack = useCallback(
    () => safeRouterBack(router, assessmentModuleHrefForKind(kind)),
    [router, kind],
  )

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(attemptId)) return
    setError("")
    try {
      const res = await assessmentResultsApi.getAttemptResults(session, attemptId)
      setData(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load report.")
      setData(null)
    }
  }, [session, attemptId])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh(["grades", "assessments"], onRefresh)

  const questions = useMemo(
    () => dedupeAssessmentResultQuestions(data?.questions ?? []),
    [data?.questions],
  )
  const locked = data?.results_review_locked === true

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

  const sectionFilteredQuestions = useMemo(() => {
    if (!selectedSection) return questions
    return questions.filter((q) => (q as AssessmentResultQuestion & { section_title?: string }).section_title === selectedSection)
  }, [questions, selectedSection])

  const sectionCounts = useMemo(() => {
    let correct = 0
    let incorrect = 0
    let pending = 0
    for (const q of sectionFilteredQuestions) {
      const s = questionStatus(q)
      if (s === "correct") correct += 1
      else if (s === "pending") pending += 1
      else incorrect += 1
    }
    return { correct, incorrect, pending, total: sectionFilteredQuestions.length }
  }, [sectionFilteredQuestions])

  const showPnd = data ? computeShowPnd(data, counts.pending, counts.total) : false

  const filteredQuestions = useMemo(() => {
    const list = sectionFilteredQuestions
    const filtered =
      filter === "all"
        ? list
        : list.filter((q) => {
            const s = questionStatus(q)
            if (filter === "correct") return s === "correct"
            if (filter === "pending") return s === "pending"
            return s === "incorrect" || s === "skipped"
          })

    const indexByQuestion = new Map<AssessmentResultQuestion, number>()
    questions.forEach((q, i) => indexByQuestion.set(q, i))

    return filtered.map((q) => {
      const originalIndex = indexByQuestion.get(q) ?? 0
      const displayIndex = q.question_order != null ? Number(q.question_order) - 1 : originalIndex
      return {
        q,
        displayIndex: displayIndex >= 0 ? displayIndex : originalIndex,
      }
    })
  }, [sectionFilteredQuestions, filter, questions])

  const handleSectionPress = (title: string) => {
    setSelectedSection((prev) => (prev === title ? null : title))
    setFilter("all")
  }

  const handleSavePdf = useCallback(async () => {
    if (!session || !data || locked) return
    setSavingPdf(true)
    try {
      await downloadAssessmentReportPdf(data)
      try {
        await assessmentResultsApi.markPdfDownloaded(session, attemptId)
        setData((prev) =>
          prev
            ? {
                ...prev,
                has_downloaded_pdf: true,
                pdf_downloaded_at: prev.pdf_downloaded_at ?? new Date().toISOString(),
              }
            : prev,
        )
      } catch {
        /* PDF saved locally even if mark endpoint fails */
      }
    } catch (err) {
      AppAlert.alert(
        "Download failed",
        err instanceof Error ? err.message : "Could not save the PDF report. Try again.",
      )
    } finally {
      setSavingPdf(false)
    }
  }, [session, data, locked, attemptId])

  const filterOptions = useMemo(
    () =>
      [
        { id: "all" as const, label: "All", count: sectionCounts.total, icon: "layers-outline" as const },
        { id: "correct" as const, label: "Correct", count: sectionCounts.correct, icon: "checkmark-circle-outline" as const },
        { id: "incorrect" as const, label: "Missed", count: sectionCounts.incorrect, icon: "close-circle-outline" as const },
        { id: "pending" as const, label: "Pending", count: sectionCounts.pending, icon: "time-outline" as const },
      ],
    [sectionCounts.correct, sectionCounts.incorrect, sectionCounts.pending, sectionCounts.total],
  )

  const prepareTexts = useMemo(
    () => (data?.questions?.length ? extractAssessmentResultQuestionTexts(data.questions) : null),
    [data?.questions],
  )

  if (loading && !data) {
    return (
      <AssessmentReportShell
        native={native}
        title="Report"
        onBack={handleBack}
        saveDisabled
      >
        <QuestionPrepareGate
          fetching
          texts={null}
          title="Preparing report"
          subtitle="Building question review and answer choices"
        >
          <ModuleScreen loading disableTopInsetAdjustment>
            {null}
          </ModuleScreen>
        </QuestionPrepareGate>
      </AssessmentReportShell>
    )
  }

  if (!data) {
    return (
      <AssessmentReportShell
        native={native}
        title="Report"
        onBack={handleBack}
        saveDisabled
      >
        <ModuleScreen
          error={error || "Report unavailable."}
          errorFeature="assessment report"
          onRetryError={onRefresh}
          disableTopInsetAdjustment
          stackedHeader
        >
          {null}
        </ModuleScreen>
      </AssessmentReportShell>
    )
  }

  const pct = data.percentage ?? 0
  const totalPoints = data.total_points ?? data.total_questions ?? counts.total

  return (
    <AssessmentReportShell
      native={native}
      title={data.quiz_title ?? config.title}
      onBack={handleBack}
      onSave={handleSavePdf}
      saving={savingPdf}
      saveDisabled={locked || showPnd}
    >
      <QuestionPrepareGate
        fetching={false}
        texts={prepareTexts}
        title="Preparing report"
        subtitle="Building question review and answer choices"
        enabled={Boolean(data.questions?.length)}
      >
      <ModuleScreen
        loading={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        error={error}
        errorFeature="assessment report"
        disableTopInsetAdjustment
        stackedHeader
      >
      <GradeSummaryCard
        title={data.quiz_title ?? "Assessment"}
        kind={kind}
        percentage={pct}
        score={data.score ?? 0}
        totalPoints={totalPoints}
        correctAnswers={data.correct_answers}
        totalQuestions={data.total_questions ?? counts.total}
        completedAt={data.completed_at}
        showPnd={showPnd}
        pendingCount={counts.pending}
        autoSubmitted={data.auto_submitted}
        violationReason={data.violation_reason}
        sectionBreakdown={data.section_breakdown}
        locked={locked}
        selectedSection={selectedSection}
        onSectionPress={handleSectionPress}
      />

      {locked ? (
        <View style={[styles.lockedCard, { backgroundColor: SN.secondaryGrouped, borderColor: tokens.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={tokens.accent} />
          <Text style={[styles.lockedText, { color: tokens.textSecondary }]}>
            Question review is locked. Your grade above is final until your instructor releases details.
          </Text>
        </View>
      ) : questions.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: SN.secondaryGrouped, borderColor: tokens.border }]}>
          <CommEmptyState
            icon="document-text-outline"
            title="No question review"
            body="Your score above is final for this attempt. Individual questions aren't available to review."
          />
        </View>
      ) : (
        <View style={styles.questionsSection}>
          <View style={styles.questionsHeader}>
            <View style={styles.questionsTitleRow}>
              <Ionicons name={config.icon} size={16} color={tokens.accent} />
              <Text style={[styles.questionsTitle, { color: tokens.text }]}>Question Review</Text>
            </View>
            {selectedSection ? (
              <Pressable
                style={[styles.clearSection, { backgroundColor: hexToRgba(tokens.accent, 0.1) }]}
                onPress={() => setSelectedSection(null)}
                accessibilityRole="button"
                accessibilityLabel={`Clear section filter ${selectedSection}`}
              >
                <Text
                  style={[styles.clearSectionText, { color: tokens.accent }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {selectedSection}
                </Text>
                <Text style={[styles.clearSectionDismiss, { color: tokens.accent }]}>×</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            {filterOptions.map((option) => {
              const active = filter === option.id
              return (
                <Pressable
                  key={option.id}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: native.fill,
                      borderColor: native.separator,
                    },
                    active && {
                      backgroundColor: hexToRgba(tokens.accent, 0.12),
                      borderColor: tokens.accent,
                    },
                  ]}
                  onPress={() => setFilter(option.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${option.label} (${option.count})`}
                >
                  <Ionicons
                    name={option.icon}
                    size={15}
                    color={active ? tokens.accent : native.secondaryLabel}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: native.secondaryLabel },
                      active && { color: tokens.accent },
                    ]}
                  >
                    {option.label} ({option.count})
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {filteredQuestions.length === 0 ? (
            <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
              No questions match this filter.
            </Text>
          ) : (
            filteredQuestions.map(({ q, displayIndex }) => (
              <QuestionCard
                key={String(q.question_id ?? q.id ?? displayIndex)}
                q={q}
                index={displayIndex}
              />
            ))
          )}
        </View>
      )}
      </ModuleScreen>
      </QuestionPrepareGate>
    </AssessmentReportShell>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, minHeight: 0 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
  },
  saveText: { fontSize: 14, fontWeight: "700" },
  lockedCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  lockedText: { flex: 1, fontSize: 13, lineHeight: 19 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
  },
  questionsSection: { gap: 10 },
  questionsHeader: {
    gap: 8,
  },
  questionsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questionsTitle: {
    fontSize: 15,
    fontWeight: "600",
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
  clearSectionText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  clearSectionDismiss: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 14,
  },
  filterScroll: { marginHorizontal: -4, marginBottom: 2 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 16 },
  questionCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
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
  questionPrompt: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  questionMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { fontSize: 11, fontWeight: "600" },
  typeMini: { fontSize: 10, fontWeight: "600" },
  pointsText: { fontSize: 11, fontWeight: "700" },
  questionBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
})
