import type { AppThemeTokens } from "../constants/app-themes"
import { semanticSoft } from "./themed-module-theme"

/** Shared notification sheet accents — brand chrome + type identity that sit with the active theme. */
export function notificationSheetTheme(
  tokens: AppThemeTokens,
  typeStyle: { color: string; soft: string },
) {
  return {
    brand: tokens.accent,
    brandSoft: tokens.accentSoft,
    brandSoftStrong: tokens.accentSoftStrong,
    brandBorder: tokens.accentBorder,
    onBrand: "#FFFFFF" as const,
    typeColor: typeStyle.color,
    typeSoft: semanticSoft(typeStyle.color, tokens.isDark),
    /** Theme wash so Quick Read sits with appearance; stripe keeps type identity. */
    summaryBg: tokens.accentSoft,
    summaryStripe: typeStyle.color,
    warning: tokens.warning,
    warningSoft: semanticSoft(tokens.warning, tokens.isDark),
    danger: tokens.danger,
    dangerSoft: semanticSoft(tokens.danger, tokens.isDark, tokens.isDark ? 0.18 : 0.1),
  }
}
