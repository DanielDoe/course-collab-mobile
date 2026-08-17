import type { AppThemeTokens } from "../constants/app-themes"
import { hexToRgba } from "../constants/app-themes"
import { GRADES_WARM } from "./grades-theme"

/**
 * Assessment report solids — Color Hunt inspired semantic palette.
 * Green success · orange pending · red missed · gold/orange/red performance bands.
 * @see https://colorhunt.co/palette/e73f1efb6c00f9b637ffdd9c
 * @see https://colorhunt.co/palette/22c55e16a34a14532df8fafc
 */
export const REPORT_SOLID = {
  correct: "#22C55E",
  correctInk: "#FFFFFF",
  missed: "#EF4444",
  missedDeep: "#E73F1E",
  missedInk: "#FFFFFF",
  pending: "#FB6C00",
  pendingInk: "#FFFFFF",
  skipped: "#64748B",
  skippedInk: "#FFFFFF",
  excellent: "#22C55E",
  /** Saturated orange — white text (not pale gold #F9B637) */
  good: "#FB6C00",
  fair: "#E73F1E",
  poor: "#DC2626",
  onDark: "#FFFFFF",
  onDarkMuted: "rgba(255,255,255,0.86)",
  badgeWash: "rgba(255,255,255,0.24)",
  badgeWashBorder: "rgba(255,255,255,0.38)",
  selectedRing: "rgba(255,255,255,0.92)",
} as const

export type ReportQuestionStatus = "correct" | "incorrect" | "pending" | "skipped"

export type ReportSectionTheme = {
  bg: string
  border: string
  title: string
  muted: string
  pct: string
  badge: string
  badgeText: string
}

/** Performance band accent for donuts, bars, and section cards. */
export function reportPerformanceColor(pct: number): string {
  if (pct >= 90) return REPORT_SOLID.excellent
  if (pct >= 70) return REPORT_SOLID.good
  if (pct >= 50) return REPORT_SOLID.fair
  return REPORT_SOLID.poor
}

function sectionThemeForBand(
  bg: string,
  ink: string,
  muted: string,
  badge: string,
): ReportSectionTheme {
  return {
    bg,
    border: bg,
    title: ink,
    muted,
    pct: ink,
    badge,
    badgeText: ink,
  }
}

/** Solid fill section card — white type on every performance band. */
export function reportSectionTheme(pct: number, _tokens: AppThemeTokens): ReportSectionTheme {
  const bg = reportPerformanceColor(pct)
  return sectionThemeForBand(
    bg,
    REPORT_SOLID.onDark,
    REPORT_SOLID.onDarkMuted,
    REPORT_SOLID.badgeWash,
  )
}

export function reportStatusMeta(status: ReportQuestionStatus, _tokens: AppThemeTokens) {
  switch (status) {
    case "correct":
      return {
        label: "Correct",
        icon: "checkmark-circle" as const,
        bg: REPORT_SOLID.correct,
        text: REPORT_SOLID.correctInk,
      }
    case "pending":
      return {
        label: "Pending",
        icon: "time" as const,
        bg: REPORT_SOLID.pending,
        text: REPORT_SOLID.pendingInk,
      }
    case "skipped":
      return {
        label: "Skipped",
        icon: "remove-circle-outline" as const,
        bg: REPORT_SOLID.skipped,
        text: REPORT_SOLID.skippedInk,
      }
    default:
      return {
        label: "Missed",
        icon: "close-circle" as const,
        bg: REPORT_SOLID.missed,
        text: REPORT_SOLID.missedInk,
      }
  }
}

export function reportDonutInnerFill(tokens: AppThemeTokens, showPnd: boolean, pct = 0): string {
  if (showPnd) {
    return hexToRgba(REPORT_SOLID.pending, tokens.isDark ? 0.18 : 0.12)
  }
  return hexToRgba(reportPerformanceColor(pct), tokens.isDark ? 0.2 : 0.12)
}

export function reportDonutTrackStroke(tokens: AppThemeTokens): string {
  return hexToRgba(tokens.textMuted, tokens.isDark ? 0.28 : 0.14)
}

export function reportCodeBlockColors(tokens: AppThemeTokens) {
  if (tokens.isDark) {
    return {
      bg: hexToRgba(tokens.text, 0.1),
      text: tokens.text,
    }
  }
  return {
    bg: "#1e293b",
    text: "#f1f5f9",
  }
}

export type OptionRowState = {
  isSelected: boolean
  isCorrect: boolean
}

export function reportOptionRowColors(state: OptionRowState, tokens: AppThemeTokens) {
  const { isSelected, isCorrect } = state
  if (isSelected && isCorrect) {
    return {
      bg: REPORT_SOLID.correct,
      border: REPORT_SOLID.correct,
      text: REPORT_SOLID.correctInk,
    }
  }
  if (isSelected) {
    return {
      bg: REPORT_SOLID.missed,
      border: REPORT_SOLID.missedDeep,
      text: REPORT_SOLID.missedInk,
    }
  }
  if (isCorrect) {
    return {
      bg: hexToRgba(REPORT_SOLID.correct, tokens.isDark ? 0.28 : 0.14),
      border: REPORT_SOLID.correct,
      text: tokens.text,
    }
  }
  return {
    bg: tokens.isDark ? tokens.native.fill : hexToRgba(GRADES_WARM.cream, 0.45),
    border: tokens.border,
    text: tokens.textSecondary,
  }
}

export function reportAnswerBlockColors(
  tone: "good" | "bad" | "info" | "neutral",
  tokens: AppThemeTokens,
) {
  switch (tone) {
    case "good":
      return {
        bg: hexToRgba(REPORT_SOLID.correct, tokens.isDark ? 0.22 : 0.12),
        border: REPORT_SOLID.correct,
      }
    case "bad":
      return {
        bg: hexToRgba(REPORT_SOLID.missed, tokens.isDark ? 0.22 : 0.12),
        border: REPORT_SOLID.missed,
      }
    case "info":
      return {
        bg: hexToRgba(REPORT_SOLID.pending, tokens.isDark ? 0.22 : 0.12),
        border: REPORT_SOLID.pending,
      }
    default:
      return {
        bg: tokens.isDark ? tokens.native.fill : hexToRgba(GRADES_WARM.cream, 0.45),
        border: tokens.border,
      }
  }
}

export function reportBadgeColors(
  tone: "good" | "bad" | "info" | "neutral",
  tokens: AppThemeTokens,
) {
  switch (tone) {
    case "good":
      return {
        bg: REPORT_SOLID.correct,
        text: REPORT_SOLID.correctInk,
        border: REPORT_SOLID.correct,
      }
    case "bad":
      return {
        bg: REPORT_SOLID.missed,
        text: REPORT_SOLID.missedInk,
        border: REPORT_SOLID.missedDeep,
      }
    case "info":
      return {
        bg: REPORT_SOLID.pending,
        text: REPORT_SOLID.pendingInk,
        border: REPORT_SOLID.pending,
      }
    default:
      return {
        bg: REPORT_SOLID.skipped,
        text: REPORT_SOLID.skippedInk,
        border: REPORT_SOLID.skipped,
      }
  }
}

/**
 * Badge palette for a badge sitting *on* a solid status fill (selected option rows,
 * section cards). A tone-colored badge on a same-tone row is invisible — wash it instead.
 */
export function reportOnSolidBadgeColors(ink: string) {
  return {
    bg: REPORT_SOLID.badgeWash,
    text: ink,
    border: REPORT_SOLID.badgeWashBorder,
  }
}

export function reportCorrectAccent(_tokens: AppThemeTokens): string {
  return REPORT_SOLID.correct
}

export function reportCorrectPillStyle(_tokens: AppThemeTokens) {
  return {
    backgroundColor: REPORT_SOLID.correct,
    color: REPORT_SOLID.correctInk,
  }
}
