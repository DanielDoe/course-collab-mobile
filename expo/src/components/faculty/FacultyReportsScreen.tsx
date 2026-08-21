import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import {
  dateRangeForPreset,
  filterReportTemplates,
  filterSavedReports,
  filterSavedReportsByDateRange,
  isLocalInstructorReport,
  REPORT_DATE_PRESETS,
  type DateRangePreset,
  type ReportTemplateConfig,
  type SavedInstructorReport,
} from "../../lib/instructor-reports-utils"
import { FACULTY_REPORTS_COLOR } from "../../lib/faculty-reports-theme"
import {
  FacultyReportSavedCard,
  FacultyReportStudentHitCard,
  FacultyReportTemplateCard,
} from "./FacultyReportsListCards"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyStickyHeaderScrollLayout, FacultyAdaptiveSegmentNav, FacultyModuleStickyHeader, FacultySearchToolbar } from "./faculty-module-shell"
import { FacultyReportDetailSheet } from "./FacultyReportDetailSheet"
import { FacultyReportGenerateSheet } from "./FacultyReportGenerateSheet"
import { FacultyStudentReportSheet } from "./FacultyStudentReportSheet"
import { useModuleTheme } from "../../lib/themed-module-shell"

type ReportsTab = "templates" | "generated"

export function FacultyReportsScreen() {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [tab, setTab] = useState<ReportsTab>("templates")
  const [search, setSearch] = useState("")
  const [datePreset, setDatePreset] = useState<DateRangePreset>("all")
  const [savedReports, setSavedReports] = useState<SavedInstructorReport[]>([])
  const [localReports, setLocalReports] = useState<SavedInstructorReport[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const [generateTemplate, setGenerateTemplate] = useState<ReportTemplateConfig | null>(null)
  const [selectedReport, setSelectedReport] = useState<SavedInstructorReport | null>(null)

  const [studentHits, setStudentHits] = useState<
    Array<{ id: number; fullName: string; email: string; section: string | null }>
  >([])
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [studentReportId, setStudentReportId] = useState<number | null>(null)

  const dateRange = useMemo(() => dateRangeForPreset(datePreset), [datePreset])

  const loadSaved = useCallback(async () => {
    if (!scope) return
    setError("")
    const reports = await instructorApi.getSavedInstructorReports(scope)
    setSavedReports(reports)
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    loadSaved()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load reports."))
      .finally(() => setLoading(false))
  }, [ready, loadSaved])

  const searchPlaceholder = useMemo(() => {
    if (selectedReport) return "Search report rows…"
    if (studentReportId != null) return "Search attempts…"
    if (tab === "templates") return "Search templates or students…"
    return "Search saved reports…"
  }, [selectedReport, studentReportId, tab])

  useEffect(() => {
    const q = search.trim()
    if (!scope || tab !== "templates" || selectedReport || studentReportId != null || q.length < 2) {
      setStudentHits([])
      return
    }
    const timer = setTimeout(() => {
      setStudentSearchLoading(true)
      instructorApi
        .searchInstructorReportStudents(scope, q)
        .then(setStudentHits)
        .catch(() => setStudentHits([]))
        .finally(() => setStudentSearchLoading(false))
    }, 320)
    return () => clearTimeout(timer)
  }, [scope, search, tab, selectedReport, studentReportId])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await loadSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }

  const filteredTemplates = useMemo(() => filterReportTemplates(search), [search])
  const filteredSaved = useMemo(() => {
    const merged = [...localReports, ...savedReports]
    const inRange = filterSavedReportsByDateRange(merged, dateRange)
    return filterSavedReports(inRange, search)
  }, [localReports, savedReports, search, dateRange])

  if (!ready) {
    return (
      <View style={moduleStyles.center}>
        <FacultyEmptyState
          icon="document-attach-outline"
          title="Select a course"
          body="Course reports require an active course."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader>
        <FacultyAdaptiveSegmentNav
          tabs={[
            { id: "templates", label: "Templates" },
            { id: "generated", label: "Generated" },
          ]}
          tab={tab}
          onChange={setTab}
        />
        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          showFilter={false}
        />
      </FacultyModuleStickyHeader>

      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_REPORTS_COLOR.link} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={moduleStyles.errorBox}>
            <Text style={moduleStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.dateRow}>
          {REPORT_DATE_PRESETS.map((preset) => {
            const active = datePreset === preset.id
            return (
              <Pressable
                key={preset.id}
                style={({ pressed }) => [
                  styles.dateChip,
                  {
                    backgroundColor: native.fill,
                    borderColor: active ? FACULTY_REPORTS_COLOR.link : native.separator,
                  },
                  pressed && { opacity: NATIVE.pressedOpacity },
                ]}
                android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                onPress={() => setDatePreset(preset.id)}
              >
                <Text
                  style={[
                    type.caption,
                    { fontWeight: "600", color: active ? FACULTY_REPORTS_COLOR.link : native.secondaryLabel },
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {tab === "templates" ? (
          <>
            {search.trim().length >= 2 ? (
              <View style={styles.sectionBlock}>
                <Text style={[type.sectionHeader, { color: native.label, paddingHorizontal: 4 }]}>
                  Individual student
                </Text>
                {studentSearchLoading ? (
                  <ActivityIndicator color={FACULTY_REPORTS_COLOR.link} style={{ marginTop: 8 }} />
                ) : studentHits.length > 0 ? (
                  <View style={styles.cardList}>
                    {studentHits.map((student) => (
                      <FacultyReportStudentHitCard
                        key={student.id}
                        student={student}
                        onPress={() => setStudentReportId(student.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={[type.caption, { color: native.tertiaryLabel, fontWeight: "600", paddingHorizontal: 4 }]}>
                    No students match that search.
                  </Text>
                )}
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={FACULTY_REPORTS_COLOR.link} />
              </View>
            ) : filteredTemplates.length === 0 ? (
              <FacultyEmptyState icon="document-attach-outline" title="No matching templates" body="Try another search term." />
            ) : (
              <View style={styles.sectionBlock}>
                <Text style={[type.sectionHeader, { color: native.label, paddingHorizontal: 4 }]}>Report templates</Text>
                <View style={styles.cardList}>
                  {filteredTemplates.map((template) => (
                    <FacultyReportTemplateCard
                      key={template.id}
                      template={template}
                      onPress={() => setGenerateTemplate(template)}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        ) : loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={FACULTY_REPORTS_COLOR.link} />
          </View>
        ) : filteredSaved.length === 0 ? (
          <FacultyEmptyState
            icon="folder-open-outline"
            title={savedReports.length === 0 && localReports.length === 0 ? "No generated reports yet" : "No matches"}
            body={
              savedReports.length === 0 && localReports.length === 0
                ? "Generate a report from Templates — it will appear here for export and review."
                : datePreset !== "all"
                  ? "No saved reports in this date range. Try All time or generate a new report."
                  : "Try another search term."
            }
          />
        ) : (
          <View style={styles.sectionBlock}>
            <Text style={[type.sectionHeader, { color: native.label, paddingHorizontal: 4 }]}>Saved reports</Text>
            <View style={styles.cardList}>
              {filteredSaved.map((report) => (
                <FacultyReportSavedCard
                  key={report.id}
                  report={report}
                  onPress={() => setSelectedReport(report)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <FacultyReportGenerateSheet
        visible={generateTemplate != null}
        scope={scope}
        template={generateTemplate}
        dateRange={dateRange}
        onClose={() => setGenerateTemplate(null)}
        onComplete={(report, synced) => {
          if (!synced) {
            setLocalReports((prev) => [report, ...prev.filter((item) => item.id !== report.id)])
          } else {
            setLocalReports((prev) => prev.filter((item) => item.id !== report.id))
            void loadSaved()
          }
          setSelectedReport(report)
          setTab("generated")
        }}
      />

      <FacultyReportDetailSheet
        visible={selectedReport != null}
        scope={scope}
        report={selectedReport}
        rowSearch={search}
        onClose={() => setSelectedReport(null)}
        onDeleted={() => {
          if (selectedReport && isLocalInstructorReport(selectedReport)) {
            setLocalReports((prev) => prev.filter((item) => item.id !== selectedReport.id))
          } else {
            void loadSaved()
          }
        }}
      />

      <FacultyStudentReportSheet
        visible={studentReportId != null}
        scope={scope}
        studentId={studentReportId}
        attemptSearch={search}
        onClose={() => setStudentReportId(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  dateRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionBlock: { gap: 8 },
  cardList: { gap: 12 },
})
