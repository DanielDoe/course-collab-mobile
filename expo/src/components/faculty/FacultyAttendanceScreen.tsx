import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import {
  ATTENDANCE_STATUS_OPTIONS,
  attendanceStatusOption,
  type AttendanceStatus,
  type AttendanceTab,
  attendanceStatusLabel,
  computeTrendInsight,
  filterRecords,
  filterFacultyAttendanceStandings,
  filterMeetingsBySearch,
  filterRosterStudents,
  filterSessionsBySection,
  formatAttendancePct,
  rankFacultyAttendanceStandings,
  formatMeetingDay,
  formatMeetingTimeRange,
  meetingStatusBadge,
  pickDefaultMeetingSession,
  resolveRosterSection,
  rosterFromAttendanceRecords,
  sanitizeFacultyAttendanceAnalytics,
  STATUS_COLORS,
} from "../../lib/faculty-attendance-utils"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type AttendanceAnalytics,
  type AttendanceRecord,
  type AttendanceRosterStudent,
  type AttendanceSession,
  type AttendanceStudentSummary,
  type InstructorSession,
} from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  FACULTY_ATTENDANCE_COLOR,
  facultyAttendanceMeetingStatusMeta,
  facultyAttendanceMeetingThumb,
  facultyAttendanceStatusColor,
  facultyAttendanceStatusIcon,
  facultyAttendanceStudentThumb,
} from "../../lib/faculty-attendance-theme"
import { semanticSoft } from "../../lib/themed-module-theme"
import { FacultyAttendanceLeaderboard } from "./FacultyAttendanceLeaderboard"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { ModuleFlashList } from "../ModuleFlashList"
import { FACULTY_SHEET_CHIP_RADIUS } from "./faculty-collab-sheet-ui"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { useFacultyStickyHeaderScrollLayout,
  FacultyFilterSheet,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  sectionFilterSheetOptions,
  resolveSessionFilterCode,
} from "./faculty-module-shell"

const MAIN_TABS: Array<{ id: AttendanceTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "overview", label: "Overview", icon: "grid-outline" },
  { id: "roll", label: "Roll call", icon: "people-outline" },
  { id: "meetings", label: "Meetings", icon: "calendar-outline" },
  { id: "log", label: "Log", icon: "list-outline" },
  { id: "leaderboard", label: "Leaderboard", icon: "trophy-outline" },
]

function useAttendanceTheme() {
  const theme = useModuleTheme()
  const { native, tokens, type, styles: moduleStyles, cardShadow } = theme
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1 },
        rollListHost: { flex: 1 },
        rollTrendBanner: { marginHorizontal: 16, marginBottom: 4 },
        content: { padding: 16, gap: 14 },
        center: { flex: 1, justifyContent: "center", padding: 24 },
        section: { gap: 12 },
        loadingBox: { paddingVertical: 48, alignItems: "center" },
        error: {
          fontSize: 13,
          fontWeight: "600",
          color: tokens.danger,
          backgroundColor: `${tokens.danger}14`,
          borderRadius: 10,
          padding: 12,
        },
        improveBanner: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
        },
        improveIcon: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: native.secondaryGrouped,
          alignItems: "center",
          justifyContent: "center",
        },
        improveCopy: { flex: 1, gap: 2 },
        improveTitle: { fontSize: 14, fontWeight: NATIVE.titleWeight },
        improveSub: { fontSize: 12, fontWeight: "600", lineHeight: 17, opacity: 0.9 },
        improveArrow: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
        },
        liveCard: {
          borderRadius: NATIVE.sectionRadius,
          padding: 16,
          gap: 8,
          borderWidth: 1,
          borderColor: `${FACULTY_ATTENDANCE_COLOR.meeting}33`,
          backgroundColor: native.secondaryGrouped,
          ...cardShadow,
        },
        liveHead: { flexDirection: "row", alignItems: "center", gap: 8 },
        livePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: FACULTY_ATTENDANCE_COLOR.live },
        liveTitle: { fontSize: 14, fontWeight: NATIVE.titleWeight, color: native.label },
        liveMeeting: { fontSize: 15, fontWeight: "700", color: native.label },
        liveMeta: { fontSize: 12, fontWeight: "600", color: native.tertiaryLabel },
        fallbackRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 4,
          padding: 10,
          borderRadius: 10,
          backgroundColor: native.fill,
        },
        fallbackLabel: { fontSize: 12, fontWeight: "700", color: native.tertiaryLabel },
        fallbackCode: { flex: 1, fontSize: 16, fontWeight: "600", color: FACULTY_ATTENDANCE_COLOR.link, letterSpacing: 2 },
        liveHint: { fontSize: 11, color: native.secondaryLabel, fontWeight: "600" },
        quickRow: { flexDirection: "row", gap: 10 },
        quickAction: {
          flex: 1,
          borderRadius: NATIVE.sectionRadius,
          padding: 14,
          gap: 6,
          backgroundColor: native.secondaryGrouped,
          ...cardShadow,
        },
        quickIcon: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: semanticSoft(FACULTY_ATTENDANCE_COLOR.meeting, tokens.isDark),
          alignItems: "center",
          justifyContent: "center",
        },
        quickLabel: { fontSize: 14, fontWeight: NATIVE.titleWeight, color: native.label },
        quickHint: { fontSize: 11, fontWeight: "600", color: native.tertiaryLabel },
        panel: {
          borderRadius: NATIVE.sectionRadius,
          padding: 14,
          gap: 10,
          backgroundColor: native.secondaryGrouped,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tokens.border,
        },
        panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        panelTitle: { fontSize: 15, fontWeight: NATIVE.titleWeight, color: native.label },
        markedBadge: {
          backgroundColor: `${tokens.success}18`,
          borderRadius: NATIVE.sectionRadius,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: `${tokens.success}33`,
        },
        markedBadgeText: { fontSize: 11, fontWeight: NATIVE.titleWeight, color: tokens.success },
        meetingCarouselRow: { flexDirection: "row", alignItems: "center", gap: 4 },
        carouselArrow: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
        },
        carouselArrowDisabled: { opacity: 0.5 },
        meetingMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
        meetingMetaText: { flex: 1, fontSize: 12, fontWeight: "600", color: native.secondaryLabel },
        meetingMetaAccent: { color: FACULTY_ATTENDANCE_COLOR.link, fontWeight: "700" },
        logLink: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderRadius: NATIVE.sectionRadius,
          padding: 12,
          backgroundColor: native.secondaryGrouped,
          ...cardShadow,
        },
        logLinkText: { flex: 1, fontSize: 14, fontWeight: "700", color: native.label },
        logStatusChip: {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: 8,
          backgroundColor: native.secondaryGrouped,
          borderRadius: NATIVE.sectionRadius,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        logStatusChipText: { fontSize: 13, fontWeight: "700", color: native.label },
        barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        barLabel: { width: 72, fontSize: 11, fontWeight: "700", color: native.secondaryLabel },
        barTrack: {
          flex: 1,
          height: 8,
          borderRadius: 999,
          overflow: "hidden",
          backgroundColor: native.fill,
        },
        barFill: { height: "100%", borderRadius: 999 },
        barValue: { width: 28, fontSize: 12, fontWeight: NATIVE.titleWeight, color: native.label, textAlign: "right" },
        splitRow: { gap: 10 },
        insightPanel: {
          flex: 1,
          borderRadius: NATIVE.sectionRadius,
          padding: 14,
          gap: 8,
          minWidth: 0,
          backgroundColor: native.secondaryGrouped,
          ...cardShadow,
        },
        insightRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
        rankBadge: {
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: native.fill,
        },
        rankBadgeGold: { backgroundColor: `${tokens.warning}22` },
        rankText: { fontSize: 11, fontWeight: NATIVE.titleWeight, color: native.label },
        rankDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: native.separator, marginHorizontal: 8 },
        insightCopy: { flex: 1, minWidth: 0 },
        insightName: { fontSize: 13, fontWeight: "700", color: native.label },
        insightMeta: { fontSize: 11, fontWeight: "600", color: native.tertiaryLabel },
        trendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 6, height: 120 },
        trendCol: { flex: 1, alignItems: "center", gap: 4 },
        trendBarWrap: {
          width: "100%",
          height: 72,
          justifyContent: "flex-end",
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: native.fill,
        },
        trendBar: { width: "100%", backgroundColor: FACULTY_ATTENDANCE_COLOR.trend, borderRadius: 8 },
        trendPct: { fontSize: 11, fontWeight: NATIVE.titleWeight, color: native.label },
        trendWeek: { fontSize: 9, fontWeight: "600", color: native.tertiaryLabel },
        hint: { fontSize: 12, lineHeight: 18, color: native.secondaryLabel, fontWeight: "600" },
        meetingPicker: { flexDirection: "row", gap: 8, paddingVertical: 4, flexGrow: 1 },
        meetingChip: {
          width: 148,
          padding: 12,
          borderRadius: 12,
          backgroundColor: native.fill,
          borderWidth: 1.5,
          borderColor: native.separator,
          gap: 4,
        },
        meetingChipActive: {
          backgroundColor: semanticSoft(FACULTY_ATTENDANCE_COLOR.link, tokens.isDark),
          borderColor: FACULTY_ATTENDANCE_COLOR.link,
        },
        meetingChipDay: { fontSize: 12, fontWeight: NATIVE.titleWeight, color: native.label },
        meetingChipDayActive: { color: FACULTY_ATTENDANCE_COLOR.link },
        meetingChipSub: { fontSize: 11, fontWeight: "600", color: native.tertiaryLabel },
        meetingChipSubActive: { color: native.label },
        markRow: { flexDirection: "row", gap: 6 },
        markBtn: {
          flex: 1,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          paddingVertical: 10,
          alignItems: "center",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        markBtnText: { fontSize: 13, fontWeight: "600" },
        markBtnSm: {
          flex: 1,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          paddingVertical: 8,
          alignItems: "center",
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        markBtnSmText: { fontSize: 12, fontWeight: NATIVE.titleWeight, color: native.secondaryLabel },
        rollNotice: {
          fontSize: 12,
          fontWeight: "600",
          color: FACULTY_ATTENDANCE_COLOR.marked,
          backgroundColor: semanticSoft(FACULTY_ATTENDANCE_COLOR.marked, tokens.isDark),
          padding: 10,
          borderRadius: NATIVE.sectionRadius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: `${FACULTY_ATTENDANCE_COLOR.marked}33`,
        },
        meetingActions: {
          flexDirection: "row",
          gap: 8,
          paddingTop: 2,
        },
        meetingActionBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: 10,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        meetingActionText: { fontSize: 12, fontWeight: "700", color: native.label },
      }),
    [native, tokens, cardShadow],
  )
  return { ...theme, styles }
}

export function FacultyAttendanceScreen() {
  const { styles: moduleStyles, styles, tokens } = useAttendanceTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout({ extraBottom: 88 })
  const { scope, ready } = useFacultyScope()

  const [tab, setTab] = useState<AttendanceTab>("roll")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const [courseSessions, setCourseSessions] = useState<InstructorSession[]>([])
  const [sectionFilter, setSectionFilter] = useState("ALL")

  const scopedSectionCode = useMemo(() => {
    if (sectionFilter === "ALL") return "ALL"
    if (courseSessions.length === 0) return "ALL"
    return resolveSessionFilterCode(courseSessions, sectionFilter) ?? "ALL"
  }, [courseSessions, sectionFilter])

  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null)
  const [meetings, setMeetings] = useState<AttendanceSession[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [roster, setRoster] = useState<AttendanceRosterStudent[]>([])
  const [sessionRecords, setSessionRecords] = useState<AttendanceRecord[]>([])

  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null)
  const [sessionMarks, setSessionMarks] = useState<Record<number, AttendanceStatus>>({})
  const [markingId, setMarkingId] = useState<number | null>(null)

  const [search, setSearch] = useState("")
  const [logStatus, setLogStatus] = useState("all")
  const [configSheetOpen, setConfigSheetOpen] = useState(false)

  const filteredMeetings = useMemo(() => {
    const scoped = filterSessionsBySection(meetings, scopedSectionCode)
    if (tab !== "meetings") return scoped
    return filterMeetingsBySearch(scoped, search)
  }, [meetings, scopedSectionCode, search, tab])
  const selectedMeeting = useMemo(
    () => filteredMeetings.find((m) => m.id === selectedMeetingId) ?? null,
    [filteredMeetings, selectedMeetingId],
  )
  const activeMeeting = useMemo(
    () => filteredMeetings.find((m) => m.is_active && !m.is_cancelled) ?? null,
    [filteredMeetings],
  )
  const rosterSection = useMemo(
    () =>
      resolveRosterSection({
        sectionFilter: scopedSectionCode,
        courseSessions,
        selectedMeeting,
      }),
    [scopedSectionCode, courseSessions, selectedMeeting],
  )
  const rollCallRoster = useMemo(() => {
    const fromRecords = rosterFromAttendanceRecords(sessionRecords)
    const byId = new Map<number, AttendanceRosterStudent>()
    for (const s of roster) byId.set(s.studentId, s)
    for (const s of fromRecords) {
      if (!byId.has(s.studentId)) byId.set(s.studentId, s)
    }
    const merged = [...byId.values()].sort((a, b) => a.fullName.localeCompare(b.fullName))
    return filterRosterStudents(merged, search)
  }, [roster, sessionRecords, search])
  const filteredLog = useMemo(
    () => filterRecords(records, search, logStatus),
    [records, search, logStatus],
  )
  const rollPager = useFacultyListPager(
    rollCallRoster,
    `roll:${search}:${selectedMeetingId}:${rosterSection}`,
    "students",
  )
  const meetingsPager = useFacultyListPager(
    filteredMeetings,
    `meetings:${search}:${scopedSectionCode}`,
    "meetings",
  )
  const logPager = useFacultyListPager(filteredLog, `log:${search}:${logStatus}:${scopedSectionCode}`, "records")

  const uniqueSections = useMemo(() => {
    const seen = new Set<string>()
    return courseSessions.filter((s) => {
      const code = s.code?.trim()
      if (!code || seen.has(code)) return false
      seen.add(code)
      return true
    })
  }, [courseSessions])
  const displayAnalytics = useMemo(
    () =>
      sanitizeFacultyAttendanceAnalytics(analytics, {
        sectionCode: scopedSectionCode === "ALL" ? "ALL" : scopedSectionCode,
        courseSessionCodes: uniqueSections.map((s) => s.code),
        meetings: filteredMeetings,
        records: records,
      }),
    [analytics, scopedSectionCode, uniqueSections, filteredMeetings, records],
  )
  const standings = useMemo(
    () => rankFacultyAttendanceStandings(displayAnalytics),
    [displayAnalytics],
  )
  const filteredStandings = useMemo(
    () => filterFacultyAttendanceStandings(standings, search),
    [standings, search],
  )
  const trendInsight = useMemo(() => computeTrendInsight(displayAnalytics), [displayAnalytics])
  const trendTone = trendInsight.improving ? FACULTY_ATTENDANCE_COLOR.trend : tokens.warning

  function selectSectionScope(code: string) {
    setSectionFilter(code)
    setConfigSheetOpen(false)
  }

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const sessionsRes = await instructorApi.getSessions(scope, scope.academicTermId ?? undefined)
    const sections = sessionsRes.sessions ?? []
    setCourseSessions(sections)
    const sectionCode = resolveSessionFilterCode(sections, sectionFilter)

    const [analyticsRes, meetingsRes] = await Promise.all([
      instructorApi.getAttendanceAnalytics(scope, sectionCode),
      instructorApi.getAttendanceSessions(scope, { section: sectionCode }),
    ])
    setAnalytics(analyticsRes)
    setMeetings(meetingsRes)

    const logSections = sectionCode
      ? [sectionCode]
      : [...new Set(sections.map((s) => s.code?.trim()).filter((code): code is string => Boolean(code)))]
    if (logSections.length > 0) {
      const batches = await Promise.all(
        logSections.map((code) => instructorApi.getAttendanceRecords(scope, { section: code })),
      )
      const seen = new Set<number>()
      const merged: AttendanceRecord[] = []
      for (const batch of batches) {
        for (const record of batch) {
          if (seen.has(record.id)) continue
          seen.add(record.id)
          merged.push(record)
        }
      }
      merged.sort((a, b) => {
        const aTime = a.timestamp ? Date.parse(String(a.timestamp)) : 0
        const bTime = b.timestamp ? Date.parse(String(b.timestamp)) : 0
        return bTime - aTime
      })
      setRecords(merged)
    } else {
      setRecords([])
    }

    const scopedMeetings = filterSessionsBySection(meetingsRes, sectionCode ?? "ALL")
    const defaultMeeting = pickDefaultMeetingSession(scopedMeetings)
    setSelectedMeetingId((prev) => {
      if (prev && scopedMeetings.some((m) => m.id === prev)) return prev
      return defaultMeeting?.id ?? null
    })
  }, [scope, sectionFilter])

  useNotificationModuleRefresh("attendance", load)

  const loadRoster = useCallback(
    async (section: string) => {
      if (!scope || !section) {
        setRoster([])
        return
      }
      try {
        const rosterRes = await instructorApi.getAttendanceRoster(scope, section)
        if (rosterRes.length > 0) {
          setRoster(rosterRes)
          return
        }
      } catch {
        // Fall through to general student list.
      }
      try {
        const students = await instructorApi.getStudents(scope, section)
        if (students.length > 0) {
          setRoster(
            students.map((s) => ({
              studentId: s.id,
              fullName: s.full_name,
              studentNumber: s.student_id,
              section: s.session_code ?? s.section ?? section,
            })),
          )
          return
        }
      } catch {
        // Session records may still populate roll call.
      }
      setRoster([])
    },
    [scope],
  )

  const loadSessionMarks = useCallback(async () => {
    if (!scope || !selectedMeetingId) {
      setSessionMarks({})
      setSessionRecords([])
      return
    }
    const recordsForSession = await instructorApi.getAttendanceRecords(scope, {
      sessionId: selectedMeetingId,
    })
    setSessionRecords(recordsForSession)
    const marks: Record<number, AttendanceStatus> = {}
    for (const r of recordsForSession) {
      if (r.status === "present" || r.status === "late" || r.status === "excused" || r.status === "absent") {
        marks[r.studentId] = r.status
      }
    }
    setSessionMarks(marks)
  }, [scope, selectedMeetingId])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load attendance"))
      .finally(() => setLoading(false))
  }, [ready, load])

  useEffect(() => {
    if (selectedMeetingId) void loadSessionMarks()
  }, [selectedMeetingId, loadSessionMarks])

  useEffect(() => {
    if (!ready || !rosterSection) return
    void loadRoster(rosterSection)
  }, [ready, rosterSection, loadRoster])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
      if (rosterSection) await loadRoster(rosterSection)
      if (selectedMeetingId) await loadSessionMarks()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Refresh failed")
    } finally {
      setRefreshing(false)
    }
  }

  async function handleMark(student: AttendanceRosterStudent, status: AttendanceStatus) {
    if (!scope || !selectedMeeting) return
    if (selectedMeeting.is_cancelled) {
      AppAlert.alert("Class cancelled", "Restore this meeting before marking attendance.")
      return
    }
    setMarkingId(student.studentId)
    try {
      const current = sessionMarks[student.studentId]
      if (current === status) {
        const existing = sessionRecords.find((r) => r.studentId === student.studentId)
        if (existing) {
          await instructorApi.deleteAttendanceRecord(scope, existing.id)
          setSessionMarks((prev) => {
            const next = { ...prev }
            delete next[student.studentId]
            return next
          })
          await loadSessionMarks()
          void loadRoster(rosterSection)
        }
        return
      }
      await instructorApi.markAttendanceManual(scope, {
        sessionId: selectedMeeting.id,
        studentId: student.studentId,
        studentName: student.fullName,
        studentNumber: student.studentNumber,
        status,
      })
      setSessionMarks((prev) => ({ ...prev, [student.studentId]: status }))
      await loadSessionMarks()
      void loadRoster(rosterSection)
    } catch (err) {
      AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setMarkingId(null)
    }
  }

  async function handleToggleCancel(meeting: AttendanceSession) {
    if (!scope) return
    const cancel = !meeting.is_cancelled
    AppAlert.alert(
      cancel ? "Cancel class?" : "Restore class?",
      cancel
        ? "This meeting will be excluded from totals and QR check-in will close."
        : "Students can check in again for this meeting.",
      [
        { text: "Back", style: "cancel" },
        {
          text: cancel ? "Cancel class" : "Restore",
          style: cancel ? "destructive" : "default",
          onPress: () => {
            void (async () => {
              try {
                await instructorApi.toggleAttendanceSessionCancelled(scope, meeting.id, cancel)
                await load()
              } catch (err) {
                AppAlert.alert("Update failed", err instanceof ApiError ? err.message : "Try again.")
              }
            })()
          },
        },
      ],
    )
  }

  async function handleUpdateRecord(record: AttendanceRecord, status: AttendanceStatus) {
    if (!scope) return
    try {
      await instructorApi.updateAttendanceRecord(scope, record.id, status)
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, status, pointsEarned: undefined } : r)),
      )
      if (record.sessionId === selectedMeetingId) {
        setSessionMarks((prev) => ({ ...prev, [record.studentId]: status }))
      }
    } catch (err) {
      AppAlert.alert("Update failed", err instanceof ApiError ? err.message : "Try again.")
    }
  }

  if (!ready) {
    return (
      <View style={[moduleStyles.center, styles.center]}>
        <FacultyEmptyState
          icon="calendar-outline"
          title="Select a course"
          body="Attendance tools are scoped to your active course."
        />
      </View>
    )
  }

  const searchPlaceholder =
    tab === "roll"
      ? "Search students…"
      : tab === "meetings"
        ? "Search meetings…"
        : tab === "log"
          ? "Search attendance log…"
          : tab === "leaderboard"
            ? "Search rankings…"
            : "Search students or meetings…"

  return (
    <View style={[moduleStyles.root, styles.root]}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={MAIN_TABS} tab={tab} onChange={setTab} />

        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          showFilter={false}
          trailingAction={{
            onPress: () => setConfigSheetOpen(true),
            accessibilityLabel: "Attendance settings",
            icon: "settings-outline",
          }}
        />
      </FacultyModuleStickyHeader>

      <FacultyFilterSheet
        visible={configSheetOpen}
        title="Attendance settings"
        groupLabel="Section"
        subtitle="Stats, roll call, meetings, and the log follow this section."
        options={sectionFilterSheetOptions(uniqueSections)}
        value={sectionFilter}
        onSelect={selectSectionScope}
        onClose={() => setConfigSheetOpen(false)}
      />

      {tab === "roll" && !loading ? (
        <View style={styles.rollListHost}>
          {trendInsight.message ? (
            <View
              style={[
                styles.improveBanner,
                styles.rollTrendBanner,
                { backgroundColor: `${trendTone}14`, borderColor: `${trendTone}33` },
              ]}
            >
              <View style={styles.improveIcon}>
                <Ionicons name="analytics-outline" size={18} color={trendTone} />
              </View>
              <View style={styles.improveCopy}>
                <Text style={[styles.improveTitle, { color: trendTone }]}>{trendInsight.title}</Text>
                <Text style={[styles.improveSub, { color: trendTone }]}>{trendInsight.message}</Text>
              </View>
              <View style={[styles.improveArrow, { backgroundColor: `${trendTone}22` }]}>
                <Ionicons
                  name={trendInsight.improving ? "arrow-up-outline" : "arrow-down-outline"}
                  size={16}
                  color={trendTone}
                />
              </View>
            </View>
          ) : null}
          {error ? <Text style={[styles.error, styles.rollTrendBanner]}>{error}</Text> : null}
          <RollCallTab
            meetings={filteredMeetings}
            selectedMeetingId={selectedMeetingId}
            onSelectMeeting={setSelectedMeetingId}
            roster={rollCallRoster}
            rosterPager={rollPager}
            rosterSection={rosterSection}
            sessionMarks={sessionMarks}
            markingId={markingId}
            onMark={handleMark}
            markedCount={Object.keys(sessionMarks).length}
            showRecordsNotice={roster.length === 0 && sessionRecords.length > 0}
            listScrollPad={listScrollPad}
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, listScrollPad]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_ATTENDANCE_COLOR.link} />
          }
        >
          {trendInsight.message ? (
          <View
            style={[
              styles.improveBanner,
              { backgroundColor: `${trendTone}14`, borderColor: `${trendTone}33` },
            ]}
          >
            <View style={styles.improveIcon}>
              <Ionicons name="analytics-outline" size={18} color={trendTone} />
            </View>
            <View style={styles.improveCopy}>
              <Text style={[styles.improveTitle, { color: trendTone }]}>{trendInsight.title}</Text>
              <Text style={[styles.improveSub, { color: trendTone }]}>{trendInsight.message}</Text>
            </View>
            <View style={[styles.improveArrow, { backgroundColor: `${trendTone}22` }]}>
              <Ionicons
                name={trendInsight.improving ? "arrow-up-outline" : "arrow-down-outline"}
                size={16}
                color={trendTone}
              />
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={FACULTY_ATTENDANCE_COLOR.link} size="large" />
          </View>
        ) : (
          <>
            {tab === "overview" ? (
              <OverviewTab
                analytics={displayAnalytics}
                standings={standings}
                activeMeeting={activeMeeting}
                onGoRoll={() => setTab("roll")}
                onGoMeetings={() => setTab("meetings")}
                onGoLog={() => setTab("log")}
                onGoLeaderboard={() => setTab("leaderboard")}
              />
            ) : null}

            {tab === "meetings" ? (
              <MeetingsTab
                meetings={filteredMeetings}
                pager={meetingsPager}
                onSelect={(m) => {
                  setSelectedMeetingId(m.id)
                  setTab("roll")
                }}
                onToggleCancel={handleToggleCancel}
              />
            ) : null}

            {tab === "log" ? (
              <LogTab
                records={filteredLog}
                pager={logPager}
                logStatus={logStatus}
                onLogStatus={setLogStatus}
                onUpdateStatus={handleUpdateRecord}
              />
            ) : null}

            {tab === "leaderboard" ? <FacultyAttendanceLeaderboard rows={filteredStandings} /> : null}
          </>
        )}
      </ScrollView>
      )}
    </View>
  )
}

function OverviewTab({
  analytics,
  standings,
  activeMeeting,
  onGoRoll,
  onGoMeetings,
  onGoLog,
  onGoLeaderboard,
}: {
  analytics: AttendanceAnalytics | null
  standings: AttendanceStudentSummary[]
  activeMeeting: AttendanceSession | null
  onGoRoll: () => void
  onGoMeetings: () => void
  onGoLog: () => void
  onGoLeaderboard: () => void
}) {
  const { styles, tokens } = useAttendanceTheme()
  const statusRows = analytics?.statusBreakdown ?? []
  const statusTotal = statusRows.reduce((sum, r) => sum + Number(r.count ?? 0), 0) || 1
  const atRisk = analytics?.flaggedStudents ?? analytics?.chronicAbsentees ?? []

  return (
    <View style={styles.section}>
      {activeMeeting ? (
        <View style={styles.liveCard}>
          <View style={styles.liveHead}>
            <View style={styles.livePulse} />
            <Text style={styles.liveTitle}>QR check-in live</Text>
          </View>
          <Text style={styles.liveMeeting}>
            {activeMeeting.class_title || "Class meeting"} · {formatMeetingDay(activeMeeting.start_time)}
          </Text>
          <Text style={styles.liveMeta}>
            {activeMeeting.section} · {Number(activeMeeting.total_attended ?? 0)} checked in
          </Text>
          {activeMeeting.fallback_code ? (
            <View style={styles.fallbackRow}>
              <Text style={styles.fallbackLabel}>Fallback code</Text>
              <Text style={styles.fallbackCode}>{activeMeeting.fallback_code}</Text>
            </View>
          ) : null}
          <Text style={styles.liveHint}>Use a large display for the best QR scanning experience.</Text>
        </View>
      ) : null}

      <View style={styles.quickRow}>
        <QuickAction icon="people-outline" label="Take roll" hint="P / L / E / A" onPress={onGoRoll} />
        <QuickAction icon="calendar-outline" label="Meetings" hint="Schedule & status" onPress={onGoMeetings} />
      </View>

      <Pressable style={styles.logLink} onPress={onGoLog}>
        <Ionicons name="list-outline" size={16} color={FACULTY_ATTENDANCE_COLOR.link} />
        <Text style={styles.logLinkText}>View attendance log</Text>
        <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} />
      </Pressable>

      {statusRows.length > 0 ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Status breakdown</Text>
          {statusRows.map((row) => {
            const pct = (Number(row.count) / statusTotal) * 100
            return (
              <View key={row.status} style={styles.barRow}>
                <Text style={styles.barLabel}>{attendanceStatusLabel(row.status)}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.max(pct, 4)}%`,
                        backgroundColor: STATUS_COLORS[row.status] ?? FACULTY_ATTENDANCE_COLOR.meeting,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{row.count}</Text>
              </View>
            )
          })}
        </View>
      ) : null}

      <FacultyAttendanceLeaderboard
        rows={standings}
        compact
        onSeeAll={onGoLeaderboard}
      />

      <InsightPanel title="Needs follow-up" empty="Everyone is on track.">
        {atRisk.slice(0, 5).map((s) => (
          <InsightRow
            key={s.id}
            name={s.full_name}
            meta={s.student_id}
            badge={formatAttendancePct(s.attendance_percentage)}
            tone="warning"
          />
        ))}
      </InsightPanel>

      {(analytics?.weeklyTrend ?? []).length > 0 ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Weekly trend</Text>
          <View style={styles.trendRow}>
            {[...(analytics?.weeklyTrend ?? [])].slice(-6).reverse().map((week) => (
              <View key={week.week} style={styles.trendCol}>
                <View style={styles.trendBarWrap}>
                  <View
                    style={[styles.trendBar, { height: `${Math.min(Number(week.attendance_rate), 100)}%` }]}
                  />
                </View>
                <Text style={styles.trendPct}>{Math.round(Number(week.attendance_rate))}%</Text>
                <Text style={styles.trendWeek} numberOfLines={1}>
                  {week.week ? new Date(week.week).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}

function RollCallTab({
  meetings,
  selectedMeetingId,
  onSelectMeeting,
  roster,
  rosterPager,
  rosterSection,
  sessionMarks,
  markingId,
  onMark,
  markedCount,
  showRecordsNotice,
  listScrollPad,
  refreshing,
  onRefresh,
}: {
  meetings: AttendanceSession[]
  selectedMeetingId: number | null
  onSelectMeeting: (id: number) => void
  roster: AttendanceRosterStudent[]
  rosterPager: ReturnType<typeof useFacultyListPager<AttendanceRosterStudent>>
  rosterSection: string
  sessionMarks: Record<number, AttendanceStatus>
  markingId: number | null
  onMark: (student: AttendanceRosterStudent, status: AttendanceStatus) => void
  markedCount: number
  showRecordsNotice?: boolean
  listScrollPad: { paddingTop?: number; paddingBottom?: number; paddingHorizontal?: number }
  refreshing: boolean
  onRefresh: () => void
}) {
  const { styles, native, tokens } = useAttendanceTheme()
  const selected = meetings.find((m) => m.id === selectedMeetingId) ?? null
  const rosterTotal = roster.length
  const carouselRef = useRef<ScrollView>(null)
  const selectedIndex = meetings.findIndex((m) => m.id === selectedMeetingId)

  function scrollMeeting(direction: -1 | 1) {
    const nextIndex = selectedIndex + direction
    if (nextIndex < 0 || nextIndex >= meetings.length) return
    onSelectMeeting(meetings[nextIndex]!.id)
  }

  const meetingHeader = (
    <View style={styles.section}>
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>Class meeting</Text>
          {selected ? (
            <View
              style={[
                styles.markedBadge,
                {
                  backgroundColor: semanticSoft(facultyAttendanceMeetingStatusMeta(selected).color, tokens.isDark),
                  borderColor: `${facultyAttendanceMeetingStatusMeta(selected).color}33`,
                },
              ]}
            >
              <Text
                style={[
                  styles.markedBadgeText,
                  { color: facultyAttendanceMeetingStatusMeta(selected).color },
                ]}
              >
                {meetingStatusBadge(selected).label}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.meetingCarouselRow}>
          <Pressable
            style={[styles.carouselArrow, selectedIndex <= 0 && styles.carouselArrowDisabled]}
            onPress={() => scrollMeeting(-1)}
            disabled={selectedIndex <= 0}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={selectedIndex <= 0 ? native.tertiaryLabel : FACULTY_ATTENDANCE_COLOR.link}
            />
          </Pressable>
          <ScrollView
            ref={carouselRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.meetingPicker}
          >
            {meetings.length === 0 ? (
              <Text style={styles.hint}>No meetings scheduled yet.</Text>
            ) : (
              meetings.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.meetingChip, selectedMeetingId === m.id && styles.meetingChipActive]}
                  onPress={() => onSelectMeeting(m.id)}
                >
                  <Text style={[styles.meetingChipDay, selectedMeetingId === m.id && styles.meetingChipDayActive]}>
                    {formatMeetingDay(m.start_time)}
                  </Text>
                  <Text style={[styles.meetingChipSub, selectedMeetingId === m.id && styles.meetingChipSubActive]}>
                    {m.class_title || m.section}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
          <Pressable
            style={[styles.carouselArrow, selectedIndex >= meetings.length - 1 && styles.carouselArrowDisabled]}
            onPress={() => scrollMeeting(1)}
            disabled={selectedIndex >= meetings.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={selectedIndex >= meetings.length - 1 ? native.tertiaryLabel : FACULTY_ATTENDANCE_COLOR.link}
            />
          </Pressable>
        </View>

        {selected ? (
          <View style={styles.meetingMetaRow}>
            <Ionicons name="time-outline" size={14} color={FACULTY_ATTENDANCE_COLOR.link} />
            <Text style={styles.meetingMetaText}>
              {formatMeetingTimeRange(selected)}
              <Text style={styles.meetingMetaAccent}>
                {" · "}
                {markedCount}/{Math.max(rosterTotal, markedCount)} marked
              </Text>
              {" · "}
              {rosterSection || selected.section}
            </Text>
          </View>
        ) : null}
      </View>

      {showRecordsNotice ? (
        <Text style={styles.rollNotice}>
          Showing {rosterTotal} students from attendance records for this meeting.
        </Text>
      ) : null}
    </View>
  )

  const renderRosterRow = useCallback(
    ({ item: student }: { item: AttendanceRosterStudent }) => {
      const current = sessionMarks[student.studentId]
      const busy = markingId === student.studentId
      return (
        <RollCallStudentRow
          student={student}
          current={current}
          busy={busy}
          disabled={!selected}
          onMark={onMark}
        />
      )
    },
    [markingId, onMark, selected, sessionMarks],
  )

  return (
    <ModuleFlashList
      data={rosterPager.items}
      keyExtractor={(item) => String(item.studentId)}
      renderItem={renderRosterRow}
      extraData={{ sessionMarks, markingId, selectedMeetingId }}
      contentContainerStyle={[styles.content, listScrollPad]}
      ListHeaderComponent={meetingHeader}
      ListFooterComponent={<FacultyListPagerFooter pager={rosterPager} />}
      ListEmptyComponent={
        <FacultyEmptyState
          icon="people-outline"
          title="No students for this meeting"
          body={
            markedCount > 0
              ? "Attendance was recorded but the roster could not be loaded. Pull to refresh."
              : "Pick a class meeting or enroll students in this section."
          }
        />
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FACULTY_ATTENDANCE_COLOR.link} />
      }
    />
  )
}

function RollCallStudentRow({
  student,
  current,
  busy,
  disabled,
  onMark,
}: {
  student: AttendanceRosterStudent
  current?: AttendanceStatus
  busy: boolean
  disabled: boolean
  onMark: (student: AttendanceRosterStudent, status: AttendanceStatus) => void
}) {
  return (
    <FacultySignatureListCard
      thumb={facultyAttendanceStudentThumb(student.studentId)}
      icon="person-outline"
      title={student.fullName}
      metaLine={student.studentNumber}
      status={
        current
          ? {
              label: attendanceStatusLabel(current),
              color: facultyAttendanceStatusColor(current),
              icon: facultyAttendanceStatusIcon(current),
            }
          : undefined
      }
      footer={
        <AttendanceMarkRow
          current={current}
          busy={busy}
          disabled={disabled}
          studentName={student.fullName}
          onMark={(status) => onMark(student, status)}
          compact={false}
        />
      }
    />
  )
}

function MeetingsTab({
  meetings,
  pager,
  onSelect,
  onToggleCancel,
}: {
  meetings: AttendanceSession[]
  pager: ReturnType<typeof useFacultyListPager<AttendanceSession>>
  onSelect: (m: AttendanceSession) => void
  onToggleCancel: (m: AttendanceSession) => void
}) {
  const { styles, tokens } = useAttendanceTheme()

  if (meetings.length === 0) {
    return (
      <FacultyEmptyState
        icon="calendar-outline"
        title="No class meetings"
        body="Create attendance sessions here once scheduling is available."
      />
    )
  }

  return (
    <View style={styles.section}>
      {pager.items.map((m) => {
        const status = facultyAttendanceMeetingStatusMeta(m)
        return (
          <FacultySignatureListCard
            key={m.id}
            thumb={facultyAttendanceMeetingThumb(m.id)}
            icon="calendar-outline"
            title={m.class_title || "Class meeting"}
            description={`${formatMeetingDay(m.start_time)} · ${formatMeetingTimeRange(m)}`}
            metaLine={`${m.section} · ${Number(m.total_attended ?? 0)} checked in`}
            status={{ label: status.label, color: status.color, icon: status.icon }}
            onPress={() => onSelect(m)}
            footer={
              <View style={styles.meetingActions}>
                <Pressable
                  style={styles.meetingActionBtn}
                  onPress={() => onSelect(m)}
                  accessibilityRole="button"
                  accessibilityLabel={`Take roll ${m.class_title || "Class meeting"}`}
                >
                  <Ionicons name="create-outline" size={16} color={FACULTY_ATTENDANCE_COLOR.link} />
                  <Text style={styles.meetingActionText}>Take roll</Text>
                </Pressable>
                <Pressable
                  style={styles.meetingActionBtn}
                  onPress={() => onToggleCancel(m)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    m.is_cancelled
                      ? `Restore ${m.class_title || "Class meeting"}`
                      : `Cancel class ${m.class_title || "Class meeting"}`
                  }
                >
                  <Ionicons
                    name={m.is_cancelled ? "refresh-outline" : "close-circle-outline"}
                    size={16}
                    color={m.is_cancelled ? FACULTY_ATTENDANCE_COLOR.link : tokens.danger}
                  />
                  <Text
                    style={[
                      styles.meetingActionText,
                      m.is_cancelled && { color: FACULTY_ATTENDANCE_COLOR.link },
                      !m.is_cancelled && { color: tokens.danger },
                    ]}
                  >
                    {m.is_cancelled ? "Restore" : "Cancel class"}
                  </Text>
                </Pressable>
              </View>
            }
          />
        )
      })}
      <FacultyListPagerFooter pager={pager} />
    </View>
  )
}

function LogTab({
  records,
  pager,
  logStatus,
  onLogStatus,
  onUpdateStatus,
}: {
  records: AttendanceRecord[]
  pager: ReturnType<typeof useFacultyListPager<AttendanceRecord>>
  logStatus: string
  onLogStatus: (v: string) => void
  onUpdateStatus: (record: AttendanceRecord, status: AttendanceStatus) => void
}) {
  const { styles, native } = useAttendanceTheme()
  const [statusSheetOpen, setStatusSheetOpen] = useState(false)
  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All statuses" },
      ...ATTENDANCE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: attendanceStatusLabel(o.value) })),
    ],
    [],
  )
  const statusLabel = statusOptions.find((o) => o.value === logStatus)?.label ?? "All statuses"

  return (
    <View style={styles.section}>
      <Pressable style={styles.logStatusChip} onPress={() => setStatusSheetOpen(true)}>
        <Ionicons name="options-outline" size={16} color={native.secondaryLabel} />
        <Text style={styles.logStatusChipText}>{statusLabel}</Text>
        <Ionicons name="chevron-down" size={14} color={native.tertiaryLabel} />
      </Pressable>
      <FacultyFilterSheet
        visible={statusSheetOpen}
        title="Filter by status"
        options={statusOptions}
        value={logStatus}
        onSelect={(v) => {
          onLogStatus(v)
          setStatusSheetOpen(false)
        }}
        onClose={() => setStatusSheetOpen(false)}
      />

      {records.length === 0 ? (
        <FacultyEmptyState icon="list-outline" title="No records" body="Attendance marks and QR check-ins appear here." />
      ) : (
        <>
        {pager.items.map((record) => (
          <FacultySignatureListCard
            key={record.id}
            thumb={facultyAttendanceStudentThumb(record.studentId)}
            icon="person-outline"
            title={record.studentName}
            metaLine={`${record.classTitle || "Class"} · ${formatFacultyRelativeTime(record.timestamp)}`}
            status={{
              label: attendanceStatusLabel(record.status),
              color: facultyAttendanceStatusColor(record.status),
              icon: facultyAttendanceStatusIcon(record.status),
            }}
            footer={
              <AttendanceMarkRow
                current={
                  record.status === "present" ||
                  record.status === "late" ||
                  record.status === "excused" ||
                  record.status === "absent"
                    ? record.status
                    : undefined
                }
                studentName={record.studentName}
                onMark={(status) => onUpdateStatus(record, status)}
                compact
              />
            }
          />
        ))}
        <FacultyListPagerFooter pager={pager} />
        </>
      )}
    </View>
  )
}

function AttendanceMarkRow({
  current,
  busy = false,
  disabled = false,
  studentName,
  onMark,
  compact = false,
}: {
  current?: AttendanceStatus
  busy?: boolean
  disabled?: boolean
  studentName?: string
  onMark: (status: AttendanceStatus) => void
  compact?: boolean
}) {
  const { styles, tokens, native } = useAttendanceTheme()

  return (
    <View style={styles.markRow}>
      {ATTENDANCE_STATUS_OPTIONS.map((opt) => {
        const themed = attendanceStatusOption(opt.value, tokens.isDark)
        const active = current === opt.value
        return (
          <Pressable
            key={opt.value}
            style={[
              compact ? styles.markBtnSm : styles.markBtn,
              {
                backgroundColor: active ? themed.color : themed.bg,
                borderColor: active ? themed.color : native.separator,
              },
              (busy || disabled) && { opacity: 0.5 },
            ]}
            disabled={busy || disabled}
            onPress={() => onMark(opt.value)}
            accessibilityRole="button"
            accessibilityLabel={
              studentName
                ? `Mark ${studentName} ${attendanceStatusLabel(opt.value)}`
                : `Mark ${attendanceStatusLabel(opt.value)}`
            }
            accessibilityState={{ selected: active, disabled: busy || disabled }}
          >
            <Text
              style={[
                compact ? styles.markBtnSmText : styles.markBtnText,
                { color: active ? "#ffffff" : themed.color },
              ]}
            >
              {opt.shortLabel}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function QuickAction({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  hint: string
  onPress: () => void
}) {
  const { styles, tokens } = useAttendanceTheme()
  return (
    <Pressable style={styles.quickAction} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={20} color={FACULTY_ATTENDANCE_COLOR.link} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={styles.quickHint}>{hint}</Text>
    </Pressable>
  )
}

function InsightPanel({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: ReactNode
}) {
  const { styles } = useAttendanceTheme()
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return (
    <View style={styles.insightPanel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {hasChildren ? children : <Text style={styles.hint}>{empty}</Text>}
    </View>
  )
}

function InsightRow({
  rank,
  name,
  meta,
  badge,
  tone,
}: {
  rank?: number
  name: string
  meta: string
  badge: string
  tone: "success" | "warning"
}) {
  const { styles } = useAttendanceTheme()
  return (
    <View style={styles.insightRow}>
      {rank != null ? (
        <View style={[styles.rankBadge, rank === 1 && styles.rankBadgeGold]}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
      ) : (
        <View style={styles.rankDot} />
      )}
      <View style={styles.insightCopy}>
        <Text style={styles.insightName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.insightMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <FacultyStatusPill label={badge} tone={tone} />
    </View>
  )
}
