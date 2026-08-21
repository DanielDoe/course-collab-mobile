import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { AppAlert } from "../../lib/app-alert"
import { instructorApi } from "../../lib/instructor-api"
import {
  getReportTemplate,
  type ReportDateRange,
  type ReportTemplateConfig,
  type SavedInstructorReport,
} from "../../lib/instructor-reports-utils"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetHero,
  FacultySheetOutlineButton,
  FacultySheetSection,
  FacultySheetSubmitButton
} from "./faculty-collab-sheet-ui"
import { FacultySummerCampDatePicker } from "./FacultySummerCampDatePicker"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { FacultyStatusPill } from "./faculty-shared"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  template: ReportTemplateConfig | null
  dateRange: ReportDateRange
  onClose: () => void
  onComplete: (report: SavedInstructorReport, synced: boolean) => void
}

function useReportGenerateStyles() {
  const { native, tokens, type } = useModuleTheme()
  return useMemo(
    () =>
      StyleSheet.create({
        runningBox: { alignItems: "center", gap: 10, paddingVertical: 16 },
        runningText: { textAlign: "center", ...type.caption, color: native.secondaryLabel, fontWeight: "600" },
        hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 4 },
        hintText: { flex: 1, fontSize: 12, fontWeight: "600", color: native.tertiaryLabel, lineHeight: 17 },
      }),
    [native, tokens, type],
  )
}

export function FacultyReportGenerateSheet({
  visible,
  scope,
  template,
  dateRange,
  onClose,
  onComplete}: Props) {
  useSuppressModuleSearchDock(visible)
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens } = useModuleTheme()
  const styles = useReportGenerateStyles()
  const insets = useSafeAreaInsets()
  const [startDate, setStartDate] = useState(dateRange.startDate ?? "")
  const [endDate, setEndDate] = useState(dateRange.endDate ?? "")
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!visible) return
    setStartDate(dateRange.startDate ?? "")
    setEndDate(dateRange.endDate ?? "")
    setError("")
  }, [visible, dateRange.startDate, dateRange.endDate])

  if (!visible || !template) return null

  const cfg = getReportTemplate(template.id)

  async function handleGenerate() {
    if (!scope || !template) return
    setRunning(true)
    setError("")
    const filters = {
      startDate: startDate.trim() || undefined,
      endDate: endDate.trim() || undefined,
    }

    try {
      let data: Record<string, unknown>[] = []
      let metadata: Record<string, unknown> = {}

      if (template.specialEndpoint === "anti-cheat") {
        const res = await instructorApi.getAntiCheatReports(scope, filters)
        data = res.data ?? []
        metadata = { ...(res.metadata ?? {}), fullReport: res }
      } else if (template.specialEndpoint === "observability") {
        const res = await instructorApi.getObservabilityLogs(scope, { ...filters, limit: 200 })
        const logs = res.logs ?? []
        data = logs.map((log) => ({
          timestamp: log.timestamp,
          module: log.module,
          sub_module: log.sub_module,
          event_type: log.event_type,
          status: log.status,
          student: log.student_name ?? "—",
          student_id: log.student_number ?? "—",
        }))
        metadata = { stats: res.stats, pagination: res.pagination, fullLogs: logs }
      } else {
        const generated = await instructorApi.generateInstructorReport(scope, {
          reportType: template.id,
          filters,
        })
        if (!generated.data) throw new ApiError("No report data returned", 400)
        data = generated.data
        metadata = generated.metadata ?? {}
      }

      const title = `${template.label} (${data.length} records)`
      const generatedAt = new Date().toISOString()
      let report: SavedInstructorReport = {
        id: -Date.now(),
        type: template.id,
        title,
        data,
        metadata,
        filters: { type: template.id, ...filters },
        generatedAt,
        createdAt: generatedAt,
      }

      try {
        const saveRes = await instructorApi.saveInstructorReport(scope, {
          reportType: template.id,
          title,
          data,
          metadata,
          filters: { type: template.id, ...filters },
        })
        if (saveRes.success && saveRes.reportId != null) {
          report = {
            ...report,
            id: saveRes.reportId,
            createdAt: saveRes.createdAt ?? generatedAt,
          }
          AppAlert.alert(
            "Report saved",
            `${template.label} (${data.length} record${data.length === 1 ? "" : "s"}) is now in Generated reports.`,
          )
          onComplete(report, true)
        } else {
          AppAlert.alert(
            "Export ready",
            `${template.label} was generated on this device. Cloud save is unavailable right now — you can still export PDF or CSV from Generated reports.`,
          )
          onComplete(report, false)
        }
      } catch {
        AppAlert.alert(
          "Export ready",
          `${template.label} was generated on this device. Cloud save is unavailable right now — you can still export PDF or CSV from Generated reports.`,
        )
        onComplete(report, false)
      }
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate report.")
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Generate report" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={template.label}
            subtitle={template.description}
            icon={template.icon}
            pills={
              <>
                <FacultyStatusPill label={template.category} tone="neutral" />
                {template.specialEndpoint ? (
                  <FacultyStatusPill label="Live data" tone="neutral" />
                ) : null}
              </>
            }
          />

          <Text style={collabSheetStyles.introText}>
            Generates and saves a snapshot to Generated reports — same workflow as the web instructor portal.
          </Text>

          <FacultySheetSection label="Date range" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Start date">
              <FacultySummerCampDatePicker
                value={startDate}
                onChange={setStartDate}
                accessibilityLabel="Start date"
              />
            </FacultySheetField>
            <FacultySheetField label="End date">
              <FacultySummerCampDatePicker
                value={endDate}
                onChange={setEndDate}
                accessibilityLabel="End date"
              />
            </FacultySheetField>
          </FacultySheetSection>

          {error ? <FacultySheetErrorBanner message={error} /> : null}

          <FacultySheetSection label="Actions" tone={SHEET_SECTION.highlight}>
            {running ? (
              <View style={styles.runningBox}>
                <ActivityIndicator color={FACULTY_SHEET_COLOR.link} />
                <Text style={styles.runningText}>Generating report…</Text>
              </View>
            ) : (
              <>
                <FacultySheetSubmitButton
                  label={`Generate ${cfg?.label ?? "report"}`}
                  onPress={() => void handleGenerate()}
                />
                <FacultySheetOutlineButton icon="close-outline" label="Cancel" onPress={onClose} />
              </>
            )}
          </FacultySheetSection>

          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={16} color={native.tertiaryLabel} />
            <Text style={styles.hintText}>
              Date presets on the main screen pre-fill this range. After saving, open the report from Generated to search rows and export PDF or CSV.
            </Text>
          </View>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}
