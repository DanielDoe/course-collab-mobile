import { useCallback, useEffect, useMemo, useState } from "react"
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import { useThemedNative } from "../../context/AppearanceProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useNativeType } from "../../lib/themed-module-theme"
import { CollabSearch } from "../collaboration/collab-shared"
import { SignatureListCard } from "../theme/SignatureListCard"
import { TabbedModuleLayout, signatureListStyles } from "../theme/TabbedModuleLayout"
import {
  formatRelativeTime,
  rewardsApi,
  type AttendanceLeaderboardEntry,
  type AttendanceRecord,
  type AttendanceScore,
  type AttendanceStreak} from "../../lib/rewards-api"
import { EmptyBlock, useRewardsTheme } from "./rewards-shared"
import { AttendanceLeaderboardPodium } from "./AttendanceLeaderboardPodium"
import { AttendanceOverviewHero } from "./AttendanceOverviewHero"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type Tab = "overview" | "records" | "leaderboard"

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
      meta={`${Math.round(Number(entry.attendance_percentage ?? 0))}% · ${entry.current_streak ?? 0} day streak`}
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
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const [code, setCode] = useState("")
  const [checkingIn, setCheckingIn] = useState(false)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    try {
      const [scoreData, streakData, recordsData, lbData] = await Promise.all([
        rewardsApi.getAttendanceScore(session),
        rewardsApi.getAttendanceStreaks(session),
        rewardsApi.getAttendanceRecords(session),
        rewardsApi.getAttendanceLeaderboard(session),
      ])
      setScore(scoreData.attendance ?? {})
      setStreak(streakData.streak ?? {})
      setRecords(recordsData.records ?? [])
      setLeaderboard(lbData.leaderboard ?? [])
      setError("")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load attendance.")
    }
  }, [session])

  useNotificationModuleRefresh("attendance", load)

  useEffect(() => {
    if (!session) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [session, load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const sortedRecords = useMemo(
    () => {
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
    },
    [records, search],
  )

  const filteredLeaderboard = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leaderboard
    return leaderboard.filter((entry) => (entry.full_name ?? "Student").toLowerCase().includes(q))
  }, [leaderboard, search])

  async function handleCheckIn() {
    if (!session) return
    const sid = Number(sessionId.trim())
    if (!sid || !code.trim()) {
      AppAlert.alert("Missing info", "Enter the session ID and attendance code from your instructor.")
      return
    }
    setCheckingIn(true)
    try {
      const result = await rewardsApi.markAttendance(session, { sessionId: sid, code: code.trim() })
      AppAlert.alert("Checked in", result.message ?? "Attendance recorded successfully.")
      setCheckInOpen(false)
      setSessionId("")
      setCode("")
      await load()
    } catch (err) {
      AppAlert.alert("Check-in failed", err instanceof ApiError ? err.message : "Could not mark attendance.")
    } finally {
      setCheckingIn(false)
    }
  }

  const tabs = useMemo(
    () => [
      { id: "overview" as const, label: "Overview", icon: "stats-chart-outline" as const },
      { id: "records" as const, label: "History", icon: "list-outline" as const },
      { id: "leaderboard" as const, label: "Ranks", icon: "podium-outline" as const },
    ],
    [],
  )

  function renderOverviewPage() {
    return <AttendanceOverviewHero score={score} streak={streak} records={records} />
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
      <View style={signatureListStyles.list}>
        {sortedRecords.map((record, index) => (
          <RecordListCard key={record.id} record={record} index={index} />
        ))}
      </View>
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
      <View style={signatureListStyles.list}>
        <AttendanceLeaderboardPodium entries={filteredLeaderboard} />
        {filteredLeaderboard.length > 3
          ? filteredLeaderboard.slice(3).map((entry, index) => (
              <LeaderboardListCard key={entry.rank ?? index + 4} entry={entry} index={index + 3} />
            ))
          : null}
      </View>
    )
  }

  return (
    <>
      <TabbedModuleLayout
        tabs={tabs}
        tab={tab}
        onTabChange={setTab}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        error={error}
        chrome={
          <CollabSearch
            value={search}
            onChange={setSearch}
            placeholder={
              tab === "records"
                ? "Search attendance history…"
                : tab === "leaderboard"
                  ? "Search rankings…"
                  : "Search attendance…"
            }
            trailingAction={{
              onPress: () => setCheckInOpen(true),
              accessibilityLabel: "Check in with code",
              icon: "add",
            }}
          />
        }
        pages={[renderOverviewPage(), renderRecordsPage(), renderLeaderboardPage()]}
      />

      <Modal visible={checkInOpen} animationType="slide" transparent onRequestClose={() => setCheckInOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: native.secondaryGrouped }]}>
            <Text style={type.sheetTitle}>Check in</Text>
            <Text style={[type.secondary, styles.modalHint]}>
              Enter the session ID and class code shown on your instructor’s screen.
            </Text>
            <Text style={[styles.inputLabel, { color: theme.primaryDark }]}>Session ID</Text>
            <TextInput
              style={[styles.field, { borderColor: native.separator, color: native.label }]}
              value={sessionId}
              onChangeText={setSessionId}
              placeholder="e.g. 42"
              placeholderTextColor={native.tertiaryLabel}
              keyboardType="number-pad"
            />
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
              <Pressable style={[styles.modalCancel, { borderColor: native.separator }]} onPress={() => setCheckInOpen(false)}>
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
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  recordDot: { width: 10, height: 10, borderRadius: 5 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14 },
  recordPts: { fontSize: 14, fontWeight: "600" },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  leaderRank: { width: 32, fontSize: 14, fontWeight: "600" },
  leaderName: { fontSize: 14 },
  leaderPts: { fontSize: 15, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end"},
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 10},
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
    alignItems: "center"},
  modalSubmit: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center"},
  modalSubmitDisabled: { opacity: 0.5 },
  modalSubmitText: { fontSize: 15, fontWeight: "600", color: "#ffffff" }})
