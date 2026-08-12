import type { IoniconName } from "@/components/icons/AppIcon"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

export const FACULTY_OFFICE_HOURS_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  schedule: COLOR_HUNT_COOL.cyan,
  request: COLOR_HUNT_COOL.indigo,
  pending: COLOR_HUNT.amber,
  approved: REPORT_SOLID.correct,
  declined: REPORT_SOLID.missed,
  priorityHigh: REPORT_SOLID.missed,
  priorityMedium: COLOR_HUNT.orange,
  priorityLow: COLOR_HUNT_COOL.indigo,
} as const

export type FacultyOfficeHoursStatusMeta = {
  label: string
  color: string
  icon: IoniconName
}

export function facultyOfficeHoursRequestThumb(seed: string | number): SolidListThumb {
  return solidListThumbFixed(FACULTY_OFFICE_HOURS_COLOR.request)
}

export function facultyOfficeHoursScheduleThumb(dayOfWeek: number): SolidListThumb {
  const cycle = [
    COLOR_HUNT.orange,
    COLOR_HUNT_COOL.cyan,
    COLOR_HUNT_COOL.indigo,
    COLOR_HUNT.pink,
    COLOR_HUNT_COOL.gold,
    COLOR_HUNT.amber,
    COLOR_HUNT_COOL.sky,
  ] as const
  return solidListThumbFixed(cycle[dayOfWeek % cycle.length]!, dayOfWeek >= 5 ? COLOR_HUNT.ink : "#FFFFFF")
}

export function facultyOfficeHoursStudentThumb(seed: string | number): SolidListThumb {
  return solidListThumbFromHash(seed)
}

export function facultyOfficeHoursRequestStatus(status: string): FacultyOfficeHoursStatusMeta {
  const normalized = status.toLowerCase()
  if (normalized === "pending" || normalized === "requested") {
    return { label: status.replace(/_/g, " "), color: FACULTY_OFFICE_HOURS_COLOR.pending, icon: "time-outline" }
  }
  if (normalized === "approved" || normalized === "scheduled" || normalized === "completed") {
    return { label: status.replace(/_/g, " "), color: FACULTY_OFFICE_HOURS_COLOR.approved, icon: "checkmark-circle" }
  }
  if (normalized === "declined" || normalized === "rejected" || normalized === "cancelled") {
    return { label: status.replace(/_/g, " "), color: FACULTY_OFFICE_HOURS_COLOR.declined, icon: "close-circle-outline" }
  }
  return { label: status.replace(/_/g, " "), color: FACULTY_OFFICE_HOURS_COLOR.link, icon: "ellipse" }
}

export function facultyOfficeHoursPriorityColor(priority?: string | null): string {
  const p = (priority ?? "medium").toLowerCase()
  if (p === "urgent" || p === "high") return FACULTY_OFFICE_HOURS_COLOR.priorityHigh
  if (p === "low") return FACULTY_OFFICE_HOURS_COLOR.priorityLow
  return FACULTY_OFFICE_HOURS_COLOR.priorityMedium
}
