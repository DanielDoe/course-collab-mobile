import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed } from "./solid-list-thumb"

export type CoraNavSolidThumb = SolidListThumb

/** Cora Learn — fixed Color Hunt swatch per tool. */
export const CORA_LEARN_THUMBS = {
  lectures: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  practice: solidListThumbFixed(COLOR_HUNT.orange),
  flashcards: solidListThumbFixed(COLOR_HUNT.pink),
  summarize: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
} as const

export type CoraLearnActionId = keyof typeof CORA_LEARN_THUMBS
