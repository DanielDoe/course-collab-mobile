import { useMemo } from "react"
import { NATIVE, nativeType } from "../../constants/faculty-native-theme"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import type { AppThemeTokens } from "../../constants/app-themes"
import {
  LOGIN_COLOR,
  loginSoftWash,
  loginThemeAccentSoft,
  loginThemeGoldSoft,
} from "../../lib/login-color-theme"

/**
 * Login chrome uses fixed Color Hunt palettes (not appearance accent).
 * University brand colors apply on school selection rows only.
 */
export type LoginTheme = {
  /** Indigo — links, chevrons, typewriter, field icon tiles */
  purple: string
  purpleLight: string
  purpleDark: string
  /** Orange — primary CTAs (Login, Continue) */
  cta: string
  ctaInk: string
  gold: string
  goldInk: string
  soft: string
  softBorder: string
  accentSoft: string
  goldSoft: string
  canvas: string
  grouped: string
  separator: string
  fill: string
  label: string
  secondaryLabel: string
  sectionRadius: number
  rowMinHeight: number
  sheetRadius: number
  isDark: boolean
}

export type LoginTypography = {
  heroTitle: {
    fontSize: number
    fontWeight: "700"
    lineHeight: number
    letterSpacing: number
    color: string
  }
  heroTitleCompact: { fontSize: number; lineHeight: number }
  heroSubtitle: {
    fontSize: number
    fontWeight: typeof nativeType.secondary.fontWeight
    lineHeight: number
    textAlign: "center"
    color: string
  }
  panelTitle: Omit<typeof nativeType.sheetTitle, "color"> & { color: string }
  panelDescription: {
    fontSize: number
    fontWeight: typeof nativeType.secondary.fontWeight
    lineHeight: number
    color: string
  }
  stepLabel: {
    fontSize: number
    fontWeight: typeof NATIVE.titleWeight
    lineHeight: number
    color: string
    letterSpacing: typeof NATIVE.titleTracking
  }
  fieldLabel: typeof nativeType.sectionHeader
  body: typeof nativeType.callout
  info: {
    fontSize: number
    fontWeight: typeof nativeType.caption.fontWeight
    lineHeight: number
    color: string
  }
  button: { fontSize: number; fontWeight: "600"; lineHeight: number }
  link: { fontSize: number; fontWeight: "600"; lineHeight: number; color: string }
  tileLabel: { fontSize: number; fontWeight: "600"; lineHeight: number; color: string }
  tileLabelFocused: { fontSize: number; lineHeight: number }
  input: { fontSize: number; lineHeight: number; color: string }
}

/** Static fallback when hook is not used. */
export const LOGIN: LoginTheme = {
  purple: LOGIN_COLOR.primary,
  purpleLight: LOGIN_COLOR.secondary,
  purpleDark: "#3D4578",
  cta: LOGIN_COLOR.action,
  ctaInk: LOGIN_COLOR.actionInk,
  gold: LOGIN_COLOR.gold,
  goldInk: LOGIN_COLOR.goldInk,
  soft: loginSoftWash(LOGIN_COLOR.primary, false),
  softBorder: loginSoftWash(LOGIN_COLOR.primary, false),
  accentSoft: loginThemeAccentSoft(false),
  goldSoft: loginThemeGoldSoft(false),
  canvas: NATIVE.groupedBackground,
  grouped: NATIVE.secondaryGrouped,
  separator: NATIVE.separator,
  fill: NATIVE.fill,
  label: NATIVE.label,
  secondaryLabel: NATIVE.secondaryLabel,
  sectionRadius: NATIVE.sectionRadius,
  rowMinHeight: NATIVE.rowMinHeight,
  sheetRadius: NATIVE.sectionRadius + 4,
  isDark: false,
}

export const loginType: LoginTypography = {
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 31,
    letterSpacing: -0.4,
    color: LOGIN_COLOR.primary,
  },
  heroTitleCompact: { fontSize: 22, lineHeight: 27 },
  heroSubtitle: { ...nativeType.secondary, textAlign: "center" },
  panelTitle: { ...nativeType.sheetTitle, color: "#3D4578" },
  panelDescription: nativeType.secondary,
  stepLabel: {
    fontSize: 15,
    fontWeight: NATIVE.titleWeight,
    lineHeight: 20,
    color: NATIVE.label,
    letterSpacing: NATIVE.titleTracking,
  },
  fieldLabel: nativeType.sectionHeader,
  body: nativeType.callout,
  info: nativeType.caption,
  button: { fontSize: 16, fontWeight: "600", lineHeight: 21 },
  link: { fontSize: 14, fontWeight: "600", lineHeight: 18, color: LOGIN_COLOR.secondary },
  tileLabel: { fontSize: 14, fontWeight: "600", lineHeight: 18, color: LOGIN_COLOR.primary },
  tileLabelFocused: { fontSize: 15, lineHeight: 20 },
  input: { fontSize: 16, lineHeight: 21, color: NATIVE.label },
}

function loginThemeFromTokens(tokens: AppThemeTokens): LoginTheme {
  const isDark = tokens.isDark
  return {
    purple: LOGIN_COLOR.primary,
    purpleLight: LOGIN_COLOR.secondary,
    purpleDark: "#3D4578",
    cta: LOGIN_COLOR.action,
    ctaInk: LOGIN_COLOR.actionInk,
    gold: LOGIN_COLOR.gold,
    goldInk: LOGIN_COLOR.goldInk,
    soft: loginSoftWash(LOGIN_COLOR.primary, isDark),
    softBorder: loginSoftWash(LOGIN_COLOR.primary, isDark),
    accentSoft: loginThemeAccentSoft(isDark),
    goldSoft: loginThemeGoldSoft(isDark),
    canvas: tokens.native.groupedBackground,
    grouped: tokens.native.secondaryGrouped,
    separator: tokens.native.separator,
    fill: tokens.native.fill,
    label: tokens.native.label,
    secondaryLabel: tokens.native.secondaryLabel,
    sectionRadius: NATIVE.sectionRadius,
    rowMinHeight: NATIVE.rowMinHeight,
    sheetRadius: NATIVE.sectionRadius + 4,
    isDark,
  }
}

function loginTypeFromTokens(_tokens: AppThemeTokens, login: LoginTheme): LoginTypography {
  return {
    heroTitle: {
      fontSize: 26,
      fontWeight: "700",
      lineHeight: 31,
      letterSpacing: -0.4,
      color: login.isDark ? LOGIN_COLOR.secondary : LOGIN_COLOR.primary,
    },
    heroTitleCompact: { fontSize: 22, lineHeight: 27 },
    heroSubtitle: {
      fontSize: nativeType.secondary.fontSize,
      fontWeight: nativeType.secondary.fontWeight,
      lineHeight: nativeType.secondary.lineHeight,
      textAlign: "center",
      color: login.secondaryLabel,
    },
    panelTitle: {
      ...nativeType.sheetTitle,
      color: login.label,
    },
    panelDescription: {
      fontSize: nativeType.secondary.fontSize,
      fontWeight: nativeType.secondary.fontWeight,
      lineHeight: nativeType.secondary.lineHeight,
      color: login.secondaryLabel,
    },
    stepLabel: {
      fontSize: 15,
      fontWeight: NATIVE.titleWeight,
      lineHeight: 20,
      color: login.label,
      letterSpacing: NATIVE.titleTracking,
    },
    fieldLabel: nativeType.sectionHeader,
    body: nativeType.callout,
    info: {
      fontSize: nativeType.caption.fontSize,
      fontWeight: nativeType.caption.fontWeight,
      lineHeight: nativeType.caption.lineHeight,
      color: login.secondaryLabel,
    },
    button: { fontSize: 16, fontWeight: "600", lineHeight: 21 },
    link: { fontSize: 14, fontWeight: "600", lineHeight: 18, color: login.purpleLight },
    tileLabel: { fontSize: 14, fontWeight: "600", lineHeight: 18, color: login.purple },
    tileLabelFocused: { fontSize: 15, lineHeight: 20 },
    input: { fontSize: 16, lineHeight: 21, color: login.label },
  }
}

export function useLoginTheme(): { LOGIN: LoginTheme; loginType: LoginTypography } {
  const tokens = useAppThemeTokens()
  return useMemo(() => {
    const LOGIN = loginThemeFromTokens(tokens)
    return {
      LOGIN,
      loginType: loginTypeFromTokens(tokens, LOGIN),
    }
  }, [tokens])
}
