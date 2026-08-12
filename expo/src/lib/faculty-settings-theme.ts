import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import {
  SETTINGS_PROFILE_THUMB,
  SETTINGS_ROW_THUMBS,
  SUPPORT_ACTION,
  SUPPORT_COLOR,
  settingsRowThumb,
} from "./support-color-theme"
import { solidListThumbFixed } from "./solid-list-thumb"

/** Faculty Profile & Settings — Color Hunt accents aligned with student settings. */
export const FACULTY_SETTINGS_COLOR = {
  ...SUPPORT_COLOR,
  action: SUPPORT_ACTION.fill,
  actionInk: SUPPORT_ACTION.ink,
  profileThumb: SETTINGS_PROFILE_THUMB,
  rolePill: COLOR_HUNT_COOL.indigo,
  coursePill: COLOR_HUNT_COOL.cyan,
} as const

export const FACULTY_SETTINGS_ROW_THUMBS = {
  ...SETTINGS_ROW_THUMBS,
  "swap-horizontal-outline": solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
} as const

export function facultySettingsRowThumb(icon: string) {
  return FACULTY_SETTINGS_ROW_THUMBS[icon as keyof typeof FACULTY_SETTINGS_ROW_THUMBS] ?? settingsRowThumb(icon)
}
