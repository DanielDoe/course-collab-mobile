import type { IoniconName } from "@/components/icons/AppIcon"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import type { InstructorGroup, InstructorProject } from "./instructor-api"
import {
  collabGroupStatusAccent,
  collabGroupStatusIcon,
  collabListThumb,
  collabProjectStatusAccent,
  collabProjectStatusIcon,
  collabStatusLabel,
} from "./collaboration-list-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed } from "./solid-list-thumb"

/** Faculty groups / projects / course picker — Color Hunt accents on neutral list chrome. */
export const FACULTY_COLLAB_COLOR = {
  action: GRADES_WARM.orange,
  actionInk: "#FFFFFF",
  link: COLOR_HUNT_COOL.cyan,
  tabActive: COLOR_HUNT_COOL.indigo,
  courseThumb: COLOR_HUNT_COOL.indigo,
  nudge: COLOR_HUNT.orange,
  danger: REPORT_SOLID.missed,
} as const

export function facultyCollabGroupThumb(index: number): SolidListThumb {
  return collabListThumb(index)
}

export function facultyCollabProjectThumb(index: number): SolidListThumb {
  return collabListThumb(index)
}

export function facultyCoursePickerThumb(index: number): SolidListThumb {
  return solidListThumbFixed(FACULTY_COLLAB_COLOR.courseThumb)
}

export type FacultyCollabStatusMeta = {
  label: string
  color: string
  icon: IoniconName
}

export function facultyGroupStatusMeta(group: InstructorGroup): FacultyCollabStatusMeta {
  if (group.deleted_at) {
    return { label: "Deleted", color: "#636366", icon: "trash-outline" }
  }
  const thumb = facultyCollabGroupThumb(group.id)
  const label =
    group.status === "pending_update" ? "Update pending" : collabStatusLabel(group.status, group.status)
  return {
    label,
    color: collabGroupStatusAccent(group.status, thumb),
    icon: collabGroupStatusIcon(group.status),
  }
}

export function facultyProjectStatusMeta(project: InstructorProject): FacultyCollabStatusMeta {
  const thumb = facultyCollabProjectThumb(project.id)
  const label =
    project.status === "pending_update"
      ? "Update pending"
      : collabStatusLabel(project.status, project.status)
  return {
    label,
    color: collabProjectStatusAccent(project.status, thumb),
    icon: collabProjectStatusIcon(project.status),
  }
}
