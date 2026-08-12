import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

/** Student Progress — Color Hunt student/at-risk cards. */
export const FACULTY_STUDENT_PROGRESS_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  tabActive: COLOR_HUNT_COOL.indigo,
  accuracy: COLOR_HUNT_COOL.indigo,
  atRisk: COLOR_HUNT.pinkDeep,
  success: REPORT_SOLID.correct,
  warning: COLOR_HUNT.orange,
} as const

export function facultyStudentProgressThumb(studentId: number | string): SolidListThumb {
  return solidListThumbFromHash(`student-progress-${studentId}`)
}

export function facultyAtRiskThumb(studentId: number | string): SolidListThumb {
  return solidListThumbFixed(COLOR_HUNT.pinkDeep)
}
