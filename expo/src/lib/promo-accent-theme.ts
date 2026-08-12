import { StyleSheet } from "react-native"
import type { AppThemeTokens } from "../constants/app-themes"

type PromoAccentTokens = Pick<
  AppThemeTokens,
  "isDark" | "accent" | "accentDark" | "accentHover" | "selected" | "tint" | "background"
>

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "")
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`
}

/** Blend foreground hex toward a darker anchor — used for readable accent promo gradients in dark mode. */
export function blendHex(fg: string, bg: string, bgWeight: number): string {
  const [fr, fGreen, fb] = parseHex(fg)
  const [br, bGreen, bb] = parseHex(bg)
  const w = Math.max(0, Math.min(1, bgWeight))
  const f = 1 - w
  return toHex(fr * f + br * w, fGreen * f + bGreen * w, fb * f + bb * w)
}

/** Original light-mode gradient; dark mode deepens stops toward theme anchor so white text reads clearly. */
export function promoAccentGradientColors(tokens: PromoAccentTokens): [string, string, string] {
  if (!tokens.isDark) {
    return [tokens.accentDark, tokens.accent, tokens.accentHover]
  }

  const anchor = tokens.selected || tokens.tint || tokens.background
  return [
    blendHex(tokens.accent, anchor, 0.72),
    blendHex(tokens.accent, anchor, 0.52),
    blendHex(tokens.accent, anchor, 0.32),
  ]
}

/** Frosted icon tile + foreground on accent promo cards (drawer upgrade, etc.). */
export function promoIconOnAccentStyle(tokens?: Pick<AppThemeTokens, "isDark">) {
  return {
    tile: {
      backgroundColor: tokens?.isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.22)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens?.isDark ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.35)",
    },
    iconColor: "#FFFFFF",
  } as const
}

export function promoAccentForegroundColor(): "#FFFFFF" {
  return "#FFFFFF"
}

export function promoAccentTitleStyle(tokens: Pick<AppThemeTokens, "isDark">) {
  return {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    ...(tokens.isDark
      ? {}
      : {
          textShadowColor: "rgba(0,0,0,0.2)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }),
  }
}

export function promoAccentBodyStyle(tokens: Pick<AppThemeTokens, "isDark">) {
  return {
    color: tokens.isDark ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.88)",
    fontSize: 12,
    lineHeight: 16,
    ...(tokens.isDark
      ? {}
      : {
          textShadowColor: "rgba(0,0,0,0.18)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }),
  }
}
