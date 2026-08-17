import type { AppThemeTokens } from "../constants/app-themes"
import { hexToRgba } from "../constants/app-themes"

export type CheckoutHeroPalette = {
  name: string
  accent: string
  accentDark: string
}

export type MembershipCheckoutHeroTheme = {
  gradient: [string, string, string]
  border: string
  glow: string
  ringOuter: string
  ringInner: string
  tierLabel: string
  iconChipBg: string
  iconChipColor: string
  sparkleColor: string
  headline: string
  headlineAccent: string
  body: string
  price: string
  priceSuffix: string
  checkColor: string
  meta: string
  secondaryBtnBg: string
  secondaryBtnBorder: string
  secondaryBtnText: string
}

function blendWithWhite(hex: string, amount: number): string {
  const normalized = hex.replace("#", "").slice(0, 6)
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  const mix = (channel: number) => Math.round(channel * amount + 255 * (1 - amount))
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0")
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

export function membershipCheckoutHeroTheme(
  plan: CheckoutHeroPalette,
  tokens: AppThemeTokens,
): MembershipCheckoutHeroTheme {
  const accent = plan.accent
  const accentDark = plan.accentDark

  if (tokens.isDark) {
    const base = tokens.background || "#0F0A0B"
    const mid = tokens.surface || "#1A1012"
    const deep = blendWithWhite(accentDark, 0.12)
    return {
      gradient: [base, mid, deep],
      border: hexToRgba(accent, 0.24),
      glow: hexToRgba(accent, 0.24),
      ringOuter: hexToRgba(accent, 0.16),
      ringInner: hexToRgba(tokens.accent, 0.1),
      tierLabel: hexToRgba(accent, 0.95),
      iconChipBg: hexToRgba(accent, 0.16),
      iconChipColor: accent,
      sparkleColor: accent,
      headline: "#FFFFFF",
      headlineAccent: accent,
      body: "rgba(255, 255, 255, 0.72)",
      price: "#FFFFFF",
      priceSuffix: "rgba(255, 255, 255, 0.55)",
      checkColor: accent,
      meta: "rgba(255, 255, 255, 0.58)",
      secondaryBtnBg: hexToRgba(tokens.text, 0.1),
      secondaryBtnBorder: hexToRgba(accent, 0.28),
      secondaryBtnText: tokens.text,
    }
  }

  const pale = blendWithWhite(accent, 0.92)
  const wash = blendWithWhite(accent, 0.96)
  return {
    gradient: ["#FFFFFF", wash, pale],
    border: hexToRgba(accent, 0.22),
    glow: hexToRgba(accent, 0.14),
    ringOuter: hexToRgba(accent, 0.14),
    ringInner: hexToRgba(tokens.accent, 0.08),
    tierLabel: accentDark,
    iconChipBg: hexToRgba(accent, 0.12),
    iconChipColor: accentDark,
    sparkleColor: accentDark,
    headline: tokens.text,
    headlineAccent: accentDark,
    body: tokens.textSecondary,
    price: tokens.text,
    priceSuffix: tokens.textMuted,
    checkColor: accentDark,
    meta: tokens.textMuted,
    secondaryBtnBg: tokens.surface,
    secondaryBtnBorder: hexToRgba(accent, 0.24),
    secondaryBtnText: accentDark,
  }
}
