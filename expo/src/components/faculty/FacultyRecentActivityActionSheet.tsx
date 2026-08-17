import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import {
  activityAssessmentTitle,
  activityAttemptId,
  activityToAssessmentResult,
  assessmentTypeLabel,
} from "../../lib/faculty-assessment-utils"
import { filterActivityForStudentName, filterResultsForStudent } from "../../lib/faculty-student-profile-utils"
import { studentInitials } from "../../lib/faculty-students-utils"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type InstructorAssessmentResult,
  type InstructorRecentActivity,
  type InstructorStudent,
} from "../../lib/instructor-api"
import { FACULTY_ACTIVITY_COLOR, facultyActivityStatusMeta } from "../../lib/faculty-recent-activity-theme"
import { formatResultScore } from "../../lib/faculty-results-utils"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetChrome,
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetErrorBanner,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  FacultySheetSubmitButton,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  item: InstructorRecentActivity | null
  courseActivity: InstructorRecentActivity[]
  scope: Scope | null
  onClose: () => void
  onViewReport: (result: InstructorAssessmentResult) => void
}

type ObservabilityLogRow = Record<string, unknown>

type StudentActivityRow = {
  id: string
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  at?: string
  isSelected: boolean
  result?: InstructorAssessmentResult
}

function buildStudentActivityRows(
  selected: InstructorRecentActivity,
  student: InstructorStudent | null,
  courseActivity: InstructorRecentActivity[],
  results: InstructorAssessmentResult[],
): StudentActivityRow[] {
  const byId = new Map<string, StudentActivityRow>()

  for (const row of filterActivityForStudentName(selected.student_name, courseActivity)) {
    const status = facultyActivityStatusMeta(row.status)
    byId.set(row.id, {
      id: row.id,
      title: activityAssessmentTitle(row),
      subtitle: row.message ?? status.label,
      icon: status.icon,
      at: row.created_at,
      isSelected: row.id === selected.id,
    })
  }

  if (student) {
    for (const row of filterResultsForStudent(student, results)) {
      const id = String(row.attempt_id)
      if (byId.has(id)) continue
      byId.set(id, {
        id,
        title: row.assessment_title ?? row.quiz_title ?? "Assessment",
        subtitle: `${assessmentTypeLabel(row.assessment_type)} · ${formatResultScore(row)}`,
        icon: row.is_flagged ? "flag-outline" : "clipboard-outline",
        at: row.completed_at ?? row.started_at,
        isSelected: id === selected.id,
        result: row,
      })
    }
  }

  return [...byId.values()]
    .sort((a, b) => {
      const ta = a.at ? new Date(a.at).getTime() : 0
      const tb = b.at ? new Date(b.at).getTime() : 0
      return tb - ta
    })
    .slice(0, 20)
}

function formatObservabilityLogTitle(log: ObservabilityLogRow): string {
  const module = String(log.module ?? "Platform").replace(/_/g, " ")
  const sub = log.sub_module ? String(log.sub_module).replace(/_/g, " ") : ""
  const event = String(log.event_type ?? "Event").replace(/_/g, " ")
  if (sub) return `${module} · ${sub}`
  return `${module} · ${event}`
}

function formatObservabilityLogSubtitle(log: ObservabilityLogRow): string {
  const event = String(log.event_type ?? "event").replace(/_/g, " ")
  const status = log.status ? String(log.status) : null
  return [event, status].filter(Boolean).join(" · ")
}

export function FacultyRecentActivityActionSheet({
  visible,
  item,
  courseActivity,
  scope,
  onClose,
  onViewReport,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [student, setStudent] = useState<InstructorStudent | null>(null)
  const [studentResults, setStudentResults] = useState<InstructorAssessmentResult[]>([])
  const [activityLogs, setActivityLogs] = useState<ObservabilityLogRow[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [logError, setLogError] = useState("")

  const studentActivity = useMemo(
    () => (item ? buildStudentActivityRows(item, student, courseActivity, studentResults) : []),
    [item, student, courseActivity, studentResults],
  )

  useEffect(() => {
    if (!visible || !item) {
      setStudent(null)
      setStudentResults([])
      setActivityLogs([])
      setLogError("")
      setLoadingDetails(false)
      return
    }

    if (!scope || !item.student_name?.trim()) {
      setStudent(null)
      setStudentResults([])
      setActivityLogs([])
      return
    }

    let cancelled = false
    setLoadingDetails(true)
    setLogError("")

    void (async () => {
      try {
        const [roster, results] = await Promise.all([
          instructorApi.getStudents(scope),
          instructorApi.getAssessmentResults(scope, { limit: 500 }),
        ])
        const match =
          roster.find(
            (row) => row.full_name.trim().toLowerCase() === item.student_name!.trim().toLowerCase(),
          ) ?? null
        if (cancelled) return
        setStudent(match)
        setStudentResults(match ? filterResultsForStudent(match, results) : [])

        if (!match?.id) {
          setActivityLogs([])
          return
        }

        const res = await instructorApi.getObservabilityLogs(scope, { userId: match.id, limit: 40 })
        if (cancelled) return
        setActivityLogs(res.logs ?? [])
      } catch (err) {
        if (cancelled) return
        setActivityLogs([])
        setLogError(err instanceof ApiError ? err.message : "Could not load activity logs.")
      } finally {
        if (!cancelled) setLoadingDetails(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [visible, item, scope])

  if (!item) return null

  const assessmentTitle = activityAssessmentTitle(item)
  const status = facultyActivityStatusMeta(item.status)
  const selectedResult = activityToAssessmentResult(item)
  const canViewSelectedReport = selectedResult != null && item.status !== "in_progress"

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Student activity" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FacultySheetHero
            title={item.student_name ?? "Student"}
            subtitle={assessmentTitle}
            initials={studentInitials(item.student_name ?? "?")}
            pills={
              <>
                <FacultyStatusPill label={status.label} tone={item.status === "submitted" ? "success" : "neutral"} />
                {student?.section ? <FacultyStatusPill label={student.section} tone="neutral" /> : null}
                {student?.student_id ? <FacultyStatusPill label={student.student_id} tone="neutral" /> : null}
              </>
            }
          />

          <Text style={[type.caption, styles.intro, { color: native.secondaryLabel }]}>
            Selected event · {item.message}
            {item.created_at ? ` · ${formatFacultyRelativeTime(item.created_at)}` : ""}
          </Text>

          <FacultySheetSection
            label="Recent activity"
            hint={`${studentActivity.length} assessment event${studentActivity.length === 1 ? "" : "s"} in this course`}
            tone={SHEET_SECTION.highlight}
          >
            {studentActivity.length === 0 ? (
              <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20 }]}>
                {loadingDetails ? "Loading assessment history…" : "No assessment events recorded for this student yet."}
              </Text>
            ) : (
              <FacultySheetGroupedList>
                {studentActivity.map((row, index) => {
                  const when = row.at ? formatFacultyRelativeTime(row.at) : "—"
                  return (
                    <FacultySheetMetricRow
                      key={row.id}
                      icon={row.icon}
                      label={row.title}
                      value={`${row.subtitle} · ${when}`}
                      tone={row.isSelected ? "teal" : "slate"}
                      isLast={index === studentActivity.length - 1}
                    />
                  )
                })}
              </FacultySheetGroupedList>
            )}
          </FacultySheetSection>

          <FacultySheetSection
            label="Activity logs"
            hint="Platform observability — quiz, practice, and navigation events"
            tone={SHEET_SECTION.tools}
          >
            {loadingDetails ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={FACULTY_ACTIVITY_COLOR.link} />
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                  Loading activity logs…
                </Text>
              </View>
            ) : logError ? (
              <FacultySheetErrorBanner message={logError} />
            ) : activityLogs.length === 0 ? (
              <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20 }]}>
                {student
                  ? "No platform activity logs recorded for this student yet."
                  : "Could not match this student on the roster — activity logs unavailable."}
              </Text>
            ) : (
              <FacultySheetGroupedList>
                {activityLogs.slice(0, 25).map((log, index, arr) => {
                  const when = log.timestamp ? formatFacultyRelativeTime(String(log.timestamp)) : "—"
                  return (
                    <FacultySheetMetricRow
                      key={String(log.id ?? index)}
                      icon="list-outline"
                      label={formatObservabilityLogTitle(log)}
                      value={`${formatObservabilityLogSubtitle(log)} · ${when}`}
                      isLast={index === arr.length - 1}
                    />
                  )
                })}
              </FacultySheetGroupedList>
            )}
            {!loadingDetails && activityLogs.length > 25 ? (
              <Text style={[type.caption, styles.moreNote, { color: native.tertiaryLabel }]}>
                Showing latest 25 of {activityLogs.length} logs.
              </Text>
            ) : null}
          </FacultySheetSection>

          {canViewSelectedReport && selectedResult ? (
            <FacultySheetSection label="Selected attempt" tone={SHEET_SECTION.workflow}>
              <FacultySheetSubmitButton
                label="View attempt report"
                onPress={() => onViewReport(selectedResult)}
              />
              <View style={styles.reportHint}>
                <Ionicons name="information-circle-outline" size={16} color={native.tertiaryLabel} />
                <Text style={[type.caption, { color: native.tertiaryLabel, flex: 1, lineHeight: 17 }]}>
                  {assessmentTypeLabel(item.assessment_type)} · attempt #{activityAttemptId(item) ?? "—"}
                </Text>
              </View>
            </FacultySheetSection>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  intro: { textAlign: "center", lineHeight: 18, marginTop: -4, marginBottom: 4, paddingHorizontal: 8 },
  loadingBox: { alignItems: "center", gap: 10, paddingVertical: 16 },
  moreNote: { marginTop: 8, fontWeight: "600", textAlign: "center" },
  reportHint: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10, paddingHorizontal: 4 },
})
