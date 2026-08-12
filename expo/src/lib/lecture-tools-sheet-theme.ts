import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed } from "./solid-list-thumb"

/** Slide tools sheet — fixed Color Hunt swatches per action. */
export const LECTURE_TOOLS_HERO: SolidListThumb = solidListThumbFixed(COLOR_HUNT_COOL.indigo)

export const LECTURE_TOOLS_HERO_ICON: SolidListThumb = solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink)

export const LECTURE_TOOL_THUMBS = {
  samplePractice: solidListThumbFixed(COLOR_HUNT.pink),
  workspace: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  download: solidListThumbFixed(COLOR_HUNT.orange),
  external: solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
} as const

export const LECTURE_TOOL_SECTION_ACCENT = {
  onSlides: COLOR_HUNT.pink,
  slideDeck: COLOR_HUNT.orange,
} as const

/** Done button + chrome accent on the sheet. */
export const LECTURE_TOOLS_CHROME_ACCENT = COLOR_HUNT.orange

export const LECTURE_TOOLS_PILL = {
  practice: { fill: COLOR_HUNT.amber, text: COLOR_HUNT.ink },
  workspace: { fill: COLOR_HUNT_COOL.sky, text: "#1E3A5F" },
} as const
