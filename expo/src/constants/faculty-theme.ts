import { BRAND } from "../constants"
import type { SectionTheme } from "./section-themes"

/**
 * Instructor portal — slate base with teal accent.
 * Green/teal is used sparingly (CTAs, avatar, charts, active icon).
 * Typography and surfaces stay neutral so the UI does not feel overwhelmingly green.
 */
export const FACULTY_BRAND = {
  /** Primary action color — buttons, avatar, chart series, spinners */
  accent: "#0d9488",
  accentDark: "#0f766e",
  accentLight: "#14b8a6",

  /** Neutral typography — never use accent for body/headings */
  ink: "#0f172a",
  inkSecondary: "#334155",
  inkMuted: "#64748b",

  /** Neutral surfaces */
  surfaceSoft: "#f8fafc",
  surfaceActive: "#f1f5f9",
  border: "#e2e8f0",
  borderAccent: "rgba(13,148,136,0.22)",

  gold: BRAND.gold,

  /** Hero & promo — slate (not green) */
  heroGradient: ["#1e293b", "#334155", "#475569"] as const,
  /** Action sheets — soft slate hero with a hint of teal */
  sheetHeroGradient: ["#334155", "#3d4f63", "#475569"] as const,
  sheetBg: "#f8fafc",
  promoGradient: ["#334155", "#1e293b", "#0f172a"] as const,
  headerAccentGradient: ["#EAAA00", "#d4a017", "#EAAA00"] as const,

  /** @deprecated use accent — kept for gradual migration */
  emerald: "#0d9488",
  emeraldDark: "#0f172a",
  emeraldLight: "#64748b",
  emeraldSoft: "#f8fafc",
  emeraldBorder: "#e2e8f0",
  navActiveBg: "#f1f5f9"} as const

function facultyTheme(id: string, label: string): SectionTheme {
  return {
    id,
    label,
    primary: FACULTY_BRAND.accent,
    primaryDark: FACULTY_BRAND.ink,
    primaryLight: FACULTY_BRAND.inkMuted,
    soft: FACULTY_BRAND.surfaceSoft,
    softBorder: FACULTY_BRAND.border,
    gradient: ["#475569", "#334155", "#1e293b"],
    navActiveBg: FACULTY_BRAND.surfaceActive,
    navActiveBorder: FACULTY_BRAND.border}
}

/** Single unified theme for all instructor modules & chrome. */
export const FACULTY_THEME = facultyTheme("faculty", "Faculty")

export function getFacultyModuleTheme(_moduleId?: string): SectionTheme {
  return FACULTY_THEME
}
