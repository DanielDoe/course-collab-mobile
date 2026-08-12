import type { AppThemeTokens } from "../constants/app-themes"
import { hexToRgba } from "../constants/app-themes"
import type { SectionTheme } from "../constants/section-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed } from "./solid-list-thumb"

export type SupportFormKind = "support" | "bug" | "feature"

/**
 * Settings & Support — Color Hunt accents.
 * Card containers stay neutral; color applies to icon tiles, CTAs, and status chips.
 */
export const SUPPORT_COLOR = {
  primary: COLOR_HUNT_COOL.indigo,
  secondary: COLOR_HUNT_COOL.cyan,
  action: GRADES_WARM.orange,
  actionInk: "#FFFFFF",
  success: REPORT_SOLID.correct,
} as const

export const SUPPORT_ACTION = {
  fill: SUPPORT_COLOR.action,
  ink: SUPPORT_COLOR.actionInk,
} as const

export const SETTINGS_PROFILE_THUMB = solidListThumbFixed(COLOR_HUNT_COOL.indigo)

export const SETTINGS_ROW_THUMBS: Record<string, SolidListThumb> = {
  "person-outline": solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  "lock-closed-outline": solidListThumbFixed(COLOR_HUNT.orange),
  "diamond-outline": solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  "notifications-outline": solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  "color-palette-outline": solidListThumbFixed(COLOR_HUNT.pink),
  "help-circle-outline": solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  "megaphone-outline": solidListThumbFixed(COLOR_HUNT.orange),
  "chatbubbles-outline": solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  "calendar-outline": solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  "sunny-outline": solidListThumbFixed(COLOR_HUNT.amber, COLOR_HUNT.ink),
  "book-outline": solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  "school-outline": solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  "options-outline": solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  "sparkles-outline": solidListThumbFixed(COLOR_HUNT.amber, COLOR_HUNT.ink),
  "alert-circle-outline": solidListThumbFixed(COLOR_HUNT.orange),
  "shield-checkmark-outline": solidListThumbFixed(COLOR_HUNT.pink),
  "scale-outline": solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  "mail-outline": solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  "chatbubble-ellipses-outline": solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  "information-circle-outline": solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  "swap-horizontal-outline": solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
}

export const HELP_CENTER_SECTION = {
  quickActions: solidListThumbFixed(COLOR_HUNT.orange),
  faq: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
} as const

export const HELP_CENTER_LINK_THUMBS: Record<string, SolidListThumb> = {
  "send-outline": solidListThumbFixed(COLOR_HUNT.orange),
  "bug-outline": solidListThumbFixed(COLOR_HUNT.pink),
  "sparkles-outline": solidListThumbFixed(COLOR_HUNT.amber, COLOR_HUNT.ink),
  "diamond-outline": solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  "settings-outline": solidListThumbFixed(COLOR_HUNT_COOL.indigo),
}

export const SUPPORT_FORM_THUMBS: Record<
  SupportFormKind,
  { form: SolidListThumb; tips: SolidListThumb }
> = {
  support: {
    form: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
    tips: solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  },
  bug: {
    form: solidListThumbFixed(COLOR_HUNT.orange),
    tips: solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  },
  feature: {
    form: solidListThumbFixed(COLOR_HUNT.pink),
    tips: solidListThumbFixed(COLOR_HUNT.amber, COLOR_HUNT.ink),
  },
}

export const SUPPORT_TIP_INFO = solidListThumbFixed(COLOR_HUNT_COOL.cyan)

export function supportThemeFromTokens(tokens: AppThemeTokens): SectionTheme {
  const primary = SUPPORT_COLOR.primary
  const soft = hexToRgba(primary, tokens.isDark ? 0.24 : 0.14)
  const softBorder = hexToRgba(primary, tokens.isDark ? 0.4 : 0.28)
  return {
    id: "support",
    label: "Support",
    primary,
    primaryDark: "#3D4578",
    primaryLight: COLOR_HUNT_COOL.cyan,
    soft,
    softBorder,
    gradient: ["#3D4578", primary, COLOR_HUNT_COOL.cyan],
    navActiveBg: soft,
    navActiveBorder: softBorder,
    ink: tokens.text,
  }
}

export function settingsRowThumb(icon: string): SolidListThumb {
  return SETTINGS_ROW_THUMBS[icon] ?? solidListThumbFixed(SUPPORT_COLOR.primary)
}

export function helpCenterLinkThumb(icon: string): SolidListThumb {
  return HELP_CENTER_LINK_THUMBS[icon] ?? solidListThumbFixed(SUPPORT_COLOR.primary)
}
