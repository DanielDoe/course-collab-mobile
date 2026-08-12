import type { AppThemeTokens } from "../constants/app-themes"
import { hexToRgba } from "../constants/app-themes"
import type { AppAlertTone } from "../components/errors/AppAlertModal"

/** Semantic accent per alert tone — follows active theme + appearance mode. */
export function alertToneAccent(tokens: AppThemeTokens, tone: AppAlertTone): string {
  switch (tone) {
    case "success":
      return tokens.success
    case "warning":
      return tokens.warning
    case "error":
      return tokens.danger
    case "info":
    default:
      return tokens.accent
  }
}

export function alertToneSoftFill(tokens: AppThemeTokens, tone: AppAlertTone): string {
  const accent = alertToneAccent(tokens, tone)
  return hexToRgba(accent, tokens.isDark ? 0.18 : 0.12)
}
