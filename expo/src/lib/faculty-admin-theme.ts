import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"
import type { SolidListThumb } from "./solid-list-thumb"

/** Faculty course admin / settings modules — Color Hunt on grouped forms. */
export const FACULTY_ADMIN_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  tabActive: COLOR_HUNT_COOL.indigo,
  ai: COLOR_HUNT_COOL.indigo,
} as const

/** Tighter chip radius — avoid stadium pills in admin forms. */
export const FACULTY_ADMIN_CHIP_RADIUS = 10

export function facultyAdminCourseThumb(courseId: number | string): SolidListThumb {
  return solidListThumbFromHash(`admin-course-${courseId}`)
}

export function facultyAdminTaThumb(taId: number | string): SolidListThumb {
  return solidListThumbFixed(COLOR_HUNT_COOL.cyan)
}

export function adminChipActiveStyle(active: boolean) {
  return active
    ? {
        backgroundColor: `${FACULTY_ADMIN_COLOR.link}18`,
        borderColor: FACULTY_ADMIN_COLOR.link,
      }
    : undefined
}

export function adminChipTextColor(active: boolean, muted: string) {
  return active ? FACULTY_ADMIN_COLOR.link : muted
}
