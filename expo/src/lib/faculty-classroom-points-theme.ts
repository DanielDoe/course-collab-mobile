import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

/**
 * Faculty classroom points — Color Hunt palette.
 * Warm: https://colorhunt.co/palette/ff6a1cffda62ffae56f5788b
 * Cool: https://colorhunt.co/palette/ffc349525ea75facd397dde9
 */
export const FACULTY_CLASSROOM_POINTS_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  points: COLOR_HUNT_COOL.gold,
  pending: COLOR_HUNT.orange,
  approved: REPORT_SOLID.correct,
  rejected: REPORT_SOLID.missed,
  assignment: COLOR_HUNT_COOL.indigo,
  practice: COLOR_HUNT.pink,
  leaderboard: COLOR_HUNT_COOL.cyan,
  award: COLOR_HUNT_COOL.sky,
  code: COLOR_HUNT_COOL.indigo,
  solution: COLOR_HUNT.amber,
  ai: COLOR_HUNT_COOL.indigo,
  queue: COLOR_HUNT.orange,
} as const

/** Overview KPI tiles — one vibrant solid thumb per metric. */
export const FACULTY_CLASSROOM_POINTS_KPI_THUMBS = {
  pending: solidListThumbFixed(COLOR_HUNT.orange),
  students: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  awarded: solidListThumbFixed(COLOR_HUNT_COOL.gold),
  tasks: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  practice: solidListThumbFixed(COLOR_HUNT.pink),
  leaderboard: solidListThumbFixed(COLOR_HUNT.yellow, COLOR_HUNT.ink),
} as const

export function facultyClassroomPointThumb(seed: string | number): SolidListThumb {
  return solidListThumbFromHash(String(seed))
}

export function facultyClassroomAssignmentThumb(seed: string | number): SolidListThumb {
  return solidListThumbFixed(FACULTY_CLASSROOM_POINTS_COLOR.assignment)
}

export function facultyClassroomPracticeThumb(seed: string | number): SolidListThumb {
  return solidListThumbFixed(FACULTY_CLASSROOM_POINTS_COLOR.practice)
}

export function facultyClassroomLeaderboardThumb(seed: string | number): SolidListThumb {
  return solidListThumbFromHash(String(seed))
}

export function facultyClassroomAwardThumb(seed: string | number): SolidListThumb {
  return solidListThumbFixed(FACULTY_CLASSROOM_POINTS_COLOR.award)
}

export function facultyClassroomSubmissionThumb(
  category: string | undefined,
  seed: string | number,
): SolidListThumb {
  if (category === "solution_submission") {
    return solidListThumbFixed(FACULTY_CLASSROOM_POINTS_COLOR.solution)
  }
  return solidListThumbFromHash(String(seed))
}
