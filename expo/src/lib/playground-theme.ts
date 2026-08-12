import type { AppThemeTokens } from "../constants/app-themes"
import { hexToRgba } from "../constants/app-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"

/** Color Hunt accents tuned for light + dark appearance modes. */
export function playgroundAccentPalette(tokens: AppThemeTokens) {
  const isDark = tokens.isDark
  return {
    primary: tokens.accent,
    primaryDark: tokens.accentDark,
    primarySoft: hexToRgba(tokens.accent, isDark ? 0.2 : 0.12),
    primaryBorder: hexToRgba(tokens.accent, isDark ? 0.42 : 0.28),
    warm: COLOR_HUNT.orange,
    warmDeep: COLOR_HUNT.orangeDeep,
    cool: COLOR_HUNT_COOL.cyan,
    coolDeep: COLOR_HUNT_COOL.indigo,
    gold: COLOR_HUNT_COOL.gold,
    success: tokens.success,
    danger: tokens.danger,
    label: tokens.text,
    secondaryLabel: tokens.textSecondary,
    tertiaryLabel: tokens.textMuted,
    surface: tokens.surface,
    grouped: tokens.background,
    inset: tokens.elevatedSurface,
    border: tokens.border,
  }
}

export function playgroundJoinColors(tokens: AppThemeTokens) {
  const isDark = tokens.isDark
  return {
    primary: tokens.accent,
    primaryInk: "#FFFFFF",
    secondaryFill: hexToRgba(tokens.accent, isDark ? 0.16 : 0.1),
    secondaryBorder: hexToRgba(tokens.accent, isDark ? 0.38 : 0.24),
    secondaryInk: tokens.accentDark,
  }
}
