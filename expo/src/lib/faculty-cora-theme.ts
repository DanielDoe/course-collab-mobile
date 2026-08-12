import { Platform, StyleSheet, type ViewStyle } from "react-native"
import type { AppThemeTokens, ThemeId } from "../constants/app-themes"
import { hexToRgba } from "../constants/app-themes"
import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { solidListThumbFixed, type SolidListThumb } from "./solid-list-thumb"

/** Faculty Cora — global module accents (Color Hunt faculty globals, not appearance theme). */
export const FACULTY_CORA_COLOR = {
  action: GRADES_WARM.orange,
  actionInk: "#FFFFFF",
  link: COLOR_HUNT_COOL.cyan,
  ai: COLOR_HUNT_COOL.indigo,
  success: REPORT_SOLID.correct,
  danger: REPORT_SOLID.missed,
} as const

/** Signature Cora orange — kept for neutral / cool themes where it complements the accent. */
const CORA_SIGNATURE_ORANGE = FACULTY_CORA_COLOR.action

/**
 * Brand and warm themes where primary CTAs should follow appearance accent
 * (Cora orange would clash with crimson, UH steel, wine, etc.).
 */
const THEME_ACCENT_ACTION_IDS = new Set<ThemeId>([
  "course-collab",
  "professional-crimson",
  "cougar-crimson",
  "university-of-houston-steel",
  "heritage-wine",
  "copper-luxe",
  "sunset",
  "rose-quartz",
  "pvamu-purple",
  "pvamu-gold",
])

function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "")
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized.slice(0, 6)
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function hexRelativeLuminance(hex: string): number {
  const { r, g, b } = parseHexRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** Detect strong red/crimson/copper accents not covered by the explicit theme list. */
function accentClashesWithCoraOrange(accent: string): boolean {
  const { r, g, b } = parseHexRgb(accent)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const saturation = max === 0 ? 0 : (max - min) / max
  if (saturation < 0.28) return false

  const isCrimson = r > 150 && r > g * 1.35 && r > b * 1.35
  const isCopperOrange = r > 170 && g > 70 && g < 170 && b < 90 && r > b * 2
  return isCrimson || isCopperOrange
}

export type FacultyCoraActionColors = {
  background: string
  ink: string
  /** True when using theme accent instead of signature orange. */
  usesThemeAccent: boolean
}

/** Primary solid CTA colors for Exit dock, chat FAB, and other hero actions. */
export function facultyCoraActionColors(tokens: AppThemeTokens): FacultyCoraActionColors {
  const preferThemeAccent =
    THEME_ACCENT_ACTION_IDS.has(tokens.id) || accentClashesWithCoraOrange(tokens.accent)

  if (preferThemeAccent) {
    const background = tokens.accent
    return {
      background,
      ink: hexRelativeLuminance(background) > 0.62 ? tokens.text : "#FFFFFF",
      usesThemeAccent: true,
    }
  }

  return {
    background: CORA_SIGNATURE_ORANGE,
    ink: FACULTY_CORA_COLOR.actionInk,
    usesThemeAccent: false,
  }
}

/**
 * Color Hunt palettes for faculty Cora capability cards + hero.
 * @see https://colorhunt.co/palette/ffbe91ffddb0fffce1cfebff
 * @see https://colorhunt.co/palette/e3f2fd90caf92196f30d47a1
 * @see https://colorhunt.co/palette/769826a1cb35ffde4eff9d4d
 * @see https://colorhunt.co/palette/30afff92eeffd8ffc5c4f7ca
 * @see https://colorhunt.co/palette/249d8fe9c46ae76f51fdf0d5
 */
export const FACULTY_CORA_PALETTES = {
  peachSky: {
    light: "#FFFCE1",
    soft: "#FFDBB0",
    accent: "#FFBE91",
    deep: "#CFEBFF",
    ink: "#4A2E0A",
  },
  materialBlue: {
    light: "#E3F2FD",
    soft: "#90CAF9",
    accent: "#2196F3",
    deep: "#0D47A1",
    ink: "#FFFFFF",
  },
  freshGarden: {
    light: "#FFDE4E",
    soft: "#A1CB35",
    accent: "#FF9D4D",
    deep: "#769826",
    ink: "#FFFFFF",
  },
  aquaMint: {
    light: "#D8FFC5",
    soft: "#C4F7CA",
    accent: "#30AFFF",
    deep: "#92EEFF",
    ink: "#FFFFFF",
  },
  coastal: {
    light: "#FDF0D5",
    soft: "#E9C46A",
    accent: "#249D8F",
    deep: "#E76F51",
    ink: "#FFFFFF",
  },
} as const

export type FacultyCoraPaletteKey = keyof typeof FACULTY_CORA_PALETTES

export type FacultyCoraCapabilityAccent = {
  palette: FacultyCoraPaletteKey
  thumb: SolidListThumb
  /** Solid accent for user bubbles and chips */
  accent: string
  iconSoft: (isDark: boolean) => string
}

function capabilityAccent(
  paletteKey: FacultyCoraPaletteKey,
  thumbFill: string,
  thumbInk = "#FFFFFF",
): FacultyCoraCapabilityAccent {
  return {
    palette: paletteKey,
    thumb: solidListThumbFixed(thumbFill, thumbInk),
    accent: thumbFill,
    iconSoft: (isDark) => hexToRgba(thumbFill, isDark ? 0.28 : 0.2),
  }
}

/** One palette accent per teaching-copilot capability. */
export const FACULTY_CORA_CAPABILITY_ACCENTS: Record<FacultyCoraCapabilityId, FacultyCoraCapabilityAccent> = {
  create: capabilityAccent("peachSky", FACULTY_CORA_PALETTES.peachSky.accent, FACULTY_CORA_PALETTES.peachSky.ink),
  improve: capabilityAccent("coastal", FACULTY_CORA_PALETTES.coastal.accent),
  analyze: capabilityAccent("materialBlue", FACULTY_CORA_PALETTES.materialBlue.accent),
  explain: capabilityAccent("aquaMint", FACULTY_CORA_PALETTES.aquaMint.accent),
  automate: capabilityAccent("freshGarden", FACULTY_CORA_PALETTES.freshGarden.accent),
  review: capabilityAccent("freshGarden", FACULTY_CORA_PALETTES.freshGarden.deep),
  assistant: capabilityAccent("materialBlue", FACULTY_CORA_PALETTES.materialBlue.soft, "#0D47A1"),
  insights: capabilityAccent("materialBlue", FACULTY_CORA_PALETTES.materialBlue.deep),
}

export function facultyCoraCapabilityAccent(id: FacultyCoraCapabilityId): FacultyCoraCapabilityAccent {
  return FACULTY_CORA_CAPABILITY_ACCENTS[id]
}

/** Full-screen canvas — soft neutral so white cards read with elevation. */
export function facultyCoraCanvas(isDark: boolean, groupedBackground: string): string {
  return isDark ? groupedBackground : "#F2F2F7"
}

/** Immersive chat canvas — subtle cool/warm tint instead of pure white. */
export function facultyCoraChatCanvas(isDark: boolean): string {
  if (isDark) return "#0C0C0F"
  return "#F4F6FB"
}

/** Solid canvas once chat is active — reduces ambient distraction behind messages. */
export function facultyCoraChatSolidCanvas(isDark: boolean): string {
  return isDark ? "#0C0C0F" : "#FFFFFF"
}

/** Starter prompt cards in faculty Cora chat — neutral inset cards on welcome canvas. */
export function facultyCoraChatStarterCardStyle(isDark: boolean, separator: string): ViewStyle {
  const borderColor = isDark ? hexToRgba("#FFFFFF", 0.12) : hexToRgba("#3C3C43", 0.12)

  if (isDark) {
    return {
      backgroundColor: hexToRgba("#FFFFFF", 0.06),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    }
  }

  return {
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === "ios" ? 0.06 : 0.08,
    shadowRadius: 8,
    elevation: 2,
  }
}

/** Soft ambient blob colors for chat background wash. */
export function facultyCoraChatAmbientBlobs(isDark: boolean): {
  top: string
  bottom: string
  center: string
} {
  if (isDark) {
    return {
      top: hexToRgba(FACULTY_CORA_COLOR.ai, 0.2),
      bottom: hexToRgba(FACULTY_CORA_COLOR.link, 0.14),
      center: hexToRgba(FACULTY_CORA_PALETTES.peachSky.accent, 0.1),
    }
  }
  return {
    top: hexToRgba(FACULTY_CORA_PALETTES.materialBlue.soft, 0.45),
    bottom: hexToRgba(FACULTY_CORA_PALETTES.aquaMint.soft, 0.38),
    center: hexToRgba(FACULTY_CORA_PALETTES.peachSky.soft, 0.32),
  }
}

/** Card / inset list surface — white in light, elevated dark in dark mode. */
export function facultyCoraCardSurface(secondaryGrouped: string): string {
  return secondaryGrouped
}

/** Material elevation for Cora hub cards (hero, capability tiles, lists). */
export function facultyCoraMaterialCardStyle(isDark: boolean, separator: string): ViewStyle {
  if (isDark) {
    return {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.1)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.38,
      shadowRadius: 14,
      elevation: 8,
    }
  }
  return {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: separator,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: Platform.OS === "ios" ? 0.1 : 0.14,
    shadowRadius: 10,
    elevation: 4,
  }
}

export function facultyCoraExitDockShadow(): ViewStyle {
  return Platform.OS === "ios"
    ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      }
    : { elevation: 6 }
}

export function facultyCoraInsightAccent(
  severity: "info" | "warning" | "success" | undefined,
  isDark: boolean,
): { color: string; soft: string } {
  if (severity === "warning") {
    return { color: FACULTY_CORA_COLOR.danger, soft: hexToRgba(FACULTY_CORA_COLOR.danger, isDark ? 0.22 : 0.14) }
  }
  if (severity === "success") {
    return { color: FACULTY_CORA_COLOR.success, soft: hexToRgba(FACULTY_CORA_COLOR.success, isDark ? 0.22 : 0.14) }
  }
  return {
    color: FACULTY_CORA_COLOR.ai,
    soft: hexToRgba(FACULTY_CORA_COLOR.ai, isDark ? 0.24 : 0.16),
  }
}
