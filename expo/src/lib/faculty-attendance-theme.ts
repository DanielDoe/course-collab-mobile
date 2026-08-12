import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"
import type { AttendanceStatus } from "./faculty-attendance-utils"
import type { AttendanceSession } from "./instructor-api"
import type { IoniconName } from "@/components/icons/AppIcon"
import { meetingStatusBadge } from "./faculty-attendance-utils"

/**
 * Faculty attendance — Color Hunt palette on neutral grouped list chrome.
 */
export const FACULTY_ATTENDANCE_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  present: REPORT_SOLID.correct,
  absent: REPORT_SOLID.missed,
  late: COLOR_HUNT.orange,
  excused: COLOR_HUNT_COOL.cyan,
  live: REPORT_SOLID.correct,
  meeting: COLOR_HUNT_COOL.indigo,
  scheduled: COLOR_HUNT_COOL.sky,
  trend: COLOR_HUNT_COOL.gold,
  roll: COLOR_HUNT_COOL.sky,
  cancelled: REPORT_SOLID.missed,
  marked: REPORT_SOLID.correct,
} as const

const STATUS_FILL: Record<AttendanceStatus, string> = {
  present: FACULTY_ATTENDANCE_COLOR.present,
  absent: FACULTY_ATTENDANCE_COLOR.absent,
  late: FACULTY_ATTENDANCE_COLOR.late,
  excused: FACULTY_ATTENDANCE_COLOR.excused,
}

export function facultyAttendanceStatusColor(status: AttendanceStatus | string): string {
  if (status in STATUS_FILL) return STATUS_FILL[status as AttendanceStatus]
  if (status === "pending_manual") return FACULTY_ATTENDANCE_COLOR.scheduled
  return FACULTY_ATTENDANCE_COLOR.meeting
}

export function facultyAttendanceStatusIcon(status: AttendanceStatus | string): IoniconName {
  if (status === "present") return "checkmark-circle-outline"
  if (status === "late") return "time-outline"
  if (status === "excused") return "document-text-outline"
  if (status === "absent") return "close-circle-outline"
  return "ellipse"
}

export function facultyAttendanceMeetingStatusMeta(session: AttendanceSession): {
  label: string
  color: string
  icon: IoniconName
} {
  const badge = meetingStatusBadge(session)
  if (badge.tone === "danger") {
    return { label: badge.label, color: FACULTY_ATTENDANCE_COLOR.cancelled, icon: "close-circle-outline" }
  }
  if (badge.tone === "success") {
    return { label: badge.label, color: FACULTY_ATTENDANCE_COLOR.marked, icon: "checkmark-circle-outline" }
  }
  if (badge.tone === "live") {
    return { label: badge.label, color: FACULTY_ATTENDANCE_COLOR.live, icon: "radio-outline" }
  }
  return { label: badge.label, color: FACULTY_ATTENDANCE_COLOR.scheduled, icon: "calendar-outline" }
}

export function facultyAttendanceMeetingThumb(seed: string | number): SolidListThumb {
  return solidListThumbFromHash(String(seed))
}

export function facultyAttendanceStudentThumb(seed: string | number): SolidListThumb {
  return solidListThumbFixed(FACULTY_ATTENDANCE_COLOR.roll)
}
