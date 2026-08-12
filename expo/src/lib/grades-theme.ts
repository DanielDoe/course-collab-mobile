import { hexToRgba } from "../constants/app-themes"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { SOLID_THUMB_LOCKED, solidListThumbFixed, type SolidListThumb } from "./solid-list-thumb"
import type { GradeCategoryKey } from "./grades-api"

/**
 * Grades module — Color Hunt palettes.
 * Warm hero: https://colorhunt.co/palette/e73f1efb6c00f9b637ffdd9c
 * Category thumbs: warm + cool accents from other hunts.
 */
export const GRADES_WARM = {
  red: "#E73F1E",
  orange: "#FB6C00",
  gold: "#F9B637",
  cream: "#FFDD9C",
  ink: "#5C2E12",
  inkMuted: "#8B5A2B",
} as const

export const GRADES_CATEGORY_THUMBS: Record<GradeCategoryKey, SolidListThumb> = {
  quiz: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  homework: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  midterm: solidListThumbFixed(GRADES_WARM.orange),
  final: solidListThumbFixed(GRADES_WARM.red),
  project: solidListThumbFixed(GRADES_WARM.gold, GRADES_WARM.ink),
  attendance: solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  classroom: solidListThumbFixed(GRADES_WARM.cream, GRADES_WARM.ink),
  engagement: solidListThumbFixed(COLOR_HUNT_COOL.sky, "#1E3A5F"),
}

export function gradesCategoryThumb(key: GradeCategoryKey, pending = false): SolidListThumb {
  return pending ? SOLID_THUMB_LOCKED : GRADES_CATEGORY_THUMBS[key]
}

export function gradesCategoryAccent(key: GradeCategoryKey): string {
  return GRADES_CATEGORY_THUMBS[key].label
}

/** Score band — warm sunset palette (replaces dull pink). */
export function gradePerformanceColor(score: number): string {
  if (score >= 90) return GRADES_WARM.gold
  if (score >= 80) return GRADES_WARM.orange
  if (score >= 70) return "#F08800"
  if (score >= 60) return "#EF5018"
  return GRADES_WARM.red
}

export function gradePerformanceSoft(score: number, alpha = 0.16): string {
  return hexToRgba(gradePerformanceColor(score), alpha)
}

const LETTER_COLORS: Record<string, string> = {
  "A+": GRADES_WARM.gold,
  A: GRADES_WARM.gold,
  "A-": "#FBB040",
  "B+": "#FB8C00",
  B: GRADES_WARM.orange,
  "B-": "#F08800",
  "C+": "#F08800",
  C: "#EF6A10",
  "C-": "#EF5018",
  "D+": "#EF5018",
  D: GRADES_WARM.red,
  "D-": GRADES_WARM.red,
  F: GRADES_WARM.red,
}

/** Distinct accent per letter grade for hero badge and highlights. */
export function gradeLetterColor(letterLabel: string, score?: number): string {
  const label = letterLabel.trim()
  if (!label || label === "—") {
    return score != null ? gradePerformanceColor(score) : GRADES_WARM.orange
  }
  if (/in progress/i.test(label)) return GRADES_WARM.orange
  return LETTER_COLORS[label.toUpperCase()] ?? (score != null ? gradePerformanceColor(score) : GRADES_WARM.orange)
}

export function gradeLetterStyle(
  letterLabel: string,
  score?: number,
): { color: string; background: string; border: string } {
  const accent = gradeLetterColor(letterLabel, score)
  const label = letterLabel.trim()

  if (/in progress/i.test(label)) {
    return {
      color: "#FFFFFF",
      background: GRADES_WARM.orange,
      border: GRADES_WARM.orange,
    }
  }

  if (!label || label === "—") {
    return {
      color: GRADES_WARM.inkMuted,
      background: hexToRgba(GRADES_WARM.cream, 0.55),
      border: hexToRgba(GRADES_WARM.gold, 0.35),
    }
  }

  const isTopTier = /^A/i.test(label)
  return {
    color: isTopTier ? GRADES_WARM.ink : "#FFFFFF",
    background: accent,
    border: hexToRgba(accent, 0.55),
  }
}

export function gradesHeroGradient(isDark: boolean): [string, string, string] {
  if (isDark) {
    return [
      hexToRgba(GRADES_WARM.orange, 0.24),
      hexToRgba(GRADES_WARM.red, 0.1),
      hexToRgba(GRADES_WARM.gold, 0.14),
    ]
  }
  return [
    hexToRgba(GRADES_WARM.cream, 0.98),
    "#FFFBF3",
    hexToRgba(GRADES_WARM.gold, 0.22),
  ]
}

export const GRADES_COMPARE_ABOVE = GRADES_WARM.gold
export const GRADES_COMPARE_BELOW = GRADES_WARM.red
export const GRADES_PROVISIONAL_ACCENT = GRADES_WARM.orange
export const GRADES_PROVISIONAL_INK = GRADES_WARM.ink
export const GRADES_CONTRIBUTION_TOTAL = GRADES_WARM.orange

/** Muted copy on the warm grades hero — readable on light and dark gradients. */
export function gradesHeroMutedInk(isDark: boolean): string {
  return isDark ? hexToRgba(GRADES_WARM.cream, 0.84) : GRADES_WARM.inkMuted
}

/** Provisional callout banner — theme-aware contrast (P7 light-only banner fix). */
export function gradesProvisionalCallout(isDark: boolean): {
  background: string
  border: string
  ink: string
  icon: string
} {
  if (isDark) {
    return {
      background: hexToRgba(GRADES_WARM.orange, 0.24),
      border: hexToRgba(GRADES_WARM.gold, 0.42),
      ink: GRADES_WARM.cream,
      icon: GRADES_WARM.gold,
    }
  }
  return {
    background: hexToRgba(GRADES_PROVISIONAL_ACCENT, 0.14),
    border: hexToRgba(GRADES_WARM.gold, 0.38),
    ink: GRADES_PROVISIONAL_INK,
    icon: GRADES_PROVISIONAL_INK,
  }
}

export type GradeLens = "pending" | "final"

/** Warm orange (pending) + cool indigo (final) — complementary Color Hunt pair. */
export const GRADES_LENS = {
  pending: GRADES_WARM.orange,
  final: COLOR_HUNT_COOL.indigo,
  pendingInk: "#FFFFFF",
  finalInk: "#FFFFFF",
  pendingMuted: GRADES_WARM.gold,
  finalMuted: COLOR_HUNT_COOL.sky,
} as const

/** Neutral frosted track on the grades hero — no per-tab tint washes. */
export function gradesLensTrackBg(isDark: boolean): string {
  return isDark ? hexToRgba("#FFFFFF", 0.1) : hexToRgba("#FFFFFF", 0.58)
}

export function gradesLensTrackBorder(isDark: boolean): string {
  return isDark ? hexToRgba("#FFFFFF", 0.14) : hexToRgba(GRADES_WARM.ink, 0.08)
}

/** Active tab gets solid Color Hunt fill; inactive stays transparent with muted ink. */
export function gradesLensSegmentStyle(
  lens: GradeLens,
  active: boolean,
  inactiveInk: string,
): { backgroundColor: string; color: string } {
  if (active) {
    const accent = lens === "pending" ? GRADES_LENS.pending : GRADES_LENS.final
    return {
      backgroundColor: accent,
      color: "#FFFFFF",
    }
  }

  return {
    backgroundColor: "transparent",
    color: inactiveInk,
  }
}

/** Category score pill — keeps value readable on dark module surfaces. */
export function gradeScorePillStyle(
  score: number,
  isDark: boolean,
): { background: string; color: string } {
  const color = gradePerformanceColor(score)
  if (isDark) {
    return {
      background: hexToRgba(color, 0.3),
      color,
    }
  }
  return {
    background: gradePerformanceSoft(score, 0.2),
    color,
  }
}
