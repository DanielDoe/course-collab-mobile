import { attendanceDisplayPercent } from "./attendance-leaderboard-scope"
import { isFall2026ElegOffering } from "./fall-2026-eleg-sessions"
import type {
  AttendanceAnalytics,
  AttendanceRecord,
  AttendanceRosterStudent,
  AttendanceSession,
  AttendanceStudentSummary,
} from "./instructor-api"
import {
  facultyAttendanceStatusColor,
  FACULTY_ATTENDANCE_COLOR,
} from "./faculty-attendance-theme"

export type AttendanceTab = "overview" | "roll" | "meetings" | "log" | "leaderboard"

export type AttendanceStatus = "present" | "absent" | "excused" | "late"

/** Color Hunt status keys — use `attendanceStatusOption()` at render for themed soft bg. */
export const ATTENDANCE_STATUS_OPTIONS: {
  value: AttendanceStatus
  label: string
  shortLabel: string
  points: number
}[] = [
  { value: "present", label: "Present", shortLabel: "P", points: 1 },
  { value: "late", label: "Late", shortLabel: "L", points: 0.75 },
  { value: "excused", label: "Excused", shortLabel: "E", points: 0.5 },
  { value: "absent", label: "Absent", shortLabel: "A", points: 0 },
]

export function attendanceStatusOption(value: AttendanceStatus, isDark: boolean) {
  const color = facultyAttendanceStatusColor(value)
  return {
    value,
    label: ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === value)!.label,
    shortLabel: ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === value)!.shortLabel,
    points: ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === value)!.points,
    color,
    bg: isDark ? `${color}22` : `${color}14`,
  }
}

export const STATUS_COLORS: Record<string, string> = {
  present: FACULTY_ATTENDANCE_COLOR.present,
  late: FACULTY_ATTENDANCE_COLOR.late,
  excused: FACULTY_ATTENDANCE_COLOR.excused,
  absent: FACULTY_ATTENDANCE_COLOR.absent,
  pending_manual: FACULTY_ATTENDANCE_COLOR.scheduled,
}

export function attendanceStatusLabel(status: string): string {
  return ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export function attendanceStatusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "present") return "success"
  if (status === "late") return "warning"
  if (status === "excused") return "neutral"
  if (status === "absent") return "danger"
  return "neutral"
}

export function formatAttendancePct(value: unknown): string {
  return `${attendanceDisplayPercent(value)}%`
}

function numericCount(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function offeringHasAttendanceActivity(input: {
  meetings?: Array<{ total_attended?: number | string | null }>
  records?: Array<{ id?: number }>
}): boolean {
  if ((input.records ?? []).length > 0) return true
  return (input.meetings ?? []).some((meeting) => numericCount(meeting.total_attended) > 0)
}

/** Roster dumps with 200% / 0 streak / 0 credits are leftover matching, not this term's roll. */
export function facultyAttendanceAnalyticsIsPlaceholder(analytics: AttendanceAnalytics | null): boolean {
  if (!analytics) return true
  if (numericCount(analytics.overall?.total_check_ins) > 0) return false
  const people = [
    ...(analytics.studentSummaries ?? []),
    ...(analytics.topPerformers ?? []),
    ...(analytics.flaggedStudents ?? []),
    ...(analytics.chronicAbsentees ?? []),
  ]
  if (people.length === 0) return numericCount(analytics.overall?.total_sessions) === 0
  return people.every((student) => {
    const pct = numericCount(student.attendance_percentage)
    return (
      numericCount(student.current_streak) === 0 &&
      numericCount(student.credits_earned) === 0 &&
      numericCount(student.absent_count) === 0 &&
      (pct <= 0 || pct > 100)
    )
  })
}

function emptyFacultyAttendanceAnalytics(): AttendanceAnalytics {
  return {
    overall: {
      total_sessions: 0,
      unique_students: 0,
      total_check_ins: 0,
      average_attendance_rate: 0,
    },
    flaggedStudents: [],
    topPerformers: [],
    chronicAbsentees: [],
    excusedStudents: [],
    studentSummaries: [],
    weeklyTrend: [],
    sessionBreakdown: [],
    statusBreakdown: [],
  }
}

/**
 * Fall 2026 ELEG 1301P01 / P02 / 1304P03 have no attendance yet. Hide leftover
 * ranks until this offering has a meeting check-in or a log row.
 */
export function sanitizeFacultyAttendanceAnalytics(
  analytics: AttendanceAnalytics | null,
  input: {
    sectionCode?: string | null
    courseSessionCodes?: readonly string[]
    meetings?: AttendanceSession[]
    records?: AttendanceRecord[]
  } = {},
): AttendanceAnalytics | null {
  if (!analytics) return null
  const fall2026 = isFall2026ElegOffering(input.sectionCode, input.courseSessionCodes ?? [])
  const hasLocalLists = input.meetings != null || input.records != null
  const localActivity = hasLocalLists
    ? offeringHasAttendanceActivity({ meetings: input.meetings, records: input.records })
    : false

  if (fall2026 && hasLocalLists && !localActivity) return emptyFacultyAttendanceAnalytics()
  if (fall2026 && !hasLocalLists && facultyAttendanceAnalyticsIsPlaceholder(analytics)) {
    return emptyFacultyAttendanceAnalytics()
  }
  if (!fall2026 && facultyAttendanceAnalyticsIsPlaceholder(analytics)) {
    return emptyFacultyAttendanceAnalytics()
  }
  return analytics
}

export function formatMeetingDay(iso?: string | null): string {
  if (!iso) return "Unscheduled"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "Unscheduled"
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

export function formatMeetingTimeRange(session: Pick<AttendanceSession, "start_time" | "end_time">): string {
  if (!session.start_time) return ""
  const start = new Date(session.start_time)
  if (Number.isNaN(start.getTime())) return ""
  const startStr = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  if (!session.end_time) return startStr
  const end = new Date(session.end_time)
  if (Number.isNaN(end.getTime())) return startStr
  const endStr = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  return `${startStr} – ${endStr}`
}

export function meetingStatusBadge(session: AttendanceSession): {
  label: string
  tone: "live" | "success" | "danger" | "neutral" | "warning"
} {
  if (session.is_cancelled) return { label: "Cancelled", tone: "danger" }
  const attended = Number(session.total_attended ?? 0)
  if (Number.isFinite(attended) && attended > 0) return { label: "Marked", tone: "success" }
  if (session.is_active) return { label: "QR live", tone: "live" }
  return { label: "Scheduled", tone: "neutral" }
}

export function pickDefaultMeetingSession(sessions: AttendanceSession[]): AttendanceSession | null {
  if (sessions.length === 0) return null
  const sorted = [...sessions].sort((a, b) => {
    const ta = a.start_time ? new Date(a.start_time).getTime() : 0
    const tb = b.start_time ? new Date(b.start_time).getTime() : 0
    return tb - ta
  })
  const active = sorted.find((s) => s.is_active && !s.is_cancelled)
  if (active) return active
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todaySession = sorted.find((s) => {
    if (!s.start_time || s.is_cancelled) return false
    const d = new Date(s.start_time)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })
  return todaySession ?? sorted[0] ?? null
}

export function filterSessionsBySection(sessions: AttendanceSession[], section: string): AttendanceSession[] {
  if (section === "ALL") return sessions
  return sessions.filter((s) => s.section?.trim() === section.trim())
}

export function formatCompactCount(value: number): string {
  if (!Number.isFinite(value)) return "0"
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

export function computeTrendInsight(analytics: AttendanceAnalytics | null) {
  const weeks = analytics?.weeklyTrend ?? []
  if (weeks.length < 2) {
    return {
      title: "Attendance tracking",
      message: "",
      improving: true,
      rateBadge: undefined,
      checkInBadge: undefined,
    }
  }
  const sorted = [...weeks].sort((a, b) => String(a.week).localeCompare(String(b.week)))
  const prev = sorted[sorted.length - 2]
  const latest = sorted[sorted.length - 1]
  const rateDelta = Number(latest?.attendance_rate ?? 0) - Number(prev?.attendance_rate ?? 0)
  const checkDelta = Number(latest?.check_ins ?? 0) - Number(prev?.check_ins ?? 0)
  const improving = rateDelta >= 0
  return {
    title: improving ? "Attendance improving" : "Attendance dipped",
    message: improving
      ? `You're up ${Math.abs(rateDelta).toFixed(1)}% compared to last week.`
      : `Down ${Math.abs(rateDelta).toFixed(1)}% compared to last week — review follow-ups.`,
    improving,
    rateBadge: rateDelta !== 0 ? `${improving ? "↑" : "↓"} ${Math.abs(rateDelta).toFixed(1)}%` : undefined,
    checkInBadge: checkDelta !== 0 ? `${checkDelta > 0 ? "↑" : "↓"} ${formatCompactCount(Math.abs(checkDelta))}` : undefined,
  }
}

export function computeOverviewFromAnalytics(analytics: AttendanceAnalytics | null, rosterSize: number) {
  const overall = analytics?.overall ?? {}
  const summaries = analytics?.studentSummaries ?? []
  const avgRate = summaries.length
    ? summaries.reduce((sum, s) => sum + attendanceDisplayPercent(s.attendance_percentage), 0) / summaries.length
    : attendanceDisplayPercent(overall.average_attendance_rate)

  return {
    meetings: Number(overall.total_sessions ?? 0),
    checkIns: Number(overall.total_check_ins ?? 0),
    roster: rosterSize || Number(overall.unique_students ?? 0),
    avgRate}
}

export function filterRecords(
  records: AttendanceRecord[],
  query: string,
  status: string,
): AttendanceRecord[] {
  const q = query.trim().toLowerCase()
  return records.filter((r) => {
    if (status !== "all" && r.status !== status) return false
    if (!q) return true
    return [r.studentName, r.studentNumber, r.classTitle, r.section]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q)
  })
}

export function resolveRosterSection(input: {
  sectionFilter: string
  courseSessions: { code: string }[]
  selectedMeeting?: { section?: string | null } | null
}): string {
  const fromMeeting = input.selectedMeeting?.section?.trim()
  if (fromMeeting) return fromMeeting
  if (input.sectionFilter !== "ALL") return input.sectionFilter.trim()
  return input.courseSessions[0]?.code?.trim() ?? ""
}

export function rosterFromAttendanceRecords(records: {
  studentId: number
  studentName: string
  studentNumber: string
  section: string
}[]): AttendanceRosterStudent[] {
  const byId = new Map<number, AttendanceRosterStudent>()
  for (const r of records) {
    if (!r.studentId) continue
    byId.set(r.studentId, {
      studentId: r.studentId,
      fullName: r.studentName,
      studentNumber: r.studentNumber,
      section: r.section})
  }
  return [...byId.values()].sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export function filterRosterStudents<
  T extends { fullName: string; studentNumber: string },
>(students: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return students
  return students.filter((s) =>
    [s.fullName, s.studentNumber].join(" ").toLowerCase().includes(q),
  )
}

export function rankFacultyAttendanceStandings(
  analytics: AttendanceAnalytics | null,
): AttendanceStudentSummary[] {
  const pool =
    (analytics?.topPerformers?.length ? analytics.topPerformers : analytics?.studentSummaries) ?? []
  return [...pool]
    .filter((student) => {
      const pct = attendanceDisplayPercent(student.attendance_percentage)
      return pct > 0 || numericCount(student.current_streak) > 0 || numericCount(student.credits_earned) > 0
    })
    .sort((a, b) => {
      const byPct = attendanceDisplayPercent(b.attendance_percentage) - attendanceDisplayPercent(a.attendance_percentage)
      if (byPct !== 0) return byPct
      const byStreak = numericCount(b.current_streak) - numericCount(a.current_streak)
      if (byStreak !== 0) return byStreak
      return numericCount(b.credits_earned) - numericCount(a.credits_earned)
    })
}

export function filterFacultyAttendanceStandings(
  rows: AttendanceStudentSummary[],
  query: string,
): AttendanceStudentSummary[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((student) =>
    [student.full_name, student.student_id].join(" ").toLowerCase().includes(q),
  )
}

export function filterMeetingsBySearch(sessions: AttendanceSession[], query: string): AttendanceSession[] {
  const q = query.trim().toLowerCase()
  if (!q) return sessions
  return sessions.filter((s) =>
    [s.class_title, s.section, formatMeetingDay(s.start_time), formatMeetingTimeRange(s)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q),
  )
}
