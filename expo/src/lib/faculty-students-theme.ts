import type { IoniconName } from "@/components/icons/AppIcon"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

export const FACULTY_STUDENTS_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  roster: COLOR_HUNT_COOL.cyan,
  reset: COLOR_HUNT_COOL.indigo,
  request: COLOR_HUNT.pink,
  attempts: COLOR_HUNT_COOL.indigo,
  registered: COLOR_HUNT_COOL.gold,
} as const

export type FacultyStudentsStatusMeta = {
  label: string
  color: string
  icon: IoniconName
}

export function facultyStudentDirectoryThumb(input: {
  student_id?: string | null
  id: number | string
  full_name?: string | null
}): SolidListThumb {
  const seed = `${input.student_id ?? input.id}:${input.full_name ?? ""}`
  return solidListThumbFromHash(seed)
}

export function facultyStudentResetThumb(id: number | string): SolidListThumb {
  return solidListThumbFixed(FACULTY_STUDENTS_COLOR.reset)
}

export function facultyStudentAccountRequestThumb(id: number | string): SolidListThumb {
  return solidListThumbFixed(FACULTY_STUDENTS_COLOR.request)
}

export function facultyStudentDirectoryStatus(status: string): FacultyStudentsStatusMeta {
  const normalized = status.toLowerCase()
  if (normalized === "pending" || normalized === "requested") {
    return { label: "Pending", color: COLOR_HUNT.amber, icon: "time-outline" }
  }
  if (normalized === "approved") {
    return { label: "Approved", color: REPORT_SOLID.correct, icon: "checkmark-circle" }
  }
  if (normalized === "rejected" || normalized === "declined") {
    return { label: status, color: REPORT_SOLID.missed, icon: "close-circle-outline" }
  }
  return { label: status, color: FACULTY_STUDENTS_COLOR.link, icon: "ellipse" }
}
