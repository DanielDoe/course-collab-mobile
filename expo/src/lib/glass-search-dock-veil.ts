import { hexToRgba } from "../constants/app-themes"

/** Fade height above the search pill — list glyphs dissolve before they hit the icons. */
export const SEARCH_DOCK_VEIL_FADE = 40

export function searchDockVeilColors(canvas: string): [string, string, string] {
  if (canvas.startsWith("#")) {
    return [hexToRgba(canvas, 0), hexToRgba(canvas, 0.58), hexToRgba(canvas, 0.94)]
  }
  return ["transparent", canvas, canvas]
}

/** Soft canvas wash in the side gutters and home-indicator band. */
export function searchDockGutterColor(canvas: string): string {
  if (canvas.startsWith("#")) return hexToRgba(canvas, 0.88)
  return canvas
}

export function searchDockReadableWash(isDark: boolean): string {
  return isDark ? "rgba(28, 28, 30, 0.78)" : "rgba(255, 255, 255, 0.84)"
}

export function searchDockReadableBorder(isDark: boolean): string {
  return isDark ? "rgba(255, 255, 255, 0.28)" : "rgba(0, 0, 0, 0.16)"
}
