import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"

export type SolidListThumb = {
  fill: string
  icon: string
  label: string
}

/**
 * Shared solid icon tiles — Color Hunt palettes.
 * Warm: https://colorhunt.co/palette/ff6a1cffda62ffae56f5788b
 * Cool: https://colorhunt.co/palette/ffc349525ea75facd397dde9
 */
export const SOLID_THUMB_CYCLE: SolidListThumb[] = [
  { fill: COLOR_HUNT_COOL.indigo, icon: "#FFFFFF", label: COLOR_HUNT_COOL.indigo },
  { fill: COLOR_HUNT.orange, icon: "#FFFFFF", label: COLOR_HUNT.orange },
  { fill: COLOR_HUNT_COOL.cyan, icon: "#FFFFFF", label: COLOR_HUNT_COOL.cyan },
  { fill: COLOR_HUNT.pink, icon: "#FFFFFF", label: COLOR_HUNT.pink },
  { fill: COLOR_HUNT_COOL.gold, icon: COLOR_HUNT.ink, label: COLOR_HUNT_COOL.gold },
  { fill: COLOR_HUNT.amber, icon: COLOR_HUNT.ink, label: COLOR_HUNT.amber },
  { fill: COLOR_HUNT_COOL.sky, icon: "#1E3A5F", label: COLOR_HUNT_COOL.sky },
  { fill: COLOR_HUNT.yellow, icon: COLOR_HUNT.ink, label: COLOR_HUNT.yellow },
]

export const SOLID_THUMB_LOCKED: SolidListThumb = {
  fill: "#636366",
  icon: "rgba(255,255,255,0.78)",
  label: "#98989D",
}

export const SOLID_THUMB_EMPTY: SolidListThumb = {
  fill: "#8E8E93",
  icon: "#FFFFFF",
  label: "#98989D",
}

export const SOLID_THUMB_SUCCESS: SolidListThumb = {
  fill: "#34C759",
  icon: "#FFFFFF",
  label: "#34C759",
}

export function solidListThumb(index: number, options?: { locked?: boolean }): SolidListThumb {
  if (options?.locked) return SOLID_THUMB_LOCKED
  const slot = ((index % SOLID_THUMB_CYCLE.length) + SOLID_THUMB_CYCLE.length) % SOLID_THUMB_CYCLE.length
  return SOLID_THUMB_CYCLE[slot]!
}

export function solidListThumbFromHash(key: string | number, options?: { locked?: boolean }): SolidListThumb {
  const raw = String(key)
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  }
  return solidListThumb(hash, options)
}

export function solidListThumbFixed(fill: string, icon = "#FFFFFF"): SolidListThumb {
  return { fill, icon, label: fill }
}

export function solidListThumbFromAccent(accent: string): SolidListThumb {
  return solidListThumbFixed(accent, "#FFFFFF")
}
