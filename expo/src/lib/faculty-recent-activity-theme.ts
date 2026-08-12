import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { IoniconName } from "@/components/icons/AppIcon"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

/** Recent Activity — Color Hunt activity rows. */
export const FACULTY_ACTIVITY_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  tabActive: COLOR_HUNT_COOL.indigo,
} as const

const STATUS_THUMBS: Record<string, SolidListThumb> = {
  completed: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  in_progress: solidListThumbFixed(COLOR_HUNT.orange),
  failed: solidListThumbFixed(COLOR_HUNT.pinkDeep),
  pending: solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
}

export function facultyActivityThumb(status?: string, id?: number | string): SolidListThumb {
  const key = (status ?? "").toLowerCase()
  if (STATUS_THUMBS[key]) return STATUS_THUMBS[key]!
  return solidListThumbFromHash(id ?? status ?? "activity")
}

export type FacultyActivityStatusMeta = {
  label: string
  color: string
  icon: IoniconName
}

export function facultyActivityStatusMeta(status?: string): FacultyActivityStatusMeta {
  switch (status) {
    case "submitted":
      return { label: "Submitted", color: FACULTY_ACTIVITY_COLOR.link, icon: "checkmark-circle-outline" }
    case "in_progress":
      return { label: "In progress", color: FACULTY_ACTIVITY_COLOR.action, icon: "time-outline" }
    case "saved_for_later":
      return { label: "Saved", color: COLOR_HUNT_COOL.gold, icon: "bookmark-outline" }
    default:
      return { label: "Activity", color: FACULTY_ACTIVITY_COLOR.tabActive, icon: "pulse-outline" }
  }
}
