import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

/**
 * Faculty question bank — Color Hunt palette.
 */
export const FACULTY_QUESTION_BANK_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  topic: COLOR_HUNT_COOL.indigo,
  type: COLOR_HUNT.orange,
  question: COLOR_HUNT_COOL.cyan,
  ai: COLOR_HUNT_COOL.indigo,
  deleted: REPORT_SOLID.missed,
  diagram: COLOR_HUNT.pink,
  easy: REPORT_SOLID.correct,
  medium: COLOR_HUNT.orange,
  hard: REPORT_SOLID.missed,
} as const

export function facultyQuestionBankTopicThumb(seed: string): SolidListThumb {
  return solidListThumbFixed(FACULTY_QUESTION_BANK_COLOR.topic)
}

export function facultyQuestionBankQuestionThumb(seed: string | number): SolidListThumb {
  return solidListThumbFromHash(String(seed))
}

export function facultyQuestionBankTypeThumb(): SolidListThumb {
  return solidListThumbFixed(FACULTY_QUESTION_BANK_COLOR.type)
}

export function facultyQuestionBankDifficultyColor(difficulty?: string | null): string {
  const d = (difficulty ?? "medium").toLowerCase()
  if (d.includes("easy")) return FACULTY_QUESTION_BANK_COLOR.easy
  if (d.includes("hard")) return FACULTY_QUESTION_BANK_COLOR.hard
  return FACULTY_QUESTION_BANK_COLOR.medium
}
