import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { solidListThumb, solidListThumbFixed, type SolidListThumb } from "./solid-list-thumb"

/** Cora Home — fixed Color Hunt swatch per quick action. */
export const CORA_HOME_QUICK_ACTION_THUMBS: Record<string, SolidListThumb> = {
  "explain-problem": solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  "walk-circuit": solidListThumbFixed(COLOR_HUNT.orange),
  "help-code": solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  "prepare-exam": solidListThumbFixed(COLOR_HUNT.pink),
  "review-homework": solidListThumbFixed(COLOR_HUNT.amber, COLOR_HUNT.ink),
  "generate-flashcards": solidListThumbFixed(COLOR_HUNT.yellow, COLOR_HUNT.ink),
  "summarize-lecture": solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  "create-study-plan": solidListThumbFixed(COLOR_HUNT_COOL.sky, "#1E3A5F"),
}

export function coraHomeQuickActionThumb(actionId: string, index: number): SolidListThumb {
  return CORA_HOME_QUICK_ACTION_THUMBS[actionId] ?? solidListThumb(index)
}

export const CORA_HOME_ACTIVITY_THUMBS = {
  questions: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  streak: solidListThumbFixed(COLOR_HUNT.orange),
  mastered: solidListThumbFixed(COLOR_HUNT.pink),
  progress: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
} as const

export const CORA_HOME_EXPLORE_THUMBS = {
  learn: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  code: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  insights: solidListThumbFixed(COLOR_HUNT.pink),
  studyPlan: solidListThumbFixed(COLOR_HUNT.orange),
} as const

export const CORA_HOME_CREDITS_THUMB = solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink)

export const CORA_HOME_CHALLENGE_THUMBS = {
  practice: solidListThumbFixed(COLOR_HUNT.orange),
  solve: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
} as const
