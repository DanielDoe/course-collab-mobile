import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import {
  atRiskSignalsForStudent,
  type AtRiskStudentRow,
} from "../../lib/faculty-analytics-utils"
import { filterResultsForStudent } from "../../lib/faculty-student-profile-utils"
import { studentInitials } from "../../lib/faculty-students-utils"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type InstructorAssessmentResult,
  type InstructorStudent,
  type PracticeStudentProgress,
} from "../../lib/instructor-api"
import { FACULTY_STUDENT_PROGRESS_COLOR } from "../../lib/faculty-student-progress-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetErrorBanner,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import {
  practiceStudentAttempts,
  practiceStudentName,
  practiceStudentScore,
} from "./FacultyPracticeModals"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  row: AtRiskStudentRow | null
  allRows: AtRiskStudentRow[]
  scope: Scope | null
  onClose: () => void
  onOpenProfile: (student: InstructorStudent) => void
  onOpenPracticeReport: (student: PracticeStudentProgress) => void
}

function findRosterStudent(
  roster: InstructorStudent[],
  row: AtRiskStudentRow,
): InstructorStudent | null {
  if (row.studentDbId != null) {
    const byId = roster.find((student) => student.id === row.studentDbId)
    if (byId) return byId
  }
  const target = row.name.trim().toLowerCase()
  return roster.find((student) => student.full_name.trim().toLowerCase() === target) ?? null
}

function riskSignalIcon(kind: AtRiskStudentRow["kind"]): keyof typeof Ionicons.glyphMap {
  if (kind === "low_practice") return "fitness-outline"
  if (kind === "chronic_absence") return "calendar-outline"
  return "alert-circle-outline"
}

export function FacultyAtRiskActionSheet({
  visible,
  row,
  allRows,
  scope,
  onClose,
  onOpenProfile,
  onOpenPracticeReport,
}: Props) {
  const router = useRouter()
  const collabSheetStyles = useCollabSheetStyles()
  const { native, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [rosterStudent, setRosterStudent] = useState<InstructorStudent | null>(null)
  const [recentResults, setRecentResults] = useState<InstructorAssessmentResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const signals = useMemo(() => atRiskSignalsForStudent(allRows, row), [allRows, row])
  const practiceStudent = row?.practiceStudent ?? signals.find((signal) => signal.practiceStudent)?.practiceStudent
  const attendance = row?.attendance ?? signals.find((signal) => signal.attendance)?.attendance

  useEffect(() => {
    if (!visible || !row || !scope) {
      setRosterStudent(null)
      setRecentResults([])
      setError("")
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError("")

    void (async () => {
      try {
        const [roster, results] = await Promise.all([
          instructorApi.getStudents(scope),
          instructorApi.getAssessmentResults(scope, { limit: 500 }),
        ])
        if (cancelled) return
        const match = findRosterStudent(roster, row)
        setRosterStudent(match)
        setRecentResults(match ? filterResultsForStudent(match, results).slice(0, 5) : [])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : "Could not load student details.")
        setRosterStudent(null)
        setRecentResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [visible, row, scope])

  if (!row) return null

  function navigateAfterClose(route: string) {
    onClose()
    requestAnimationFrame(() => router.push(route as never))
  }

  function runAction(action: () => void) {
    onClose()
    requestAnimationFrame(action)
  }

  const primaryTone = row.tone === "danger" ? "danger" : "warning"
  const attendancePct =
    attendance?.attendance_percentage != null ? `${Math.round(attendance.attendance_percentage)}%` : null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="At-risk student"
          onClose={onClose}
          accentColor={FACULTY_STUDENT_PROGRESS_COLOR.link}
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
          <FacultySheetHero
            title={row.name}
            subtitle={row.section ?? rosterStudent?.section ?? rosterStudent?.session_code ?? undefined}
            initials={studentInitials(row.name)}
            pills={
              <>
                {signals.map((signal) => (
                  <FacultyStatusPill
                    key={`${signal.kind}-${signal.reason}`}
                    label={signal.reason}
                    tone={signal.tone === "danger" ? "danger" : "warning"}
                  />
                ))}
              </>
            }
          />

          <Text style={[type.caption, styles.intro, { color: native.secondaryLabel }]}>
            {signals.length > 1
              ? `${signals.length} risk signals detected for this student.`
              : row.detail ?? "Review signals and follow up from related modules."}
          </Text>

          <FacultySheetSection
            label="Risk signals"
            hint={`${signals.length} active signal${signals.length === 1 ? "" : "s"}`}
            tone={SHEET_SECTION.highlight}
          >
            <FacultySheetGroupedList>
              {signals.map((signal, index) => (
                <FacultySheetMetricRow
                  key={`${signal.kind}-${signal.reason}`}
                  icon={riskSignalIcon(signal.kind)}
                  label={signal.reason}
                  value={signal.detail ?? "Needs follow-up"}
                  tone={signal.tone === "danger" ? "rose" : "amber"}
                  isLast={index === signals.length - 1}
                />
              ))}
            </FacultySheetGroupedList>
          </FacultySheetSection>

          {(attendancePct || practiceStudent) && (
            <FacultySheetSection label="Snapshot" tone={SHEET_SECTION.review}>
              <FacultySheetGroupedList>
                {attendancePct ? (
                  <FacultySheetMetricRow
                    icon="checkmark-circle-outline"
                    label="Attendance"
                    value={attendancePct}
                    tone={primaryTone === "danger" ? "rose" : "slate"}
                    isLast={!practiceStudent}
                  />
                ) : null}
                {practiceStudent ? (
                  <FacultySheetMetricRow
                    icon="fitness-outline"
                    label="Practice avg"
                    value={`${Math.round(practiceStudentScore(practiceStudent))}% · ${practiceStudentAttempts(practiceStudent)} attempts`}
                    tone="amber"
                    isLast
                  />
                ) : null}
              </FacultySheetGroupedList>
            </FacultySheetSection>
          )}

          <FacultySheetSection
            label="Recent assessments"
            hint={recentResults.length > 0 ? "Latest graded attempts" : "Course submission history"}
            tone={SHEET_SECTION.tools}
          >
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={FACULTY_STUDENT_PROGRESS_COLOR.link} />
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                  Loading assessment history…
                </Text>
              </View>
            ) : error ? (
              <FacultySheetErrorBanner message={error} />
            ) : recentResults.length === 0 ? (
              <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20 }]}>
                {rosterStudent
                  ? "No graded assessment attempts recorded for this student yet."
                  : "Could not match this student on the roster."}
              </Text>
            ) : (
              <FacultySheetGroupedList>
                {recentResults.map((result, index) => {
                  const when = result.completed_at
                    ? formatFacultyRelativeTime(result.completed_at)
                    : result.started_at
                      ? formatFacultyRelativeTime(result.started_at)
                      : "—"
                  const score =
                    result.percentage != null
                      ? `${Math.round(result.percentage)}%`
                      : result.score != null
                        ? String(result.score)
                        : "—"
                  return (
                    <FacultySheetMetricRow
                      key={String(result.attempt_id)}
                      icon={result.is_flagged ? "flag-outline" : "clipboard-outline"}
                      label={result.assessment_title ?? result.quiz_title ?? "Assessment"}
                      value={`${score} · ${when}`}
                      tone={result.is_flagged ? "rose" : "slate"}
                      isLast={index === recentResults.length - 1}
                    />
                  )
                })}
              </FacultySheetGroupedList>
            )}
          </FacultySheetSection>

          <FacultySheetSection label="Follow up" tone={SHEET_SECTION.workflow}>
            {rosterStudent ? (
              <FacultySheetActionRow
                icon="person-outline"
                label="View student profile"
                subtitle="Engagement, submissions, contact, and timeline"
                tone="primary"
                onPress={() => runAction(() => onOpenProfile(rosterStudent))}
              />
            ) : null}
            {practiceStudent ? (
              <FacultySheetActionRow
                icon="document-text-outline"
                label="View practice report"
                subtitle={`${practiceStudentName(practiceStudent)} · topic breakdown and attempts`}
                tone="primary"
                onPress={() => runAction(() => onOpenPracticeReport(practiceStudent))}
              />
            ) : null}
            {(attendance || signals.some((signal) => signal.kind !== "low_practice")) && (
              <FacultySheetActionRow
                icon="checkmark-circle-outline"
                label="Open attendance"
                subtitle="Review sessions, roll, and attendance log"
                onPress={() => navigateAfterClose("/module/attendance")}
              />
            )}
            <FacultySheetActionRow
              icon="bar-chart-outline"
              label="Manage results"
              subtitle="Assessment attempts, scores, and attempt reports"
              onPress={() => navigateAfterClose("/module/results")}
            />
            <FacultySheetActionRow
              icon="sparkles-outline"
              label="Progress reviews"
              subtitle="Generate or send an AI progress review"
              onPress={() => navigateAfterClose("/module/progress-reviews")}
            />
            <FacultySheetActionRow
              icon="time-outline"
              label="Office hours"
              subtitle="Schedule or review office hour requests"
              onPress={() => navigateAfterClose("/module/office-hours")}
            />
            {rosterStudent?.email ? (
              <FacultySheetActionRow
                icon="mail-outline"
                label="Email student"
                subtitle={rosterStudent.email}
                onPress={() => {
                  onClose()
                  void Linking.openURL(`mailto:${rosterStudent.email}`)
                }}
              />
            ) : null}
            <FacultySheetActionRow
              icon="chatbubble-outline"
              label="Messages"
              subtitle="Open course messaging"
              onPress={() => navigateAfterClose("/module/messages")}
            />
          </FacultySheetSection>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  intro: { textAlign: "center", lineHeight: 18, marginTop: -4, marginBottom: 4, paddingHorizontal: 8 },
  loadingBox: { alignItems: "center", gap: 10, paddingVertical: 16 },
})
