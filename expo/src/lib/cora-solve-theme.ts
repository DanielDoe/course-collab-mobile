import { hexToRgba } from "../constants/app-themes"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { solidListThumbFixed, type SolidListThumb } from "./solid-list-thumb"

/** Cora Solve tab — fixed Color Hunt swatches. */
export const CORA_SOLVE_THUMBS = {
  hero: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  import: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  camera: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  workspace: solidListThumbFixed(COLOR_HUNT.pink),
} as const

export const CORA_SOLVE_CTA = COLOR_HUNT_COOL.indigo

export function coraSolveSourceSurface(accent: string, active: boolean) {
  return {
    border: active ? accent : hexToRgba(accent, 0.28),
    badgeBg: hexToRgba(accent, 0.14),
  }
}

export type CoraSolveSourceThumb = SolidListThumb
