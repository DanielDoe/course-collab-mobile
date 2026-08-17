import { StyleSheet } from "react-native"

type NativeColors = {
  label: string
  secondaryLabel?: string
  separator: string
  groupedBackground?: string
  tertiaryGrouped?: string
}

export type CoraChatBubbleColorSet = {
  background: string
  border: string
  text: string
}

/** Minimum inset from the physical screen edge. */
export const CORA_CHAT_EDGE_PADDING = 20

/** Extra space on the left for user bubbles (prompts sit toward the right). */
export const CORA_CHAT_USER_TAIL_INSET = 24

/** Extra space on the right for Cora replies (replies sit toward the left). */
export const CORA_CHAT_ASSISTANT_TAIL_INSET = 24

/** Max width for short user text prompts within the inset column. */
export const CORA_CHAT_USER_TEXT_MAX_WIDTH = "82%"

export type CoraChatBubblePalette = {
  user: CoraChatBubbleColorSet
  assistant: CoraChatBubbleColorSet
  userBorderWidth?: number
  assistantBorderWidth?: number
  /** @deprecated Prefer userBorderWidth / assistantBorderWidth. */
  borderWidth?: number
  userRadius: number
  assistantRadius: number
  assistantShadow?: boolean
  /** Renders assistant markdown with light text on solid accent bubbles. */
  assistantMarkdownOnAccent?: boolean
}


function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "").trim()
  if (!normalized) return null
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized.slice(0, 6)
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function relativeLuminance(hex: string): number {
  const rgb = parseHexRgb(hex)
  if (!rgb) return 0.5
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Derive a darker solid from a hex color for readable on-accent surfaces. */
function darkenHex(hex: string, amount: number): string {
  const rgb = parseHexRgb(hex)
  if (!rgb) return hex
  const factor = 1 - Math.min(Math.max(amount, 0), 0.85)
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
  const r = clamp(rgb.r * factor)
  const g = clamp(rgb.g * factor)
  const b = clamp(rgb.b * factor)
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

/** Always darken the active theme accent for Cora's bubble (every theme, same rule). */
function resolveCoraAssistantBubbleBackground(accent: string, accentDark: string): string {
  const themedDark = darkenHex(accent, 0.42)
  let background =
    relativeLuminance(accentDark) < relativeLuminance(themedDark) ? accentDark : themedDark

  const readableMaxLuminance = 0.26
  let guard = 0
  while (relativeLuminance(background) > readableMaxLuminance && guard < 5) {
    background = darkenHex(background, 0.12)
    guard += 1
  }

  return background
}

/** Theme-aware faculty / immersive chat — neutral you, solid accent Cora. */
export function getThemedCoraChatBubblePalette(tokens: {
  isDark: boolean
  accent: string
  accentDark: string
  native: {
    label: string
    groupedBackground: string
    separator: string
  }
}): CoraChatBubblePalette {
  const { isDark, accent, accentDark, native } = tokens
  const assistantBackground = resolveCoraAssistantBubbleBackground(accent, accentDark)

  return {
    user: {
      background: isDark ? "#3A3A3C" : native.groupedBackground,
      border: "transparent",
      text: native.label,
    },
    assistant: {
      background: assistantBackground,
      border: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.1)",
      text: "#FFFFFF",
    },
    userBorderWidth: 0,
    assistantBorderWidth: StyleSheet.hairlineWidth,
    userRadius: 22,
    assistantRadius: 12,
    assistantShadow: false,
    assistantMarkdownOnAccent: true,
  }
}

/** ChatGPT-style canvas — pure white / near-black. */
export function getCoraChatCanvasColor(isDark: boolean, native: NativeColors): string {
  return isDark ? "#000000" : "#FFFFFF"
}

/** User prompt pill — soft gray in light mode, charcoal in dark mode. */
export function getUserPromptBubbleColors(isDark: boolean, native: NativeColors) {
  if (isDark) {
    return {
      background: "#2F2F2F",
      border: "transparent",
      text: "#FFFFFF",
    }
  }
  return {
    background: "#F4F4F4",
    border: "transparent",
    text: "#000000",
  }
}

/** Cora responses sit directly on the canvas — no bubble card. */
export function getAssistantMessageColors(isDark: boolean, native: NativeColors) {
  return {
    background: "transparent",
    border: "transparent",
    text: isDark ? "#FFFFFF" : native.label,
  }
}

/** Action icons + disclaimer — app tertiary labels are too dim on pure black. */
export function getCoraChatChromeMutedColor(isDark: boolean, native: NativeColors): string {
  return isDark ? "#98989D" : (native.secondaryLabel ?? "#8E8E93")
}

/** Context menu / select sheet preview uses the same user pill colors. */
export function getUserPromptBubbleShadow(isDark: boolean) {
  if (isDark) {
    return {
      shadowColor: "#000000",
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    }
  }
  return {
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  }
}

export function getUserPromptBubbleBorderWidth(): number {
  return 0
}

export function getUserPromptBubbleRadius(): number {
  return 22
}
