import { Platform } from "react-native"
import { BRAND } from "../constants"
import type { SectionTheme } from "./section-themes"
import { NATIVE } from "./faculty-native-theme"

/**
 * PVAMU student portal — royal purple + gold (no iOS system purple).
 *
 * System purple (#AF52DE) reads pink/lavender; we use PVAMU's cool royal family instead:
 * - **Brand** (#582c83): CTAs, primary buttons, ink accents
 * - **Royal** (#7a4eba): drawer icons, links, active tints — vivid but institutional
 * - **Gold**: membership dots, promo stripes (sparingly)
 * - **Ink**: neutral labels — never purple body text
 */
export const STUDENT_BRAND = {
  /** PVAMU institutional purple — primary buttons & brand gradients */
  purple: BRAND.purple,
  purpleLight: BRAND.purpleLight,
  purpleDark: BRAND.purpleDark,

  /** Royal PVAMU accent — interactive UI (cool violet, not pink system purple) */
  uiPurple: BRAND.purpleLight,
  uiPurpleSoft: "#f2e8fc",
  uiPurpleBorder: "#d4c4e8",
  uiPurpleMid: BRAND.purple,

  /** PVAMU gold — accent only */
  gold: BRAND.gold,
  goldDark: "#c99200",
  goldSoft: "rgba(234, 170, 0, 0.14)",
  goldBorder: "rgba(234, 170, 0, 0.28)",

  /** CTAs & primary actions — brand purple */
  accent: BRAND.purple,
  accentLight: BRAND.purpleLight,
  accentDark: BRAND.purpleDark,
  accentSoft: "#f2e8fc",
  accentSoftStrong: "rgba(88, 44, 131, 0.12)",
  accentBorder: "#d4c4e8",

  /** Neutral typography & surfaces (iOS grouped list) */
  ink: "#0f172a",
  inkSecondary: "#334155",
  inkMuted: "#64748b",
  surfaceSoft: "#f8fafc",
  surfaceActive: "#f1f5f9",
  surfaceGrouped: NATIVE.groupedBackground,
  border: "#e2e8f0",
  borderAccent: "#d4c4e8",

  /** Drawer / hero */
  headerAccentGradient: ["#EAAA00", "#d4a017", "#EAAA00"] as const,
  heroGradient: [BRAND.purpleDark, BRAND.purple, BRAND.purpleLight] as const,
  heroGradientSoft: ["#f2e8fc", "#faf8fc", "#fffbeb"] as const,
  sheetHeroGradient: [BRAND.purpleDark, BRAND.purple, BRAND.purpleLight] as const,
  promoGradient: [BRAND.purpleDark, BRAND.purple, "#4a2469"] as const,
  iconGradient: [BRAND.purpleDark, BRAND.purple, BRAND.purpleLight] as const,
  sheetBg: "#f8fafc",
  navActiveBg: "#f2e8fc",
  navCanvas: NATIVE.groupedBackground,
} as const

/** Student accent tokens — drop-in for NATIVE.accent in student screens only. */
export const STUDENT_NATIVE = {
  /** Primary buttons — PVAMU brand */
  accent: STUDENT_BRAND.accent,
  accentLight: STUDENT_BRAND.accentLight,
  accentDark: STUDENT_BRAND.accentDark,
  /** Icons, links, chips — royal PVAMU (not system pink-purple) */
  uiAccent: STUDENT_BRAND.uiPurple,
  accentSoft: STUDENT_BRAND.accentSoft,
  accentSoftStrong: STUDENT_BRAND.accentSoftStrong,
  accentBorder: STUDENT_BRAND.accentBorder,
  gold: STUDENT_BRAND.gold,
  goldSoft: STUDENT_BRAND.goldSoft,
  tint: STUDENT_BRAND.uiPurple,
  groupedBackground: NATIVE.groupedBackground,
  secondaryGrouped: NATIVE.secondaryGrouped,
  separator: NATIVE.separator,
  label: NATIVE.label,
  secondaryLabel: NATIVE.secondaryLabel,
  tertiaryLabel: NATIVE.tertiaryLabel,
  destructive: NATIVE.destructive,
  fill: NATIVE.fill,
  sectionRadius: NATIVE.sectionRadius,
  rowMinHeight: NATIVE.rowMinHeight,
  raisedShadow: NATIVE.raisedShadow,
} as const

/** iOS chrome overrides for student shell (top bar, sheets). */
export const studentChrome = {
  headerBg: Platform.OS === "ios" ? "rgba(249,249,249,0.97)" : "#ffffff",
  headerBorder: Platform.OS === "ios" ? "rgba(60,60,67,0.16)" : "rgba(0,0,0,0.12)",
  tint: STUDENT_BRAND.purple,
  label: NATIVE.label,
  secondaryLabel: NATIVE.secondaryLabel,
} as const

function studentDrawerTheme(id: string, label: string): SectionTheme {
  return {
    id,
    label,
    primary: BRAND.red,
    primaryDark: BRAND.redDark,
    primaryLight: BRAND.slate,
    soft: BRAND.redSoft,
    softBorder: BRAND.redBorder,
    gradient: [BRAND.redDark, BRAND.red, "#D63A40"],
    navActiveBg: BRAND.redSoft,
    navActiveBorder: BRAND.redBorder,
  }
}

function studentModuleTheme(id: string, label: string): SectionTheme {
  return {
    id,
    label,
    primary: STUDENT_BRAND.purple,
    primaryDark: STUDENT_BRAND.purpleDark,
    primaryLight: STUDENT_BRAND.purpleLight,
    soft: STUDENT_BRAND.accentSoft,
    softBorder: STUDENT_BRAND.accentBorder,
    gradient: [...STUDENT_BRAND.iconGradient],
    navActiveBg: STUDENT_BRAND.navActiveBg,
    navActiveBorder: STUDENT_BRAND.accentBorder,
  }
}

/** Module section headers & bodies — PVAMU purple tints. */
export const STUDENT_THEME = studentModuleTheme("student", "Student")

/** Side menu only — instructor-style neutral rail + purple active icons. */
export const STUDENT_DRAWER_THEME = studentDrawerTheme("student-drawer", "Student")

export function getStudentModuleTheme(_moduleId?: string): SectionTheme {
  return STUDENT_THEME
}
