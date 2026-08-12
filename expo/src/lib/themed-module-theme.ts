import { useMemo } from "react"
import type { ViewStyle } from "react-native"
import { useAppThemeTokens, useThemedNative } from "../context/AppearanceProvider"
import type { AppThemeTokens } from "../constants/app-themes"
import { hexToRgba } from "../constants/app-themes"
import type { SectionTheme } from "../constants/section-themes"
import { nativeType as staticNativeType, nativeTextA11yProps } from "../constants/faculty-native-theme"
import {
  getAssessmentConfigs,
  getGradesConfig,
  getHistoryConfig,
  scoreToneForTokens,
  type AssessmentListKind,
} from "../components/assessments/assessment-config"

/** Student module accent palette derived from the active appearance theme. */
export function studentNativeFromTokens(tokens: AppThemeTokens) {
  return {
    accent: tokens.accent,
    accentLight: tokens.accent,
    accentDark: tokens.accentDark,
    uiAccent: tokens.accent,
    accentSoft: tokens.accentSoft,
    accentSoftStrong: tokens.accentSoftStrong,
    accentBorder: tokens.accentBorder,
    gold: tokens.warning,
    goldSoft: hexToRgba(tokens.warning, tokens.isDark ? 0.2 : 0.14),
    goldBorder: hexToRgba(tokens.warning, tokens.isDark ? 0.32 : 0.28),
    tint: tokens.accent,
    groupedBackground: tokens.native.groupedBackground,
    secondaryGrouped: tokens.native.secondaryGrouped,
    separator: tokens.native.separator,
    label: tokens.native.label,
    secondaryLabel: tokens.native.secondaryLabel,
    tertiaryLabel: tokens.native.tertiaryLabel,
    fill: tokens.native.fill,
    raisedShadow: tokens.cardShadow,
  }
}

export function useThemedStudentNative() {
  const tokens = useAppThemeTokens()
  return useMemo(() => studentNativeFromTokens(tokens), [tokens])
}

type NativeLabelKey = "label" | "secondaryLabel" | "tertiaryLabel" | "destructive" | "tint"

function bindTypeface<T extends { color?: string }>(base: T, native: ReturnType<typeof useThemedNative>, key: NativeLabelKey) {
  return { ...base, color: native[key] }
}

/** Typography presets bound to the active appearance theme (fixes dark-mode label colors). */
export function useNativeType() {
  const native = useThemedNative()
  return useMemo(
    () => ({
      navTitle: bindTypeface(staticNativeType.navTitle, native, "label"),
      sheetTitle: bindTypeface(staticNativeType.sheetTitle, native, "label"),
      body: bindTypeface(staticNativeType.body, native, "label"),
      bodyEmphasis: bindTypeface(staticNativeType.bodyEmphasis, native, "label"),
      callout: bindTypeface(staticNativeType.callout, native, "label"),
      secondary: bindTypeface(staticNativeType.secondary, native, "secondaryLabel"),
      caption: bindTypeface(staticNativeType.caption, native, "secondaryLabel"),
      sectionHeader: bindTypeface(staticNativeType.sectionHeader, native, "secondaryLabel"),
      footnote: bindTypeface(staticNativeType.footnote, native, "tertiaryLabel"),
      detail: bindTypeface(staticNativeType.detail, native, "secondaryLabel"),
      destructive: bindTypeface(staticNativeType.destructive, native, "destructive"),
      drawerBrand: bindTypeface(staticNativeType.drawerBrand, native, "label"),
      drawerMeta: bindTypeface(staticNativeType.drawerMeta, native, "secondaryLabel"),
      drawerAccordionLabel: bindTypeface(staticNativeType.drawerAccordionLabel, native, "secondaryLabel"),
      drawerNavItem: bindTypeface(staticNativeType.drawerNavItem, native, "secondaryLabel"),
      drawerNavItemActive: bindTypeface(staticNativeType.drawerNavItemActive, native, "label"),
      /** Spread on Text alongside any `type.*` style for Dynamic Type caps. */
      textProps: nativeTextA11yProps,
    }),
    [native],
  )
}

/** Semantic soft fills that read correctly in light and dark mode. */
export function semanticSoft(color: string, isDark: boolean, alpha = isDark ? 0.2 : 0.14): string {
  return hexToRgba(color, alpha)
}

export function useAssessmentTheme() {
  const tokens = useAppThemeTokens()
  return useMemo(
    () => ({
      tokens,
      configs: getAssessmentConfigs(tokens),
      history: getHistoryConfig(tokens),
      grades: getGradesConfig(tokens),
      configFor: (kind: AssessmentListKind) => getAssessmentConfigs(tokens)[kind],
      scoreTone: (score?: number | null) => scoreToneForTokens(score, tokens),
    }),
    [tokens],
  )
}

export function useChartThemeColors() {
  const tokens = useAppThemeTokens()
  return useMemo(
    () => ({
      accent: tokens.accent,
      accentDark: tokens.accentDark,
      warning: tokens.warning,
      success: tokens.success,
      textMuted: tokens.textMuted,
    }),
    [tokens],
  )
}

/** Section/module accent palette from the active appearance theme. */
export function sectionThemeFromTokens(
  tokens: AppThemeTokens,
  id = "student",
  label = "Student",
): SectionTheme {
  return {
    id,
    label,
    primary: tokens.accent,
    primaryDark: tokens.accentDark,
    primaryLight: tokens.accentHover,
    soft: tokens.accentSoft,
    softBorder: tokens.accentBorder,
    gradient: [tokens.accentDark, tokens.accent, tokens.accentHover],
    navActiveBg: tokens.accentSoft,
    navActiveBorder: tokens.accentBorder,
    ink: tokens.text,
  }
}

export function useStudentSectionTheme(moduleId?: string, label?: string) {
  const tokens = useAppThemeTokens()
  return useMemo(
    () => sectionThemeFromTokens(tokens, moduleId ?? "student", label ?? "Student"),
    [tokens, moduleId, label],
  )
}

/** Instructor module accent palette from the active appearance theme. */
export function useFacultyTheme() {
  const tokens = useAppThemeTokens()
  return useMemo(() => sectionThemeFromTokens(tokens, "faculty", "Instructor"), [tokens])
}

export function facultyNativeFromTokens(tokens: AppThemeTokens) {
  return {
    accent: tokens.accent,
    accentSoft: tokens.accentSoft,
    accentDark: tokens.accentDark,
    accentBorder: tokens.accentBorder,
    groupedBackground: tokens.native.groupedBackground,
    secondaryGrouped: tokens.native.secondaryGrouped,
    separator: tokens.native.separator,
    label: tokens.native.label,
    secondaryLabel: tokens.native.secondaryLabel,
    tertiaryLabel: tokens.native.tertiaryLabel,
    fill: tokens.native.fill,
    tint: tokens.native.tint,
    destructive: tokens.native.destructive,
    raisedShadow: tokens.cardShadow,
  }
}

export function useFacultyNative() {
  const tokens = useAppThemeTokens()
  return useMemo(() => facultyNativeFromTokens(tokens), [tokens])
}

export function levelColorForTokens(level: string | undefined, tokens: AppThemeTokens): string {
  if (level === "Advanced") return tokens.warning
  if (level === "Intermediate") return tokens.accentHover
  return tokens.accent
}

/** Raised signature list cards — stronger than theme cardShadow (glass themes use ~0.05 opacity). */
export function signatureListCardShadow(tokens: AppThemeTokens): ViewStyle {
  return {
    shadowColor: tokens.isDark ? "#000000" : "#101828",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: tokens.isDark ? 0.36 : 0.16,
    shadowRadius: 16,
    elevation: 8,
  }
}
