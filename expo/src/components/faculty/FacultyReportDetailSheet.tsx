import { useMemo, useState } from "react"
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { NATIVE } from "../../constants/faculty-native-theme"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import {
  reportRecordCount,
  reportTypeLabel,
  shareReportCsv,
  type SavedInstructorReport} from "../../lib/instructor-reports-utils"
import { formatFacultyRelativeTime } from "../../lib/instructor-api"
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
  FacultySheetOutlineButton,
  FacultySheetSection,
  FacultySheetSubmitButton
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  report: SavedInstructorReport | null
  onClose: () => void
  onDeleted: () => void
}

const PREVIEW_ROWS = 8

function useReportDetailStyles() {
  const { native, type } = useModuleTheme()
  return useMemo(
    () =>
      StyleSheet.create({
        table: {
          borderRadius: NATIVE.sectionRadius,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          backgroundColor: native.secondaryGrouped,
        },
        tableHead: {
          flexDirection: "row",
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
        },
        tableHeadCell: {
          flex: 1,
          paddingHorizontal: 8,
          paddingVertical: 8,
          fontSize: 11,
          fontWeight: NATIVE.titleWeight,
          color: native.secondaryLabel,
        },
        tableRow: {
          flexDirection: "row",
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
        },
        tableRowLast: { borderBottomWidth: 0 },
        tableCell: {
          flex: 1,
          paddingHorizontal: 8,
          paddingVertical: 10,
          fontSize: 12,
          fontWeight: "600",
          color: native.label,
        },
        previewHint: {
          marginTop: 8,
          fontSize: 12,
          fontWeight: "600",
          color: native.tertiaryLabel,
          lineHeight: 17,
        },
      }),
    [native, type],
  )
}

export function FacultyReportDetailSheet({ visible, scope, report, onClose, onDeleted }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { tokens } = useModuleTheme()
  const styles = useReportDetailStyles()
  const insets = useSafeAreaInsets()
  const [acting, setActing] = useState(false)
  const [error, setError] = useState("")

  const preview = useMemo(() => {
    if (!report?.data?.length) return { columns: [] as string[], rows: [] as Record<string, unknown>[] }
    const columns = Object.keys(report.data[0] ?? {}).slice(0, 5)
    return { columns, rows: report.data.slice(0, PREVIEW_ROWS) }
  }, [report])

  if (!report) return null

  async function handleExport() {
    setActing(true)
    setError("")
    try {
      await shareReportCsv(report!)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export report.")
    } finally {
      setActing(false)
    }
  }

  function confirmDelete() {
    AppAlert.alert(
      "Delete report?",
      "This removes the saved snapshot. You can generate it again from Templates.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void handleDelete()},
      ],
    )
  }

  async function handleDelete() {
    if (!scope || !report) return
    setActing(true)
    setError("")
    try {
      const res = await instructorApi.deleteSavedInstructorReport(scope, report.id)
      if (!res.success) throw new ApiError(res.error ?? "Delete failed", 400)
      onDeleted()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete report.")
    } finally {
      setActing(false)
    }
  }

  const when = report.createdAt ?? report.generatedAt

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Report details" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={report.title}
            subtitle={reportTypeLabel(report.type)}
            icon="document-text-outline"
            pills={
              <>
                <FacultyStatusPill label={`${reportRecordCount(report)} records`} tone="neutral" />
                {when ? (
                  <FacultyStatusPill label={formatFacultyRelativeTime(when)} tone="neutral" />
                ) : null}
              </>
            }
          />

          <FacultySheetSection label="Summary" tone={SHEET_SECTION.highlight}>
            <FacultySheetGroupedList>
              <FacultySheetMetricRow icon="layers-outline" label="Type" value={reportTypeLabel(report.type)} />
              <FacultySheetMetricRow
                icon="albums-outline"
                label="Records"
                value={String(reportRecordCount(report))}
              />
              <FacultySheetMetricRow
                icon="time-outline"
                label="Saved"
                value={when ? formatFacultyRelativeTime(when) : "—"}
                isLast
              />
            </FacultySheetGroupedList>
          </FacultySheetSection>

          {preview.rows.length > 0 ? (
            <FacultySheetSection label="Preview" tone={SHEET_SECTION.tools}>
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  {preview.columns.map((col) => (
                    <Text key={col} style={styles.tableHeadCell} numberOfLines={1}>
                      {col}
                    </Text>
                  ))}
                </View>
                {preview.rows.map((row, index) => (
                  <View
                    key={`row-${index}`}
                    style={[styles.tableRow, index === preview.rows.length - 1 && styles.tableRowLast]}
                  >
                    {preview.columns.map((col) => (
                      <Text key={`${index}-${col}`} style={styles.tableCell} numberOfLines={2}>
                        {String(row[col] ?? "—")}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
              {reportRecordCount(report) > PREVIEW_ROWS ? (
                <Text style={styles.previewHint}>
                  Showing {PREVIEW_ROWS} of {reportRecordCount(report)} rows. Export CSV for the full report.
                </Text>
              ) : null}
            </FacultySheetSection>
          ) : (
            <FacultySheetSection label="Preview" tone={SHEET_SECTION.tools}>
              <Text style={collabSheetStyles.introText}>No tabular rows in this saved report.</Text>
            </FacultySheetSection>
          )}

          {error ? <FacultySheetErrorBanner message={error} /> : null}

          <FacultySheetSection label="Actions" tone={SHEET_SECTION.workflow}>
            {acting ? (
              <ActivityIndicator color={FACULTY_SHEET_COLOR.link} style={{ marginVertical: 12 }} />
            ) : (
              <>
                <FacultySheetSubmitButton
                  label="Export CSV"
                  onPress={() => void handleExport()}
                  disabled={reportRecordCount(report) === 0}
                />
                <FacultySheetOutlineButton icon="trash-outline" label="Delete report" onPress={confirmDelete} />
              </>
            )}
          </FacultySheetSection>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}
