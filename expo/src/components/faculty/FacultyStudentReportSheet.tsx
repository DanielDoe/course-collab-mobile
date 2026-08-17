import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import type { StudentIndividualReportPayload } from "../../lib/instructor-reports-utils"
import { shareStudentIndividualReportPdf } from "../../lib/instructor-report-pdf"
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
  FacultySheetSection,
  FacultySheetSubmitButton,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { studentInitials } from "../../lib/faculty-students-utils"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  studentId: number | null
  attemptSearch: string
  onClose: () => void
}

export function FacultyStudentReportSheet({ visible, scope, studentId, attemptSearch, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
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

  const filteredAttempts = useMemo(() => {
    const rows = report?.attempts ?? []
    const q = attemptSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((attempt) =>
      [attempt.quizTitle, attempt.assessmentType, attempt.completedAt]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [report?.attempts, attemptSearch])

  if (!visible) return null

  async function handleExportPdf() {
    if (!report) return
    setExporting(true)
    setError("")
    try {
      await shareStudentIndividualReportPdf(report)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export PDF.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Student report" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <ActivityIndicator color={FACULTY_SHEET_COLOR.link} style={{ marginTop: 24 }} />
          ) : error && !report ? (
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
                <FacultySheetSection
                  label="Recent attempts"
                  hint={
                    attemptSearch.trim()
                      ? `Showing ${filteredAttempts.length} of ${report.attempts.length} · use bottom search to filter`
                      : `${report.attempts.length} attempt${report.attempts.length === 1 ? "" : "s"} · use bottom search to filter`
                  }
                  tone={SHEET_SECTION.tools}
                >
                  <FacultySheetGroupedList>
                    {(attemptSearch.trim() ? filteredAttempts : report.attempts.slice(0, 12)).map((attempt, index, arr) => (
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

              {error ? <FacultySheetErrorBanner message={error} /> : null}

              <FacultySheetSection label="Export" tone={SHEET_SECTION.workflow}>
                {exporting ? (
                  <ActivityIndicator color={FACULTY_SHEET_COLOR.link} style={{ marginVertical: 12 }} />
                ) : (
                  <FacultySheetSubmitButton label="Export PDF" onPress={() => void handleExportPdf()} />
                )}
              </FacultySheetSection>
            </>
          ) : (
            <Text style={collabSheetStyles.introText}>No report data available.</Text>
          )}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}
