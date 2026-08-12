import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  View} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import type { StudentIndividualReportPayload } from "../../lib/instructor-reports-utils"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { studentInitials } from "../../lib/faculty-students-utils"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  studentId: number | null
  onClose: () => void
}

export function FacultyStudentReportSheet({ visible, scope, studentId, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { tokens } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [report, setReport] = useState<StudentIndividualReportPayload | null>(null)

  useEffect(() => {
    if (!visible || !scope || !studentId) {
      setReport(null)
      setError("")
      return
    }
    setLoading(true)
    instructorApi
      .getInstructorStudentReport(scope, studentId)
      .then((payload) => setReport(payload ?? null))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load student report.")
        setReport(null)
      })
      .finally(() => setLoading(false))
  }, [visible, scope, studentId])

  if (!visible) return null

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Student report" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator color={FACULTY_SHEET_COLOR.link} style={{ marginTop: 24 }} />
          ) : error ? (
            <FacultySheetErrorBanner message={error} />
          ) : report ? (
            <>
              <FacultySheetHero
                title={report.student.fullName}
                subtitle={report.student.email}
                initials={studentInitials(report.student.fullName)}
                pills={
                  <>
                    {report.student.section ? (
                      <FacultyStatusPill label={`Section ${report.student.section}`} tone="neutral" />
                    ) : null}
                    <FacultyStatusPill
                      label={`${report.summary.completedAttempts} attempts`}
                      tone="neutral"
                    />
                  </>
                }
              />

              <FacultySheetSection label="Performance" tone={SHEET_SECTION.highlight}>
                <FacultySheetGroupedList>
                  <FacultySheetMetricRow
                    icon="analytics-outline"
                    label="Average score"
                    value={`${Math.round(report.summary.avgPercentage)}%`}
                  />
                  <FacultySheetMetricRow
                    icon="checkmark-done-outline"
                    label="Completed attempts"
                    value={String(report.summary.completedAttempts)}
                  />
                  <FacultySheetMetricRow
                    icon="shield-outline"
                    label="Flagged attempts"
                    value={String(
                      report.summary.flaggedAttempts ??
                        report.attempts.filter(
                          (a) => (a.tabSwitches ?? 0) > 3 || (a.copyPasteAttempts ?? 0) > 2,
                        ).length,
                    )}
                    isLast
                  />
                </FacultySheetGroupedList>
              </FacultySheetSection>

              {report.attempts.length > 0 ? (
                <FacultySheetSection label="Recent attempts" tone={SHEET_SECTION.tools}>
                  <FacultySheetGroupedList>
                    {report.attempts.slice(0, 6).map((attempt, index, arr) => (
                      <FacultySheetMetricRow
                        key={String(attempt.attemptId ?? index)}
                        icon="document-text-outline"
                        label={attempt.quizTitle ?? "Attempt"}
                        value={
                          attempt.percentage != null
                            ? `${Math.round(attempt.percentage)}%`
                            : attempt.completedAt
                              ? String(attempt.completedAt).slice(0, 10)
                              : "—"
                        }
                        isLast={index === arr.length - 1}
                      />
                    ))}
                  </FacultySheetGroupedList>
                </FacultySheetSection>
              ) : null}
            </>
          ) : (
            <Text style={collabSheetStyles.introText}>No report data available.</Text>
          )}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}