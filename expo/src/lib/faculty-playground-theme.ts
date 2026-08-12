import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"
import type { PlaygroundSessionPhase } from "./faculty-playground-utils"

/**
 * Faculty playground — Color Hunt palette
 * Warm: https://colorhunt.co/palette/ff6a1cffda62ffae56f5788b
 * Cool: https://colorhunt.co/palette/ffc349525ea75facd397dde9
 */
export const FACULTY_PLAYGROUND_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  live: COLOR_HUNT.orange,
  lobby: COLOR_HUNT_COOL.gold,
  ended: "#64748b",
  leaderboard: COLOR_HUNT.pink,
  scoreStar: COLOR_HUNT_COOL.gold,
  passcode: COLOR_HUNT_COOL.indigo,
  topic: COLOR_HUNT_COOL.cyan,
  question: COLOR_HUNT_COOL.indigo,
  session: COLOR_HUNT_COOL.cyan,
  success: REPORT_SOLID.correct,
  waiting: COLOR_HUNT.orange,
  playing: COLOR_HUNT_COOL.cyan,
} as const

export function facultyPlaygroundPhaseColor(phase: PlaygroundSessionPhase): string {
  if (phase === "live") return FACULTY_PLAYGROUND_COLOR.live
  if (phase === "lobby") return FACULTY_PLAYGROUND_COLOR.lobby
  return FACULTY_PLAYGROUND_COLOR.ended
}

export function facultyPlaygroundSessionThumb(seed: string): SolidListThumb {
  return solidListThumbFromHash(seed)
}

export function facultyPlaygroundTopicThumb(topic: string): SolidListThumb {
  return solidListThumbFixed(FACULTY_PLAYGROUND_COLOR.topic)
}

export function facultyPlaygroundLeaderboardThumb(seed: string): SolidListThumb {
  return solidListThumbFixed(FACULTY_PLAYGROUND_COLOR.leaderboard)
}

export function formatPlaygroundPasscode(code: string): string {
  return code.trim().toUpperCase().split("").join(" ")
}
