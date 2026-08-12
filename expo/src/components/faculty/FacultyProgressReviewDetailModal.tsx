import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import type { ProgressReview, ProgressReviewGradebook } from "../../lib/course-info-api"
import { formatFacultyRelativeTime, instructorApi, type InstructorProgressReviewRow } from "../../lib/instructor-api"
import { MarkdownContentWebView } from "../course-info/MarkdownContentWebView"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetHero,
  FacultySheetOutlineButton,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow
} from "./faculty-collab-sheet-ui"
import { SHEET_METRIC, SHEET_SECTION } from "./faculty-sheet-semantics"
import { periodBadgeLabel, parseReviewPeriod } from "../../lib/progress-review-utils"
import { studentInitials } from "../../lib/faculty-students-utils"
import { FACULTY_PROGRESS_REVIEWS_COLOR } from "../../lib/faculty-progress-reviews-theme"

type FacultyScope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: FacultyScope | null
  reviewRow: InstructorProgressReviewRow | null
  onClose: () => void
  onUpdated?: () => void
}

function useProgressReviewDetailStyles() {
  const { native, type } = useModuleTheme()
  return useMemo(
    () =>
      StyleSheet.create({
        loadingBox: { alignItems: "center", gap: 10, paddingVertical: 32 },
        errorBox: { gap: 10 },
        retryBtn: {
          alignSelf: "flex-start",
          backgroundColor: FACULTY_PROGRESS_REVIEWS_COLOR.action,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 8,
        },
        retryBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
        overallRow: { gap: 8, marginBottom: 10 },
        overallBadge: {
          alignSelf: "flex-start",
          borderRadius: NATIVE.sectionRadius,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          backgroundColor: native.secondaryGrouped,
          gap: 2,
        },
        overallValue: { fontSize: 28, fontWeight: "600", color: native.label },
        overallLabel: { fontSize: 12, fontWeight: "600", color: native.secondaryLabel },
        provisionalNote: { fontSize: 12, lineHeight: 18, color: native.secondaryLabel, fontWeight: "600" },
        statWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        statCell: {
          width: "31%",
          minWidth: 96,
          flexGrow: 1,
          borderRadius: NATIVE.sectionRadius,
          padding: 12,
          gap: 4,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          backgroundColor: native.secondaryGrouped,
        },
        statLabel: { fontSize: 11, fontWeight: "600", color: native.secondaryLabel },
        statValue: { fontSize: 16, fontWeight: "600", color: native.label },
        statPending: { color: native.secondaryLabel },
        readingCard: {
          borderRadius: NATIVE.sectionRadius,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          backgroundColor: native.secondaryGrouped,
        },
        footer: { fontSize: 12, color: native.tertiaryLabel, textAlign: "center", marginTop: 8, fontWeight: "600" },
      }),
    [native, type],
  )
}

function GradeStatGrid({ gb }: { gb: ProgressReviewGradebook }) {
  const styles = useProgressReviewDetailStyles()
  const cells = [
    { label: "Overall", value: `${gb.totalScore.toFixed(1)}%`, pending: gb.gradeIsProvisional },
    { label: "Quiz", value: gb.quizScore != null ? `${gb.quizScore.toFixed(1)}%` : "—", pending: gb.categoryStatus?.quiz === "pending" },
    { label: "Homework", value: gb.homeworkScore != null ? `${gb.homeworkScore.toFixed(1)}%` : "—", pending: gb.categoryStatus?.homework === "pending" },
    { label: "Midterm", value: gb.midtermScore != null ? `${gb.midtermScore.toFixed(1)}%` : "—", pending: gb.categoryStatus?.midterm === "pending" },
    { label: "Attendance", value: gb.attendanceScore != null ? `${gb.attendanceScore.toFixed(1)}%` : "—", pending: gb.categoryStatus?.attendance === "pending" },
    { label: "Classroom", value: gb.classroomScore != null ? `${gb.classroomScore.toFixed(1)}%` : "—", pending: gb.categoryStatus?.classroom === "pending" },
  ]

  return (
    <View style={styles.statWrap}>
      {cells.map((cell) => (
        <View key={cell.label} style={styles.statCell}>
          <Text style={styles.statLabel}>{cell.label}</Text>
          <Text style={[styles.statValue, cell.pending ? styles.statPending : null]}>{cell.value}</Text>
        </View>
      ))}
    </View>
  )
}

function MarkdownSection({
  title,
  content}: {
  title: string
  content?: string | null
}) {
  const styles = useProgressReviewDetailStyles()
  if (!content?.trim()) return null
  return (
    <FacultySheetSection label={title} tone={SHEET_SECTION.review}>
      <View style={styles.readingCard}>
        <MarkdownContentWebView markdown={content} variant="embedded" />
      </View>
    </FacultySheetSection>
  )
}

function BulletSection({
  title,
  items}: {
  title: string
  items?: string[]
}) {
  const styles = useProgressReviewDetailStyles()
  if (!items?.length) return null
  const markdown = items.map((item) => `- ${item}`).join("\n\n")
  return (
    <FacultySheetSection label={title} tone={SHEET_SECTION.review}>
      <View style={styles.readingCard}>
        <MarkdownContentWebView markdown={markdown} variant="embedded" />
      </View>
    </FacultySheetSection>
  )
}

export function FacultyProgressReviewDetailModal({ visible, scope, reviewRow, onClose, onUpdated }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const styles = useProgressReviewDetailStyles()
  const insets = useSafeAreaInsets()
  const [review, setReview] = useState<ProgressReview | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    if (!scope || !reviewRow) return
    setError("")
    const next = await instructorApi.getStudentProgressReview(
      scope,
      reviewRow.studentId,
      reviewRow.reviewPeriod,
      reviewRow.asOfDate,
    )
    setReview(next)
  }, [scope, reviewRow])

  useEffect(() => {
    if (!visible || !scope || !reviewRow) {
      setReview(null)
      setError("")
      return
    }
    setLoading(true)
    load()
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load progress review.")
        setReview(null)
      })
      .finally(() => setLoading(false))
  }, [visible, scope, reviewRow, load])

  async function deliverToStudent() {
    if (!scope || !reviewRow) return
    setActing(true)
    setError("")
    try {
      await instructorApi.runProgressReviewBatch(scope, {
        reviewPeriod: parseReviewPeriod(reviewRow.reviewPeriod),
        asOfDate: reviewRow.asOfDate ?? undefined,
        studentIds: [reviewRow.studentId],
        deliverSaved: true,
        dryRun: false,
        sendEmail: true,
        createAnnouncement: true,
        createNotification: true})
      onUpdated?.()
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not deliver review.")
    } finally {
      setActing(false)
    }
  }

  async function regenerateReview() {
    if (!scope || !reviewRow) return
    setActing(true)
    setError("")
    try {
      await instructorApi.runProgressReviewBatch(scope, {
        reviewPeriod: parseReviewPeriod(reviewRow.reviewPeriod),
        asOfDate: reviewRow.asOfDate ?? undefined,
        studentIds: [reviewRow.studentId],
        dryRun: true,
        sendEmail: false,
        createAnnouncement: false,
        createNotification: false})
      onUpdated?.()
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not regenerate review.")
    } finally {
      setActing(false)
    }
  }

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

  if (!reviewRow) return null

  const sections = review?.sections
  const gb = review?.progressData?.gradebook
  const courseCode = review?.progressData?.courseCode
  const fullMarkdown = review?.contentMarkdown?.trim()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Progress review" onClose={onClose} accentColor={FACULTY_PROGRESS_REVIEWS_COLOR.link} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_PROGRESS_REVIEWS_COLOR.link} />
          }
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={reviewRow.fullName}
            subtitle={reviewRow.email ?? courseCode ?? undefined}
            initials={studentInitials(reviewRow.fullName)}
            pills={
              <>
                <FacultyStatusPill
                  label={periodBadgeLabel(reviewRow.reviewPeriod, reviewRow.asOfDate)}
                  tone="neutral"
                />
                {reviewRow.section ? <FacultyStatusPill label={`Section ${reviewRow.section}`} tone="neutral" /> : null}
                <FacultyStatusPill
                  label={reviewRow.emailSentAt ? "Emailed" : "Draft"}
                  tone={reviewRow.emailSentAt ? "success" : "warning"}
                />
              </>
            }
          />

          {gb ? (
            <FacultySheetStatRow>
              <FacultySheetStatChip icon="analytics-outline" label="Overall" value={`${gb.totalScore.toFixed(1)}%`} tone={SHEET_METRIC.primary} />
              <FacultySheetStatChip icon="ribbon-outline" label="Grade" value={gb.letterGrade ?? "—"} tone={SHEET_METRIC.info} />
              <FacultySheetStatChip
                icon="hourglass-outline"
                label="Status"
                value={gb.gradeIsProvisional ? "Pending" : "Final"}
                tone={gb.gradeIsProvisional ? SHEET_METRIC.pending : SHEET_METRIC.neutral}
              />
            </FacultySheetStatRow>
          ) : null}

          {loading && !review ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={FACULTY_PROGRESS_REVIEWS_COLOR.link} />
              <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>Loading review…</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <FacultySheetErrorBanner message={error} />
              <Pressable style={styles.retryBtn} onPress={() => void load()}>
                <Text style={styles.retryBtnText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!loading && !review && !error ? (
            <FacultyEmptyState
              icon="sparkles-outline"
              title="Review not available"
              body="This student does not have a saved progress review for this period yet."
            />
          ) : null}

          {review ? (
            <>
              {gb ? (
                <FacultySheetSection label="Grade snapshot" tone={SHEET_SECTION.highlight}>
                  <View style={styles.overallRow}>
                    <View style={styles.overallBadge}>
                      <Text style={styles.overallValue}>{gb.totalScore.toFixed(1)}%</Text>
                      <Text style={styles.overallLabel}>
                        {gb.gradeIsProvisional ? "In progress" : gb.letterGrade ?? "Overall"}
                      </Text>
                    </View>
                    {gb.gradeIsProvisional && (gb.pendingCategories?.length ?? 0) > 0 ? (
                      <Text style={styles.provisionalNote}>
                        Pending: {gb.pendingCategories?.join(", ")}
                      </Text>
                    ) : null}
                  </View>
                  <GradeStatGrid gb={gb} />
                </FacultySheetSection>
              ) : null}

              {fullMarkdown ? (
                <FacultySheetSection label="Full review" tone={SHEET_SECTION.review}>
                  <MarkdownContentWebView markdown={fullMarkdown} variant="reading" />
                </FacultySheetSection>
              ) : sections ? (
                <>
                  <MarkdownSection title="Overall summary" content={sections.overallSummary} />
                  <BulletSection title="Strengths" items={sections.strengths} />
                  <BulletSection title="Areas to improve" items={sections.areasToImprove} />
                  <MarkdownSection title="Assessments & feedback" content={sections.assessmentFeedback} />
                  <MarkdownSection title="Practice hub" content={sections.practiceFeedback} />
                  <MarkdownSection title="Attendance" content={sections.attendanceFeedback} />
                  <MarkdownSection title="Classroom participation" content={sections.classroomFeedback} />
                  <BulletSection title="Action plan" items={sections.actionPlan} />
                  {sections.encouragement ? (
                    <FacultySheetSection label="Encouragement" tone={SHEET_SECTION.review}>
                      <View style={styles.readingCard}>
                        <MarkdownContentWebView markdown={sections.encouragement} variant="embedded" />
                      </View>
                    </FacultySheetSection>
                  ) : null}
                </>
              ) : null}

              <FacultySheetSection label="Actions" tone={SHEET_SECTION.workflow}>
                {!reviewRow.emailSentAt ? (
                  <FacultySheetOutlineButton
                    icon="send-outline"
                    label="Send to student"
                    onPress={() => void deliverToStudent()}
                    loading={acting}
                  />
                ) : null}
                <FacultySheetOutlineButton
                  icon="refresh-outline"
                  label="Regenerate & save"
                  onPress={() => void regenerateReview()}
                  loading={acting}
                />
              </FacultySheetSection>

              <Text style={styles.footer}>
                {reviewRow.modelUsed ? `${reviewRow.modelUsed} · ` : ""}
                Created {reviewRow.createdAt ? formatFacultyRelativeTime(reviewRow.createdAt) : "—"}
                {reviewRow.emailSentAt ? ` · Emailed ${formatFacultyRelativeTime(reviewRow.emailSentAt)}` : ""}
              </Text>
            </>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}
