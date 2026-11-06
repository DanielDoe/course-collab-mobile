import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { useSession } from "../../context/SessionProvider"
import { useThemedNative } from "../../context/AppearanceProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useNativeType } from "../../lib/themed-module-theme"
import { SignatureListCard } from "../theme/SignatureListCard"
import { TabbedModuleLayout, signatureListStyles } from "../theme/TabbedModuleLayout"
import { useModuleSearchDockRegistration, type ModuleSearchDockEntry } from "../../context/ModuleSearchDockContext"
import {
  formatRelativeTime,
  rewardsApi,
  type AttendanceLeaderboardEntry,
  type AttendanceRecord,
  type AttendanceScore,
  type AttendanceStreak,
  type StudentAttendanceSessionItem,
} from "../../lib/rewards-api"
import {
  attendanceDisplayPercent,
  attendanceLeaderboardForCurrentOffering,
} from "../../lib/attendance-leaderboard-scope"
import { EmptyBlock, useRewardsTheme } from "./rewards-shared"
import { AttendanceCheckInActionSheet } from "./AttendanceCheckInActionSheet"
import { AttendanceLeaderboardPodium } from "./AttendanceLeaderboardPodium"
import { AttendanceOverviewHero } from "./AttendanceOverviewHero"
import { AttendanceSessionActionSheet } from "./AttendanceSessionActionSheet"
import { StructuredSessionCheckIn } from "./StructuredSessionCheckIn"
import { StudentAttendanceSessionList } from "./StudentAttendanceSessionList"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "../faculty/FacultyListPagerFooter"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type Tab = "overview" | "sessions" | "records" | "leaderboard"

/** Bottom search dock without touching TabbedModuleLayout chrome (which shifts the tab bar). */
function AttendanceSearchDock({
  tab,
  search,
  onChangeSearch,
  onOpenCheckIn,
}: {
  tab: Tab
  search: string
  onChangeSearch: (value: string) => void
  onOpenCheckIn: () => void
}) {
  const dockId = useId()
  const placeholder =
    tab === "sessions"
      ? "Search class sessions…"
      : tab === "records"
        ? "Search attendance history…"
        : tab === "leaderboard"
          ? "Search rankings…"
          : "Search attendance…"

  const trailingAction = useMemo(
    () =>
      ({
        onPress: onOpenCheckIn,
        accessibilityLabel: "Check in",
        icon: "add",
      }) as const,
    [onOpenCheckIn],
  )

  const dockEntry = useMemo<ModuleSearchDockEntry | null>(() => {
    if (tab === "overview") return null
    return {
      kind: "student",
      props: {
        value: search,
        onChange: onChangeSearch,
        placeholder,
        showFilter: false,
        placement: "dock",
        trailingAction,
      },
    }
  }, [tab, search, onChangeSearch, placeholder, trailingAction])

  useModuleSearchDockRegistration(dockId, dockEntry)
  return null
}

function RecordListCard({ record, index }: { record: AttendanceRecord; index: number }) {
  const theme = useRewardsTheme()
  const present = record.status?.toLowerCase() === "present" || record.status?.toLowerCase() === "late"
  return (
    <SignatureListCard
      index={index}
      title={record.classTitle ?? "Class session"}
      meta={formatRelativeTime(record.timestamp ?? record.startTime)}
      statusLabel={record.status ?? "Unknown"}
      statusColor={present ? "#16a34a" : "#dc2626"}
      statusIcon={present ? "checkmark-circle" : "close-circle"}
      trailingValue={record.pointsEarned != null ? `+${Number(record.pointsEarned)}` : undefined}
      trailingValueColor={theme.primary}
      icon="calendar-outline"
      accent={theme.primary}
      showChevron={false}
    />
  )
}

function LeaderboardListCard({ entry, index }: { entry: AttendanceLeaderboardEntry; index: number }) {
  const theme = useRewardsTheme()
  const isMe = entry.is_current_user
  return (
    <SignatureListCard
      index={index}
      title={`${entry.full_name ?? "Student"}${isMe ? " (you)" : ""}`}
      meta={`${attendanceDisplayPercent(entry.attendance_percentage)}% · ${entry.current_streak ?? 0} day streak`}
      metaIcon="stats-chart-outline"
      trailingValue={String(entry.total_points ?? 0)}
      trailingValueColor={theme.primary}
      icon="podium-outline"
      accent={theme.primary}
      showChevron={false}
    />
  )
}

export function AttendanceScreen() {
  const session = useStudentSession()
  const theme = useRewardsTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const [tab, setTab] = useState<Tab>("overview")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [score, setScore] = useState<AttendanceScore>({})
  const [streak, setStreak] = useState<AttendanceStreak>({})
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [leaderboard, setLeaderboard] = useState<AttendanceLeaderboardEntry[]>([])
  const [scheduledSessions, setScheduledSessions] = useState<StudentAttendanceSessionItem[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [checkInMenuOpen, setCheckInMenuOpen] = useState(false)
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [activeSession, setActiveSession] = useState<StudentAttendanceSessionItem | null>(null)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkInSession, setCheckInSession] = useState<StudentAttendanceSessionItem | null>(null)
  const [sessionId, setSessionId] = useState("")
  const [code, setCode] = useState("")
  const [checkingIn, setCheckingIn] = useState(false)
  const [search, setSearch] = useState("")

  const openSession = useMemo(
    () => scheduledSessions.find((row) => row.canCheckIn) ?? null,
    [scheduledSessions],
  )

  const load = useCallback(async () => {
    if (!session) return
    try {
      const [scoreData, streakData, recordsData, lbData, sessionsData] = await Promise.all([
        rewardsApi.getAttendanceScore(session).catch(() => ({ attendance: {} })),
        rewardsApi.getAttendanceStreaks(session).catch(() => ({ streak: {} })),
        rewardsApi.getAttendanceRecords(session).catch(() => ({ records: [] })),
        rewardsApi.getAttendanceLeaderboard(session).catch(() => ({ leaderboard: [] })),
        rewardsApi.getStudentAttendanceSessions(session).catch(() => ({ sessions: [] })),
      ])
      setScore(scoreData.attendance ?? {})
      setStreak(streakData.streak ?? {})
      setRecords(recordsData.records ?? [])
      setLeaderboard(lbData.leaderboard ?? [])
      setScheduledSessions(sessionsData.sessions ?? [])
      setError("")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load attendance.")
    } finally {
      setSessionsLoading(false)
    }
  }, [session])

  useNotificationModuleRefresh("attendance", load)

  useEffect(() => {
    if (!session) return
    setLoading(true)
    setSessionsLoading(true)
    load().finally(() => setLoading(false))
  }, [session, load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const sortedRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    const sorted = [...records].sort(
      (a, b) =>
        new Date(b.timestamp ?? b.startTime ?? 0).getTime() -
        new Date(a.timestamp ?? a.startTime ?? 0).getTime(),
    )
    if (!q) return sorted
    return sorted.filter(
      (record) =>
        (record.classTitle ?? "Class session").toLowerCase().includes(q) ||
        (record.status ?? "").toLowerCase().includes(q),
    )
  }, [records, search])

  const filteredLeaderboard = useMemo(() => {
    const scoped = session ? attendanceLeaderboardForCurrentOffering(leaderboard, session) : []
    const q = search.trim().toLowerCase()
    if (!q) return scoped
    return scoped.filter((entry) => (entry.full_name ?? "Student").toLowerCase().includes(q))
  }, [leaderboard, search, session])

  const recordsPager = useFacultyListPager(sortedRecords, `${search}|records`, "records")
  const leaderboardTail = useMemo(() => filteredLeaderboard.slice(3), [filteredLeaderboard])
  const leaderboardTailPager = useFacultyListPager(leaderboardTail, `${search}|leaderboard`, "students", {
    preset: "compact",
  })

  const selfCheckInFromList = useCallback(
    async (row: StudentAttendanceSessionItem) => {
      if (!session || !row.canCheckIn) return
      setCheckingIn(true)
      try {
        const result = await rewardsApi.selfCheckInStructured(session, row.id)
        AppAlert.alert(
          result.alreadyRecorded ? "Already checked in" : "Checked in",
          result.sessionTitle ?? row.classTitle,
        )
        await load()
      } catch (err) {
        AppAlert.alert("Check-in failed", err instanceof ApiError ? err.message : "Could not mark attendance.")
      } finally {
        setCheckingIn(false)
      }
    },
    [session, load],
  )

  const openCodeCheckIn = useCallback((row: StudentAttendanceSessionItem) => {
    if (!row.canCheckIn) return
    setCheckInSession(row)
    setSessionId(String(row.id))
    setCode("")
    setCheckInOpen(true)
  }, [])

  const closeCheckInModal = useCallback(() => {
    setCheckInOpen(false)
    setCheckInSession(null)
    setSessionId("")
    setCode("")
  }, [])

  const openManualCheckIn = useCallback(() => {
    setCheckInSession(null)
    setSessionId("")
    setCode("")
    setCheckInOpen(true)
  }, [])

  const openSessionActions = useCallback((row: StudentAttendanceSessionItem) => {
    setActiveSession(row)
    setSessionSheetOpen(true)
  }, [])

  const openStructuredTodayActions = useCallback(
    (row: { id: number; class_title?: string; start_time?: string; end_time?: string; my_status?: string | null }) => {
      openSessionActions({
        id: row.id,
        classTitle: row.class_title ?? "Structured CourseCollab Session",
        startTime: row.start_time ?? "",
        endTime: row.end_time ?? "",
        canCheckIn: !row.my_status,
        checkInStatus: row.my_status ? "checked_in" : "open",
        statusMessage: row.my_status ? "Already checked in" : "Self check-in available",
        record: row.my_status ? { status: row.my_status, pointsEarned: 0 } : null,
        selfCheckInEnabled: true,
        sessionType: "STRUCTURED_COURSECOLLAB",
      })
    },
    [openSessionActions],
  )

  async function handleCheckIn() {
    if (!session) return
    const sid = Number(checkInSession?.id ?? sessionId.trim())
    if (!sid || !code.trim()) {
      AppAlert.alert(
        "Missing info",
        checkInSession
          ? "Enter the attendance code from your instructor."
          : "Enter the session ID and attendance code from your instructor.",
      )
      return
    }
    setCheckingIn(true)
    try {
      const result = await rewardsApi.markAttendance(session, { sessionId: sid, code: code.trim() })
      AppAlert.alert("Checked in", result.message ?? "Attendance recorded successfully.")
      closeCheckInModal()
      await load()
    } catch (err) {
      AppAlert.alert("Check-in failed", err instanceof ApiError ? err.message : "Could not mark attendance.")
    } finally {
      setCheckingIn(false)
    }
  }

  const openCheckInMenu = useCallback(() => setCheckInMenuOpen(true), [])
  const closeCheckInMenu = useCallback(() => setCheckInMenuOpen(false), [])
  const browseSessionsTab = useCallback(() => setTab("sessions"), [])

  const tabs = useMemo(
    () => [
      { id: "overview" as const, label: "Overview", icon: "stats-chart-outline" as const },
      { id: "sessions" as const, label: "Sessions", icon: "calendar-outline" as const },
      { id: "records" as const, label: "History", icon: "list-outline" as const },
      { id: "leaderboard" as const, label: "Ranks", icon: "podium-outline" as const },
    ],
    [],
  )

  function renderOverviewPage() {
    if (!session) {
      return <AttendanceOverviewHero score={score} streak={streak} records={records} />
    }
    return (
      <View style={{ gap: 14 }}>
        <StructuredSessionCheckIn session={session} onPress={openStructuredTodayActions} />
        <AttendanceOverviewHero score={score} streak={streak} records={records} />
      </View>
    )
  }

  function renderSessionsPage() {
    return (
      <StudentAttendanceSessionList
        sessions={scheduledSessions}
        loading={sessionsLoading}
        search={search}
        onSessionPress={openSessionActions}
      />
    )
  }

  function renderRecordsPage() {
    if (sortedRecords.length === 0) {
      return (
        <EmptyBlock
          icon="calendar-outline"
          title="No attendance records"
          body="Check in during class to start building your attendance history."
        />
      )
    }
    return (
      <>
        <View style={signatureListStyles.list}>
          {recordsPager.items.map((record, index) => (
            <RecordListCard key={record.id} record={record} index={recordsPager.page * recordsPager.pageSize + index} />
          ))}
        </View>
        <FacultyListPagerFooter pager={recordsPager} />
      </>
    )
  }

  function renderLeaderboardPage() {
    if (filteredLeaderboard.length === 0) {
      return (
        <EmptyBlock
          icon="podium-outline"
          title="Leaderboard empty"
          body="Section rankings appear once attendance is tracked for the term."
        />
      )
    }
    return (
      <>
        <View style={signatureListStyles.list}>
          <AttendanceLeaderboardPodium entries={filteredLeaderboard} />
          {leaderboardTailPager.items.map((entry, index) => (
            <LeaderboardListCard
              key={entry.rank ?? index + 4}
              entry={entry}
              index={leaderboardTailPager.page * leaderboardTailPager.pageSize + index + 3}
            />
          ))}
        </View>
        <FacultyListPagerFooter pager={leaderboardTailPager} />
      </>
    )
  }

  return (
    <>
      <AttendanceSearchDock
        tab={tab}
        search={search}
        onChangeSearch={setSearch}
        onOpenCheckIn={openCheckInMenu}
      />
      <TabbedModuleLayout
        tabs={tabs}
        tab={tab}
        onTabChange={setTab}
        scrollableTabs
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        error={error}
        pages={[renderOverviewPage(), renderSessionsPage(), renderRecordsPage(), renderLeaderboardPage()]}
      />

      <AttendanceCheckInActionSheet
        visible={checkInMenuOpen}
        onClose={closeCheckInMenu}
        openSession={openSession}
        onSelfCheckIn={(row) => void selfCheckInFromList(row)}
        onEnterCode={openCodeCheckIn}
        onManualCode={openManualCheckIn}
        onBrowseSessions={browseSessionsTab}
      />

      <AttendanceSessionActionSheet
        visible={sessionSheetOpen}
        session={activeSession}
        onClose={() => {
          setSessionSheetOpen(false)
          setActiveSession(null)
        }}
        onSelfCheckIn={(row) => {
          void selfCheckInFromList(row).then(() => load())
        }}
        onEnterCode={openCodeCheckIn}
      />

      <Modal visible={checkInOpen} animationType="slide" transparent onRequestClose={closeCheckInModal}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: native.secondaryGrouped }]}>
            <Text style={type.sheetTitle}>Check in</Text>
            {checkInSession ? (
              <>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>{checkInSession.classTitle}</Text>
                <Text style={[type.secondary, styles.modalHint]}>
                  Enter the attendance code shown on your instructor&apos;s screen.
                </Text>
              </>
            ) : (
              <Text style={[type.secondary, styles.modalHint]}>
                Enter the session ID and class code shown on your instructor&apos;s screen.
              </Text>
            )}
            {!checkInSession ? (
              <>
                <Text style={[styles.inputLabel, { color: theme.primaryDark }]}>Session ID</Text>
                <TextInput
                  style={[styles.field, { borderColor: native.separator, color: native.label }]}
                  value={sessionId}
                  onChangeText={setSessionId}
                  placeholder="e.g. 42"
                  placeholderTextColor={native.tertiaryLabel}
                  keyboardType="number-pad"
                />
              </>
            ) : null}
            <Text style={[styles.inputLabel, { color: theme.primaryDark }]}>Attendance code</Text>
            <TextInput
              style={[styles.field, { borderColor: native.separator, color: native.label }]}
              value={code}
              onChangeText={setCode}
              placeholder="6-character code"
              placeholderTextColor={native.tertiaryLabel}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalCancel, { borderColor: native.separator }]} onPress={closeCheckInModal}>
                <Text style={type.secondary}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmit, { backgroundColor: theme.primary }, checkingIn && styles.modalSubmitDisabled]}
                onPress={handleCheckIn}
                disabled={checkingIn}
              >
                <Text style={styles.modalSubmitText}>{checkingIn ? "Checking in…" : "Submit"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 10,
  },
  modalHint: { lineHeight: 18 },
  inputLabel: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  modalSubmit: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalSubmitDisabled: { opacity: 0.5 },
  modalSubmitText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
})
