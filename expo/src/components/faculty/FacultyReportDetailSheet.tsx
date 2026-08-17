import { useMemo, useState } from "react"
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import {
  filterReportDataRows,
  formatReportCellValue,
  formatReportColumnLabel,
  getReportTableColumns,
  isLocalInstructorReport,
  reportRecordCount,
  reportTypeLabel,
  shareReportCsv,
  type SavedInstructorReport,
} from "../../lib/instructor-reports-utils"
import { shareReportPdf } from "../../lib/instructor-report-pdf"
import { formatFacultyRelativeTime } from "../../lib/instructor-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetOutlineButton,
  FacultySheetSection,
  FacultySheetSubmitButton,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { ModuleFlashList } from "../ModuleFlashList"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  report: SavedInstructorReport | null
  rowSearch: string
  onClose: () => void
  onDeleted: () => void
}

const CELL_WIDTH = 108

export function FacultyReportDetailSheet({ visible, scope, report, rowSearch, onClose, onDeleted }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [acting, setActing] = useState<"csv" | "pdf" | "delete" | null>(null)
  const [error, setError] = useState("")

  const columns = useMemo(() => getReportTableColumns(report?.data ?? []), [report])
  const filteredRows = useMemo(
    () => filterReportDataRows(report?.data ?? [], rowSearch),
    [report, rowSearch],
  )

  if (!report) return null

  const when = report.createdAt ?? report.generatedAt
  const recordCount = reportRecordCount(report)
  const tableWidth = Math.max(columns.length * CELL_WIDTH, 320)

  async function handleExportCsv() {
    setActing("csv")
    setError("")
    try {
      await shareReportCsv(report!)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export CSV.")
    } finally {
      setActing(null)
    }
  }

  async function handleExportPdf() {
    setActing("pdf")
    setError("")
    try {
      await shareReportPdf(report!)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export PDF.")
    } finally {
      setActing(null)
    }
  }

  function confirmDelete() {
    AppAlert.alert(
      "Delete report?",
      "This removes the saved snapshot. You can generate it again from Templates.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void handleDelete() },
      ],
    )
  }

  async function handleDelete() {
    if (!report) return
    setActing("delete")
    setError("")
    try {
      if (isLocalInstructorReport(report)) {
        onDeleted()
        onClose()
        return
      }
      if (!scope) return
      const res = await instructorApi.deleteSavedInstructorReport(scope, report.id)
      if (!res.success) throw new ApiError(res.error ?? "Delete failed", 400)
      onDeleted()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete report.")
    } finally {
      setActing(null)
    }
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <FacultySheetHero
        title={report.title}
        subtitle={reportTypeLabel(report.type)}
        icon="document-text-outline"
        pills={
          <>
            <FacultyStatusPill label={`${recordCount} records`} tone="neutral" />
            {when ? <FacultyStatusPill label={formatFacultyRelativeTime(when)} tone="neutral" /> : null}
          </>
        }
      />

      <FacultySheetSection label="Summary" tone={SHEET_SECTION.highlight}>
        <FacultySheetGroupedList>
          <FacultySheetMetricRow icon="layers-outline" label="Type" value={reportTypeLabel(report.type)} />
          <FacultySheetMetricRow icon="albums-outline" label="Records" value={String(recordCount)} />
          <FacultySheetMetricRow
            icon="time-outline"
            label="Saved"
            value={when ? formatFacultyRelativeTime(when) : "—"}
            isLast
          />
        </FacultySheetGroupedList>
      </FacultySheetSection>

      {recordCount > 0 ? (
        <FacultySheetSection
          label="Report rows"
          hint={
            rowSearch.trim()
              ? `Showing ${filteredRows.length} of ${recordCount} rows · swipe sideways for columns`
              : `${recordCount} row${recordCount === 1 ? "" : "s"} · use bottom search to filter · swipe sideways for columns`
          }
          tone={SHEET_SECTION.tools}
        >
          <Text style={collabSheetStyles.introText}>Scroll the table below to browse and export rows.</Text>
        </FacultySheetSection>
      ) : (
        <FacultySheetSection label="Report rows" tone={SHEET_SECTION.tools}>
          <Text style={collabSheetStyles.introText}>No tabular rows in this saved report.</Text>
        </FacultySheetSection>
      )}
    </View>
  )

  const exportFooter = (
    <View style={[styles.footerBlock, { paddingBottom: insets.bottom + 16 }]}>
      {error ? <FacultySheetErrorBanner message={error} /> : null}
      <FacultySheetSection label="Export" tone={SHEET_SECTION.workflow}>
        {acting ? (
          <ActivityIndicator color={FACULTY_SHEET_COLOR.link} style={{ marginVertical: 12 }} />
        ) : (
          <>
            <FacultySheetSubmitButton
              label="Export PDF"
              onPress={() => void handleExportPdf()}
              disabled={recordCount === 0}
            />
            <FacultySheetActionRow
              icon="download-outline"
              label="Export CSV"
              subtitle="Spreadsheet-friendly export"
              onPress={() => void handleExportCsv()}
              disabled={recordCount === 0}
            />
            <FacultySheetOutlineButton icon="trash-outline" label="Delete report" onPress={confirmDelete} />
          </>
        )}
      </FacultySheetSection>
    </View>
  )

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Report details" onClose={onClose} />

        {recordCount > 0 ? (
          <View style={styles.body}>
            {listHeader}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
              <View style={{ width: tableWidth, flex: 1 }}>
                <View style={[styles.tableHead, { borderColor: native.separator, backgroundColor: native.fill }]}>
                  {columns.map((col) => (
                    <View key={col} style={[styles.cell, { width: CELL_WIDTH }]}>
                      <Text style={[type.caption, styles.headCell, { color: native.secondaryLabel }]} numberOfLines={2}>
                        {formatReportColumnLabel(col)}
                      </Text>
                    </View>
                  ))}
                </View>
                <ModuleFlashList
                  data={filteredRows}
                  keyExtractor={(_, index) => String(index)}
                  ListEmptyComponent={
                    <View style={styles.emptyRows}>
                      <Text style={[type.secondary, { color: native.secondaryLabel, textAlign: "center" }]}>
                        No rows match your search.
                      </Text>
                    </View>
                  }
                  renderItem={({ item, index }) => (
                    <View
                      style={[
                        styles.tableRow,
                        {
                          borderColor: native.separator,
                          backgroundColor: index % 2 === 0 ? native.secondaryGrouped : native.groupedBackground,
                        },
                      ]}
                    >
                      {columns.map((col) => (
                        <View key={col} style={[styles.cell, { width: CELL_WIDTH }]}>
                          <Text style={[type.caption, styles.bodyCell, { color: native.label }]} numberOfLines={3}>
                            {formatReportCellValue(item[col])}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                />
              </View>
            </ScrollView>
            {exportFooter}
          </View>
        ) : (
          <View style={{ paddingBottom: insets.bottom + 24 }}>
            {listHeader}
            {exportFooter}
          </View>
        )}
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  headerBlock: { gap: 0, paddingHorizontal: 16 },
  footerBlock: { paddingHorizontal: 16 },
  tableHead: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: NATIVE.sectionRadius,
    borderTopRightRadius: NATIVE.sectionRadius,
    marginTop: 10,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(128,128,128,0.18)",
  },
  headCell: { fontWeight: "700", lineHeight: 16 },
  bodyCell: { lineHeight: 17, fontWeight: "600" },
  emptyRows: { paddingVertical: 24, paddingHorizontal: 16 },
  tableScroll: { flex: 1 },
})
