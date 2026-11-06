import { useMemo } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { StudentAttendanceSessionItem } from "../../lib/rewards-api"
import {
  formatSessionDayLabel,
  formatSessionMonthGroup,
  formatSessionTimeRange,
  isAttendedSessionStatus,
  sessionStatusBadge,
  type StudentCheckInStatus,
} from "../../lib/student-attendance-session-utils"
import { SignatureListCard } from "../theme/SignatureListCard"
import { ModuleSectionHeader } from "../modules/ModuleScreen"
import { EmptyBlock, useRewardsTheme } from "./rewards-shared"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "../faculty/FacultyListPagerFooter"

type Props = {
  sessions: StudentAttendanceSessionItem[]
  loading?: boolean
  search?: string
  onSessionPress: (session: StudentAttendanceSessionItem) => void
}

function groupSessionsByMonth(sessions: StudentAttendanceSessionItem[]) {
  const groups: { month: string; items: StudentAttendanceSessionItem[] }[] = []
  for (const session of sessions) {
    const month = formatSessionMonthGroup(session.startTime)
    const last = groups[groups.length - 1]
    if (last?.month === month) {
      last.items.push(session)
    } else {
      groups.push({ month, items: [session] })
    }
  }
  return groups
}

function statusColor(tone: ReturnType<typeof sessionStatusBadge>["tone"]): string {
  switch (tone) {
    case "success":
      return "#16a34a"
    case "warning":
      return "#d97706"
    case "live":
      return "#0891b2"
    case "danger":
      return "#dc2626"
    default:
      return "#6366f1"
  }
}

function SessionRow({
  session,
  index,
  onPress,
}: {
  session: StudentAttendanceSessionItem
  index: number
  onPress: () => void
}) {
  const theme = useRewardsTheme()
  const badge = sessionStatusBadge(session.checkInStatus as StudentCheckInStatus, session.record?.status)
  const timeRange = formatSessionTimeRange(session.startTime, session.endTime)
  const recordScored =
    session.record != null && isAttendedSessionStatus(String(session.record.status ?? ""))
  const recordAbsent = String(session.record?.status ?? "").toLowerCase() === "absent"
  const meta = recordAbsent
    ? `${timeRange} · 0 pts · ${session.statusMessage}`
    : recordScored
      ? `${timeRange} · +${session.record?.pointsEarned ?? 0} pts`
      : session.checkInStatus === "open"
        ? `${timeRange} · ${session.statusMessage}`
        : `${timeRange} · ${session.statusMessage}`

  return (
    <SignatureListCard
      index={index}
      title={formatSessionDayLabel(session.startTime)}
      subtitle={session.classTitle}
      meta={meta}
      statusLabel={badge.label}
      statusColor={statusColor(badge.tone)}
      statusIcon={
        session.checkInStatus === "checked_in"
          ? "checkmark-circle"
          : session.checkInStatus === "open"
            ? "radio-button-on"
            : "ellipse-outline"
      }
      icon="calendar-outline"
      accent={theme.primary}
      onPress={onPress}
    />
  )
}

export function StudentAttendanceSessionList({
  sessions,
  loading = false,
  search = "",
  onSessionPress,
}: Props) {
  const native = useThemedNative()
  const type = useNativeType()

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase()
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )
    if (!q) return sorted
    return sorted.filter(
      (session) =>
        session.classTitle.toLowerCase().includes(q) ||
        formatSessionDayLabel(session.startTime).toLowerCase().includes(q) ||
        session.statusMessage.toLowerCase().includes(q),
    )
  }, [sessions, search])

  const sessionsPager = useFacultyListPager(filteredSessions, search, "sessions")
  const groups = useMemo(() => groupSessionsByMonth(sessionsPager.items), [sessionsPager.items])

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator />
      </View>
    )
  }

  if (sessions.length === 0) {
    return (
      <EmptyBlock
        icon="calendar-outline"
        title="No sessions scheduled yet"
        body="Your instructor's class meetings will appear here when they are set up."
      />
    )
  }

  if (filteredSessions.length === 0) {
    return (
      <EmptyBlock
        icon="search-outline"
        title="No matching sessions"
        body="Try a different search term."
      />
    )
  }

  let rowIndex = sessionsPager.page * sessionsPager.pageSize

  return (
    <View style={styles.root}>
      <Text style={[type.caption, styles.hint, { color: native.secondaryLabel }]}>
        {filteredSessions.length} session{filteredSessions.length === 1 ? "" : "s"} · tap a row for check-in options
      </Text>
      {groups.map((group) => (
        <View key={group.month} style={styles.group}>
          <ModuleSectionHeader title={group.month} />
          <View style={styles.list}>
            {group.items.map((session) => {
              const index = rowIndex
              rowIndex += 1
              return (
                <SessionRow
                  key={session.id}
                  session={session}
                  index={index}
                  onPress={() => onSessionPress(session)}
                />
              )
            })}
          </View>
        </View>
      ))}
      <FacultyListPagerFooter pager={sessionsPager} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  hint: {
    paddingHorizontal: 2,
    lineHeight: 18,
  },
  loadingWrap: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  group: {
    gap: 8,
  },
  list: {
    gap: 10,
  },
})
