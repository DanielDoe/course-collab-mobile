import { useMemo } from "react"
import { useAppThemeTokens } from "../context/AppearanceProvider"
import type { AppThemeTokens } from "../constants/app-themes"
import { useGlassChromeActive } from "../components/theme/GlassSurface"
import { BRAND } from "../constants"

export type DrawerNavTheme = {
  primary: string
  primaryDark: string
  navActiveFg: string
  soft: string
  softBorder: string
  navActiveBg: string
  navActiveBorder: string
  navIdleBg: string
  gradient: readonly [string, string, string]
  panelBg: string
  headerBg: string
  headerBorder: string
  label: string
  secondaryLabel: string
  inactiveIcon: string
  countPillBg: string
  countPillText: string
  rail: string
  chipBg: string
  chipActiveBg: string
  iconWellBg: string
  closeBtnBg: string
  logoFrameBg: string
  isGlass: boolean
}

function hairline(isDark: boolean) {
  return isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"
}

export function drawerNavThemeFromTokens(tokens: AppThemeTokens, glassActive = false): DrawerNavTheme {
  const solidPanel = tokens.isDark ? tokens.surface : BRAND.white
  const solidHeader = tokens.isDark ? tokens.surface : BRAND.white

  const base: DrawerNavTheme = {
    primary: tokens.accent,
    primaryDark: tokens.accentDark,
    navActiveFg: tokens.nav.activeFg,
    soft: tokens.tint,
    softBorder: tokens.border,
    navActiveBg: tokens.nav.activeBg,
    navActiveBorder: "transparent",
    navIdleBg: "transparent",
    gradient: [tokens.accentDark, tokens.accent, tokens.accentHover],
    panelBg: solidPanel,
    headerBg: solidHeader,
    headerBorder: tokens.isDark ? tokens.border : "rgba(0, 0, 0, 0.06)",
    label: tokens.text,
    secondaryLabel: tokens.textSecondary,
    inactiveIcon: tokens.textMuted,
    countPillBg: tokens.isDark ? "rgba(255, 255, 255, 0.1)" : "#F2F2F7",
    countPillText: tokens.textSecondary,
    rail: tokens.isDark ? "rgba(255, 255, 255, 0.12)" : "#E5E7EB",
    chipBg: "transparent",
    chipActiveBg: "transparent",
    iconWellBg: tokens.isDark ? "rgba(255, 255, 255, 0.08)" : "#F2F2F7",
    closeBtnBg: tokens.isDark ? "rgba(255, 255, 255, 0.1)" : "#F2F2F7",
    logoFrameBg: BRAND.white,
    isGlass: false,
  }

  if (!glassActive) return base

  const line = hairline(tokens.isDark)
  return {
    ...base,
    isGlass: true,
    panelBg: solidPanel,
    headerBg: solidHeader,
    headerBorder: line,
    softBorder: line,
    soft: tokens.isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(118, 118, 128, 0.14)",
    navIdleBg: "transparent",
    navActiveBg: tokens.nav.activeBg,
    navActiveBorder: "transparent",
    chipBg: "transparent",
    chipActiveBg: "transparent",
    iconWellBg: tokens.isDark ? "rgba(255, 255, 255, 0.1)" : "#F2F2F7",
    closeBtnBg: tokens.isDark ? "rgba(255, 255, 255, 0.12)" : "#F2F2F7",
    logoFrameBg: BRAND.white,
  }
}

export function useDrawerNavTheme(): DrawerNavTheme {
  const tokens = useAppThemeTokens()
  const glassActive = useGlassChromeActive()
  return useMemo(() => drawerNavThemeFromTokens(tokens, glassActive), [tokens, glassActive])
}
