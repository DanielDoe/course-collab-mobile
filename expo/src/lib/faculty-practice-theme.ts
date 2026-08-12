import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

/** Faculty practice hub — Color Hunt accents on neutral grouped list chrome. */
export const FACULTY_PRACTICE_COLOR = {
  action: GRADES_WARM.orange,
  actionInk: "#FFFFFF",
  link: COLOR_HUNT_COOL.cyan,
  tabActive: COLOR_HUNT_COOL.indigo,
  accuracy: COLOR_HUNT_COOL.indigo,
  topicThumb: COLOR_HUNT_COOL.indigo,
  studentThumb: COLOR_HUNT_COOL.cyan,
  activityThumb: COLOR_HUNT.pink,
  analyticsBar: COLOR_HUNT_COOL.cyan,
  trendBar: COLOR_HUNT_COOL.gold,
  challenge: COLOR_HUNT.orange,
  success: REPORT_SOLID.correct,
} as const

export function facultyPracticeTopicThumb(topicKey: string): SolidListThumb {
  return solidListThumbFromHash(topicKey)
}

export function facultyPracticeStudentThumb(studentId: number | string): SolidListThumb {
  return solidListThumbFromHash(`student-${studentId}`)
}

export function facultyPracticeActivityThumb(seed: string): SolidListThumb {
  return solidListThumbFixed(COLOR_HUNT.pink)
}

export function facultyPracticeQuestionThumb(index: number): SolidListThumb {
  const cycle = [
    solidListThumbFixed(COLOR_HUNT_COOL.indigo),
    solidListThumbFixed(COLOR_HUNT_COOL.cyan),
    solidListThumbFixed(COLOR_HUNT.orange),
    solidListThumbFixed(COLOR_HUNT.pink),
  ] as const
  return cycle[index % cycle.length]!
}

export function facultyPracticeDifficultyTone(
  difficulty?: string | null,
): "success" | "warning" | "danger" | "neutral" | "live" {
  const d = (difficulty ?? "").toLowerCase()
  if (d.includes("easy")) return "success"
  if (d.includes("hard")) return "danger"
  if (d.includes("medium") || d.includes("med")) return "warning"
  return "live"
}
