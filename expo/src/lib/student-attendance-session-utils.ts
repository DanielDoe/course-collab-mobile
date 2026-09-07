const TZ = "America/Chicago"

export type StudentCheckInStatus = "cancelled" | "checked_in" | "upcoming" | "open" | "closed"

export function formatSessionDayLabel(startTime: string): string {
  const d = new Date(startTime)
  if (Number.isNaN(d.getTime())) return "Session"
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: TZ,
  })
}

export function formatSessionTimeRange(startTime: string, endTime: string): string {
  const start = new Date(startTime)
  const end = new Date(endTime)
  if (Number.isNaN(start.getTime())) return ""
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ })
  const endStr = Number.isNaN(end.getTime()) ? "" : fmt(end)
  return endStr ? `${fmt(start)} – ${endStr}` : fmt(start)
}

export function formatSessionMonthGroup(startTime: string): string {
  const d = new Date(startTime)
  if (Number.isNaN(d.getTime())) return "Unscheduled"
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: TZ })
}

export function sessionStatusBadge(
  status: StudentCheckInStatus,
  recordStatus?: string | null,
): { label: string; tone: "success" | "warning" | "danger" | "neutral" | "live" } {
  const rs = String(recordStatus ?? "").toLowerCase()
  if (rs === "absent") return { label: "Missed", tone: "danger" }
  if (status === "checked_in") {
    if (rs === "late") return { label: "Late", tone: "warning" }
    if (rs === "excused") return { label: "Excused", tone: "neutral" }
    return { label: "Present", tone: "success" }
  }
  switch (status) {
    case "open":
      return { label: "Open", tone: "live" }
    case "upcoming":
      return { label: "Upcoming", tone: "neutral" }
    case "cancelled":
      return { label: "Cancelled", tone: "warning" }
    default:
      return { label: "Closed", tone: "neutral" }
  }
}

export function isStructuredSession(session: {
  sessionType?: string | null
  selfCheckInEnabled?: boolean
}): boolean {
  return session.sessionType === "STRUCTURED_COURSECOLLAB" || session.selfCheckInEnabled === true
}

export function isAttendedSessionStatus(status: string): boolean {
  const s = status.toLowerCase()
  return s === "present" || s === "late" || s === "excused"
}

export function attendanceRecordStatusLabel(status: string): string {
  const map: Record<string, string> = {
    present: "Present",
    late: "Late",
    excused: "Excused",
    absent: "Absent",
  }
  return map[status.toLowerCase()] ?? status
}
