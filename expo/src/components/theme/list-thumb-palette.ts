import { blendHexOnSurface, blendHexTowardWhite } from "../../constants/app-themes"
import { SYSTEM } from "../../constants/faculty-native-theme"

export type ListThumbPalette = {
  color: string
  soft: string
  border: string
}

export type ListThumbPaletteOptions = {
  /** Grouped list row / card surface — used to pre-blend dark thumb fills. */
  surfaceColor?: string
  /** App theme accent — replaces the purple slot so lavender tracks appearance. */
  themeAccent?: string
}

/** Rotating semantic thumb colors — same cycle as Lectures list cards. */
const LIST_THUMB_PALETTE: ListThumbPalette[] = [
  SYSTEM.purple,
  SYSTEM.blue,
  SYSTEM.teal,
  SYSTEM.orange,
]

const DARK_SURFACE_FALLBACK = "#1C1C1E"

/** Hue-rich dark thumb — avoids muddy brown when blending warm accents on gray cards. */
function buildDarkVividThumb(palette: ListThumbPalette, surfaceColor: string): ListThumbPalette {
  const inkBase = blendHexOnSurface(palette.color, "#060606", 0.22)
  const deepBase = blendHexOnSurface(inkBase, surfaceColor, 0.38)
  return {
    color: blendHexTowardWhite(palette.color, 0.28),
    soft: blendHexOnSurface(palette.color, deepBase, 0.5),
    border: blendHexOnSurface(palette.color, deepBase, 0.66),
  }
}

/** Light mode uses SYSTEM pastels; dark mode uses saturated tints with bright icons. */
export function adaptThumbPaletteForAppearance(
  palette: ListThumbPalette,
  isDark: boolean,
  surfaceColor = DARK_SURFACE_FALLBACK,
): ListThumbPalette {
  if (!isDark) return palette
  return buildDarkVividThumb(palette, surfaceColor || DARK_SURFACE_FALLBACK)
}

export function listThumbPalette(
  index: number,
  isDark = false,
  options?: ListThumbPaletteOptions,
): ListThumbPalette {
  const slot = index % LIST_THUMB_PALETTE.length
  let base = LIST_THUMB_PALETTE[slot] ?? SYSTEM.blue
  if (slot === 0 && options?.themeAccent) {
    base = { ...base, color: options.themeAccent }
  }
  return adaptThumbPaletteForAppearance(base, isDark, options?.surfaceColor)
}

export function thumbDotAlpha(isDark: boolean): number {
  return isDark ? 0.38 : 0.24
}

/** Inner icon disc — lifted on dark thumbs so icons do not melt into the tile. */
export function thumbIconCircleBackground(
  isDark: boolean,
  elevatedSurface: string,
  thumbSoft?: string,
): string {
  if (!isDark) return "#FFFFFF"
  return thumbSoft ? blendHexOnSurface("#FFFFFF", thumbSoft, 0.22) : elevatedSurface
}

export function listThumbPaletteOptions(
  surfaceColor: string,
  themeAccent?: string,
): ListThumbPaletteOptions {
  return { surfaceColor, themeAccent }
}
