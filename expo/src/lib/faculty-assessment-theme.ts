import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"
import type { AssessmentType } from "./faculty-assessment-utils"

/**
 * Faculty assessments (quizzes, homework, mid-semester, final exams) — Color Hunt palette.
 * Warm: https://colorhunt.co/palette/ff6a1cffda62ffae56f5788b
 * Cool: https://colorhunt.co/palette/ffc349525ea75facd397dde9
 */
export const FACULTY_ASSESSMENT_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  live: REPORT_SOLID.correct,
  closed: "#64748b",
  window: COLOR_HUNT.orange,
  section: COLOR_HUNT_COOL.sky,
  question: COLOR_HUNT.pink,
  quiz: COLOR_HUNT_COOL.indigo,
  homework: COLOR_HUNT_COOL.cyan,
  midSemester: COLOR_HUNT_COOL.indigo,
  final: COLOR_HUNT_COOL.gold,
  issue: COLOR_HUNT.orange,
  deleted: REPORT_SOLID.missed,
} as const

const ASSESSMENT_TYPE_FILL: Record<AssessmentType, string> = {
  quiz: FACULTY_ASSESSMENT_COLOR.quiz,
  homework: FACULTY_ASSESSMENT_COLOR.homework,
  mid_semester: FACULTY_ASSESSMENT_COLOR.midSemester,
  final: FACULTY_ASSESSMENT_COLOR.final,
}

export function facultyAssessmentThumb(seed: string | number, type?: AssessmentType): SolidListThumb {
  if (type) return solidListThumbFixed(ASSESSMENT_TYPE_FILL[type])
  return solidListThumbFromHash(String(seed))
}

export function facultyAssessmentTypeColor(type: AssessmentType): string {
  return ASSESSMENT_TYPE_FILL[type]
}
