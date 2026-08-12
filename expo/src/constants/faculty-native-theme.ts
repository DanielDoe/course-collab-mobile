import { Platform } from "react-native"
import { APP_BUTTON_RADIUS } from "./app-button"

/**
 * Faculty-wide design tokens — native structure + modern brand accents.
 *
 * Guide: expo/docs/ios-native-module-design.md
 * Rule: .cursor/rules/ios-native-module-design.mdc
 *
 * NATIVE + SYSTEM → layout, typography, lists, semantic status (stable across OS versions).
 * MODERN → controlled personality (drawer accordion, KPI tiles, brand stripe, row icon color).
 * Liquid Glass / system materials belong on chrome only — see design doc §6.
 */

const isIOS = Platform.OS === "ios"

export const NATIVE = {
  /** Page / drawer scroll canvas */
  groupedBackground: isIOS ? "#f2f2f7" : "#f5f5f5",
  /** Inset list / card fill */
  secondaryGrouped: "#ffffff",
  /** Nested / pressed fill */
  tertiaryGrouped: isIOS ? "#ffffff" : "#fafafa",
  /** Hairline separators */
  separator: isIOS ? "rgba(60,60,67,0.29)" : "rgba(0,0,0,0.12)",
  separatorOpaque: isIOS ? "#c6c6c8" : "#e0e0e0",
  /** Labels */
  label: isIOS ? "#000000" : "#1c1b1f",
  secondaryLabel: isIOS ? "rgba(60,60,67,0.6)" : "rgba(28,27,31,0.68)",
  tertiaryLabel: isIOS ? "rgba(60,60,67,0.3)" : "rgba(28,27,31,0.45)",
  /** Interactive tint (links, Mark All, View all) */
  tint: isIOS ? "#007AFF" : "#1B6EF3",
  /** Track / chip fill */
  fill: isIOS ? "rgba(120,120,128,0.12)" : "rgba(0,0,0,0.06)",
  /** Faculty brand accent (CTAs that are not system tint) */
  accent: "#0d9488",
  accentSoft: "#ecfdf5",
  accentDark: "#0f766e",
  /** Destructive */
  destructive: "#FF3B30",
  /** Layout metrics */
  rowMinHeight: isIOS ? 52 : 56,
  sectionRadius: isIOS ? 12 : 16,
  /** Primary / secondary CTA corners — soft rectangle, not full pill. */
  buttonRadius: APP_BUTTON_RADIUS,
  buttonMinHeight: 48,
  sectionGap: 28,
  iconTileSize: isIOS ? 30 : 32,
  iconTileRadius: isIOS ? 7 : 8,
  pagePadding: 16,
  /** Dynamic Type caps — see TEXT_ACCESSIBILITY */
  /** Typography */
  titleSize: 17,
  titleWeight: (isIOS ? "600" : "700") as "600" | "700",
  titleTracking: isIOS ? -0.4 : 0.15,
  bodySize: isIOS ? 17 : 16,
  bodyWeight: "400" as const,
  secondarySize: 13,
  sectionHeaderSize: 13,
  sectionHeaderWeight: "600" as const,
  /** Elevation (Android) / soft shadow (iOS) for raised chrome only — not list rows */
  raisedShadow: isIOS
    ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 0}
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
        elevation: 2},
  /** Press feedback */
  pressedOpacity: isIOS ? 0.55 : 0.88,
  /** Brand switch colors — track uses theme accent when on */
  switchTrackOff: isIOS ? "#e2e8f0" : "#d1d5db",
  switchTrackOn: "#0d9488",
  switchIosOffBackground: isIOS ? "#e2e8f0" : "#d1d5db",
  switchAndroidThumbOn: "#ffffff",
  switchAndroidThumbOff: "#f4f3f4",
} as const

/**
 * Caps iOS Dynamic Type scaling so dense module layouts stay usable.
 * Pass as Text props (`maxFontSizeMultiplier`), not StyleSheet fields.
 */
export const TEXT_ACCESSIBILITY = {
  defaultMaxFontSizeMultiplier: 1.35,
  metricMaxFontSizeMultiplier: 1.25,
} as const

export const nativeTextA11yProps = {
  maxFontSizeMultiplier: TEXT_ACCESSIBILITY.defaultMaxFontSizeMultiplier,
}

export const kpiLabelTextA11yProps = {
  maxFontSizeMultiplier: TEXT_ACCESSIBILITY.defaultMaxFontSizeMultiplier,
}

export const kpiMetricTextA11yProps = {
  maxFontSizeMultiplier: TEXT_ACCESSIBILITY.metricMaxFontSizeMultiplier,
}

/** @deprecated Prefer NATIVE — kept for Communication module imports */
export const IOS = NATIVE

/**
 * Modern accent layer — use alongside NATIVE, never instead of it.
 * Allowed on: drawer accordion, dashboard KPIs/charts, semantic row icon tiles, brand CTAs.
 * Forbidden on: plain list rows, section bodies, fake glass on content.
 */
export const MODERN = {
  navCanvas: "#f1f5f9",
  brandGold: "#EAAA00",
  brandStripeGradient: ["#EAAA00", "#d4a017", "#EAAA00"] as const,
  brandStripeHeight: 3,
  chipRadius: 14,
  navRowRadius: 16,
  iconGradientSize: 36,
  iconGradientRadius: 12,
  metricIconSize: 36,
  metricIconRadius: 10,
  chipShadow: isIOS
    ? {
        shadowColor: "#64748b",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1}
    : {
        shadowColor: "#64748b",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2}} as const

/** Apple / Material–aligned semantic colors */
export const SYSTEM = {
  blue: { color: NATIVE.tint, soft: isIOS ? "#E5F1FF" : "#E8F0FE", border: "#B3D7FF" },
  indigo: { color: "#5856D6", soft: "#EEEDFC", border: "#C7C6F0" },
  purple: { color: "#AF52DE", soft: "#F7EAFB", border: "#E4C4F3" },
  pink: { color: "#FF2D55", soft: "#FFE8ED", border: "#FFB3C1" },
  red: { color: "#FF3B30", soft: "#FFE5E3", border: "#FFB4AF" },
  orange: { color: "#FF9500", soft: "#FFF0D9", border: "#FFD399" },
  yellow: { color: "#FFCC00", soft: "#FFF8D6", border: "#FFE680" },
  green: { color: "#34C759", soft: "#E4F8EA", border: "#A8EBB8" },
  teal: { color: "#0d9488", soft: "#ecfdf5", border: "#99f6e4" },
  mint: { color: "#00C7BE", soft: "#D9F7F5", border: "#99EBE6" },
  gray: { color: "#8E8E93", soft: NATIVE.groupedBackground, border: "#D1D1D6" }} as const

/** @deprecated Prefer SYSTEM */
export const COMM_SYSTEM = SYSTEM

/**
 * SF Pro / system text styles for all app surfaces.
 * Title Case section headers — never ALL CAPS (HIG).
 * Pair with `nativeTextA11yProps` on Text for Dynamic Type caps.
 */
export const nativeType = {
  navTitle: {
    fontSize: NATIVE.titleSize,
    fontWeight: NATIVE.titleWeight,
    color: NATIVE.label,
    letterSpacing: NATIVE.titleTracking,
    lineHeight: 22},
  sheetTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: NATIVE.label,
    letterSpacing: isIOS ? -0.4 : 0.15,
    lineHeight: 25},
  body: {
    fontSize: NATIVE.bodySize,
    fontWeight: NATIVE.bodyWeight,
    color: NATIVE.label,
    letterSpacing: isIOS ? -0.4 : 0,
    lineHeight: 22},
  bodyEmphasis: {
    fontSize: NATIVE.bodySize,
    fontWeight: NATIVE.titleWeight,
    color: NATIVE.label,
    letterSpacing: NATIVE.titleTracking,
    lineHeight: 22},
  callout: {
    fontSize: 16,
    fontWeight: "400" as const,
    color: NATIVE.label,
    letterSpacing: isIOS ? -0.3 : 0,
    lineHeight: 21},
  secondary: {
    fontSize: 15,
    fontWeight: "400" as const,
    color: NATIVE.secondaryLabel,
    lineHeight: 20},
  caption: {
    fontSize: NATIVE.secondarySize,
    fontWeight: "400" as const,
    color: NATIVE.secondaryLabel,
    lineHeight: 18},
  sectionHeader: {
    fontSize: NATIVE.sectionHeaderSize,
    fontWeight: NATIVE.sectionHeaderWeight,
    color: NATIVE.secondaryLabel,
    letterSpacing: isIOS ? -0.08 : 0.15},
  footnote: {
    fontSize: 12,
    fontWeight: "400" as const,
    color: NATIVE.tertiaryLabel,
    lineHeight: 16},
  detail: {
    fontSize: NATIVE.bodySize,
    fontWeight: "400" as const,
    color: NATIVE.secondaryLabel,
    letterSpacing: isIOS ? -0.4 : 0,
    lineHeight: 22},
  destructive: {
    fontSize: NATIVE.bodySize,
    fontWeight: "400" as const,
    color: NATIVE.destructive,
    letterSpacing: isIOS ? -0.4 : 0,
    lineHeight: 22},
  drawerBrand: {
    fontSize: 17,
    fontWeight: NATIVE.titleWeight,
    color: NATIVE.label,
    letterSpacing: NATIVE.titleTracking},
  drawerMeta: {
    fontSize: NATIVE.secondarySize,
    fontWeight: "400" as const,
    color: NATIVE.secondaryLabel,
    lineHeight: 18},
  drawerAccordionLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: NATIVE.secondaryLabel,
    letterSpacing: isIOS ? -0.2 : 0,
    lineHeight: 21,
  },
  drawerNavItem: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: NATIVE.secondaryLabel,
    letterSpacing: isIOS ? -0.2 : 0,
    lineHeight: 20,
  },
  drawerNavItemActive: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: NATIVE.label,
    letterSpacing: isIOS ? -0.2 : 0,
    lineHeight: 20,
  },
} as const

export function pressableFeedback(pressed: boolean) {
  return pressed ? { opacity: NATIVE.pressedOpacity } : null
}

/** Caps notification-style counts at `max+` (default 99+). */
export function formatNativeBadgeCount(count: number, max = 99): string {
  if (count <= 0) return "0"
  return count > max ? `${max}+` : String(count)
}
