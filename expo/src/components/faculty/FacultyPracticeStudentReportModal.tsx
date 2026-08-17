import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { studentInitials } from "../../lib/faculty-students-utils"
import {
  instructorApi,
  type PracticeStudentProgress,
  type PracticeStudentReport} from "../../lib/instructor-api"
import { QuestionContentWebView } from "../rewards/QuestionContent"
import { FACULTY_PRACTICE_COLOR } from "../../lib/faculty-practice-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
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
  FacultySheetStatRow} from "./faculty-collab-sheet-ui"
import { SHEET_PRACTICE, SHEET_SECTION } from "./faculty-sheet-semantics"
import { practiceStudentName, PracticeAccuracyPanel } from "./FacultyPracticeModals"

type FacultyScope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: FacultyScope | null
  student: PracticeStudentProgress | null
  onClose: () => void
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"})
}

function formatDuration(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—"
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function scoreTone(score: number): "success" | "warning" | "neutral" {
  if (score >= 80) return "success"
  if (score >= 60) return "warning"
  return "neutral"
}

function normalizeTopics(topics: unknown): string[] {
  if (Array.isArray(topics)) return topics.map(String).filter(Boolean)
  if (typeof topics === "string") {
    try {
      const parsed = JSON.parse(topics) as unknown
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch {
      return topics.trim() ? [topics] : []
    }
  }
  return []
}

export function FacultyPracticeStudentReportModal({ visible, scope, student, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [report, setReport] = useState<PracticeStudentReport | null>(null)

  const load = useCallback(async () => {
    if (!scope || !student) return
    setError("")
    try {
      const data = await instructorApi.getPracticeStudentReport(scope, student.student_id)
      setReport(data)
    } catch (err) {
      setReport(null)
      setError(err instanceof ApiError ? err.message : "Could not load report.")
    }
  }, [scope, student])

  useEffect(() => {
    if (!visible || !scope || !student) {
      setReport(null)
      setError("")
      return
    }
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [visible, scope, student, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  if (!student) return null

  const displayName = report?.student?.name ?? practiceStudentName(student)
  const section = report?.student?.section ?? student.student_section
  const email = report?.student?.email
  const stats = report?.overallStats
  const topics = report?.topicPerformance ?? []
  const attempts = report?.attempts ?? []
  const answers = report?.answers ?? []
  const leaderboard = report?.leaderboard
  const accuracy = Math.round(stats?.accuracy ?? 0)
  const avgScore = Math.round(stats?.avgScore ?? 0)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Practice report" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_PRACTICE_COLOR.link} />
          }
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={displayName}
            subtitle={email ?? undefined}
            initials={studentInitials(displayName)}
            thumbColor={FACULTY_PRACTICE_COLOR.studentThumb}
            pills={
              <>
                {section ? <FacultyStatusPill label={`Section ${section}`} tone="neutral" /> : null}
                <FacultyStatusPill label="Practice report" tone="neutral" />
              </>
            }
          />

          {loading && !report ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={FACULTY_PRACTICE_COLOR.link} />
              <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>Loading report…</Text>
            </View>
          ) : null}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${tokens.danger}14`, borderColor: `${tokens.danger}33` }]}>
              <FacultySheetErrorBanner message={error} />
              <Pressable
                style={[styles.retryBtn, { backgroundColor: FACULTY_PRACTICE_COLOR.action }]}
                onPress={() => void load()}
                accessibilityRole="button"
                accessibilityLabel="Try again"
              >
                <Text style={[type.bodyEmphasis, { color: "#ffffff", fontSize: 14 }]}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!loading && report && stats?.totalAttempts === 0 ? (
            <FacultyEmptyState
              icon="bar-chart-outline"
              title="No practice data"
              body="This student has not completed any practice sessions yet."
            />
          ) : null}

          {report && stats && stats.totalAttempts > 0 ? (
            <>
              <FacultySheetSection label="Overall performance" tone={SHEET_SECTION.highlight}>
                <PracticeAccuracyPanel
                  accuracy={accuracy}
                  meta={`${stats.totalCorrect} correct of ${stats.totalQuestions} questions · ${avgScore}% avg score`}
                />
                <FacultySheetGroupedList>
                  <FacultySheetMetricRow icon="repeat-outline" label="Total attempts" value={String(stats.totalAttempts)} />
                  <FacultySheetMetricRow icon="help-circle-outline" label="Questions answered" value={String(stats.totalQuestions)} />
                  <FacultySheetMetricRow icon="checkmark-circle-outline" label="Correct answers" value={String(stats.totalCorrect)} />
                  <FacultySheetMetricRow icon="trending-up-outline" label="Average score" value={`${avgScore}%`} isLast />
                </FacultySheetGroupedList>
              </FacultySheetSection>

              {leaderboard ? (
                <FacultySheetSection label="Leaderboard" tone={SHEET_SECTION.review}>
              <FacultySheetStatRow>
                    <FacultySheetStatChip label="Rank" value={`#${leaderboard.rank}`} tone={SHEET_PRACTICE.accuracy} />
                    <FacultySheetStatChip label="Level" value={String(leaderboard.level)} tone={SHEET_PRACTICE.topics} />
                    <FacultySheetStatChip label="XP" value={String(leaderboard.xp)} tone={SHEET_PRACTICE.dailyLimit} />
                  </FacultySheetStatRow>
                  <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                    {leaderboard.totalQuestionsAttempted} questions · {Math.round(leaderboard.accuracy)}% leaderboard accuracy
                  </Text>
                </FacultySheetSection>
              ) : null}

              {topics.length > 0 ? (
                <FacultySheetSection label="Topic performance" hint={`${topics.length} topic${topics.length === 1 ? "" : "s"} with activity`} tone={SHEET_SECTION.roster}>
                  {topics.map((row) => {
                    const topicAccuracy = Math.round(row.accuracy)
                    return (
                      <View
                        key={row.topic}
                        style={[
                          styles.rowCard,
                          { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
                        ]}
                      >
                        <View style={styles.rowHead}>
                          <Text
                            style={[type.bodyEmphasis, { flex: 1, color: native.label, lineHeight: 20, fontSize: 14 }]}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {row.topic}
                          </Text>
                          <FacultyStatusPill label={`${topicAccuracy}%`} tone={scoreTone(topicAccuracy)} />
                        </View>
                        <View style={[styles.accuracyTrack, { backgroundColor: native.fill }]}>
                          <View
                            style={[
                              styles.accuracyFill,
                              {
                                width: `${Math.min(100, Math.max(0, topicAccuracy))}%`,
                                backgroundColor:
                                  topicAccuracy >= 80
                                    ? FACULTY_PRACTICE_COLOR.success
                                    : topicAccuracy >= 60
                                      ? FACULTY_PRACTICE_COLOR.challenge
                                      : FACULTY_PRACTICE_COLOR.accuracy,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                          {row.correct_answers}/{row.total_questions} correct
                        </Text>
                      </View>
                    )
                  })}
                </FacultySheetSection>
              ) : null}

              {attempts.length > 0 ? (
                <FacultySheetSection label="Practice attempts" hint={`${attempts.length} completed session${attempts.length === 1 ? "" : "s"}`}>
                  {attempts.map((attempt) => {
                    const score = Math.round(attempt.score_percentage)
                    const topicLabel = normalizeTopics(attempt.topics).join(", ") || "Mixed topics"
                    return (
                      <View
                        key={attempt.id}
                        style={[
                          styles.rowCard,
                          { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
                        ]}
                      >
                        <View style={styles.rowHead}>
                          <FacultyStatusPill label={`${score}%`} tone={scoreTone(score)} />
                          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                            {formatWhen(attempt.started_at)}
                          </Text>
                        </View>
                        <Text
                          style={[type.bodyEmphasis, { color: native.label, lineHeight: 20, fontSize: 14 }]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {topicLabel}
                        </Text>
                        <View style={styles.metaRow}>
                          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                            {attempt.correct_answers}/{attempt.total_questions} correct
                          </Text>
                          {attempt.difficulty ? (
                            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                              {" "}
                              · {attempt.difficulty}
                            </Text>
                          ) : null}
                          {attempt.time_spent_seconds ? (
                            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                              {" "}
                              · {formatDuration(attempt.time_spent_seconds)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    )
                  })}
                </FacultySheetSection>
              ) : null}

              {answers.length > 0 ? (
                <FacultySheetSection label="Recent answers" hint={`Last ${Math.min(answers.length, 20)} question responses`}>
                  {answers.slice(0, 20).map((answer) => {
                    const topic = answer.question?.topic
                    return (
                      <View
                        key={answer.id}
                        style={[
                          styles.rowCard,
                          { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
                        ]}
                      >
                        <View style={styles.answerHead}>
                          <Ionicons
                            name={answer.is_correct ? "checkmark-circle" : "close-circle"}
                            size={18}
                            color={answer.is_correct ? tokens.success : tokens.danger}
                          />
                          {topic ? <FacultyStatusPill label={topic} tone="neutral" /> : null}
                          {answer.question?.difficulty ? (
                            <FacultyStatusPill label={answer.question.difficulty} tone="neutral" />
                          ) : null}
                        </View>
                        {(answer.question?.text ?? "").trim() ? (
                          <QuestionContentWebView text={answer.question?.text ?? ""} embedded compact />
                        ) : (
                          <Text style={[type.bodyEmphasis, { color: native.label, lineHeight: 20, fontSize: 14 }]}>
                            Question
                          </Text>
                        )}
                        {(answer.student_answer ?? "").trim() ? (
                          <View style={styles.answerBlock}>
                            <Text style={[type.caption, { color: native.tertiaryLabel }]}>Student answer</Text>
                            <QuestionContentWebView text={answer.student_answer ?? ""} embedded compact />
                          </View>
                        ) : (
                          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                            Answer: —
                          </Text>
                        )}
                        {!answer.is_correct && (answer.question?.correct_answer ?? "").trim() ? (
                          <View style={styles.answerBlock}>
                            <Text style={[type.caption, { color: native.tertiaryLabel }]}>Correct answer</Text>
                            <QuestionContentWebView text={answer.question?.correct_answer ?? ""} embedded compact />
                          </View>
                        ) : null}
                        {answer.answered_at ? (
                          <Text style={[type.caption, { color: native.tertiaryLabel, fontWeight: "600" }]}>
                            {formatWhen(answer.answered_at)}
                          </Text>
                        ) : null}
                      </View>
                    )
                  })}
                </FacultySheetSection>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  loadingBox: { alignItems: "center", gap: 10, paddingVertical: 32 },
  errorBox: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  retryBtn: {
    alignSelf: "flex-start",
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rowCard: { gap: 6, padding: 12, borderRadius: NATIVE.sectionRadius, borderWidth: StyleSheet.hairlineWidth },
  rowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  accuracyTrack: { height: 8, borderRadius: NATIVE.sectionRadius, overflow: "hidden" },
  accuracyFill: { height: "100%", borderRadius: NATIVE.sectionRadius },
  metaRow: { flexDirection: "row", flexWrap: "wrap" },
  answerHead: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  answerBlock: { gap: 4 },
})