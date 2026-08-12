import { hexToRgba, type AppThemeTokens } from "../constants/app-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed } from "./solid-list-thumb"

/**
 * Auth / login — Color Hunt popular palettes.
 * https://colorhunt.co/palettes/popular
 *
 * Cool: gold · indigo · cyan · sky — colorhunt.co/palette/ffc349525ea75facd397dde9
 * Warm: orange · yellow · amber · pink — colorhunt.co/palette/ff6a1cffda62ffae56f5788b
 * Action orange — grades palette colorhunt.co/palette/e73f1efb6c00f9b637ffdd9c
 *
 * Card rows stay neutral; color applies to CTAs, icon tiles, headlines, links, and canvas bubbles.
 */
export const LOGIN_COLOR = {
  primary: COLOR_HUNT_COOL.indigo,
  secondary: COLOR_HUNT_COOL.cyan,
  highlight: COLOR_HUNT_COOL.sky,
  gold: COLOR_HUNT_COOL.gold,
  goldInk: COLOR_HUNT.ink,
  action: GRADES_WARM.orange,
  actionInk: "#FFFFFF",
  warmAccent: COLOR_HUNT.amber,
} as const

/** Solid icon tiles on welcome secondary portal rows. */
export const LOGIN_PORTAL_THUMBS = {
  faculty: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  guest: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  summer: solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
} as const

export function loginSoftWash(color: string, isDark: boolean): string {
  return hexToRgba(color, isDark ? 0.22 : 0.1)
}

export function loginCanvasBubbles(tokens: AppThemeTokens): { a: string; b: string; c: string } {
  return {
    a: hexToRgba(LOGIN_COLOR.primary, tokens.isDark ? 0.2 : 0.11),
    b: hexToRgba(LOGIN_COLOR.secondary, tokens.isDark ? 0.16 : 0.09),
    c: hexToRgba(LOGIN_COLOR.warmAccent, tokens.isDark ? 0.14 : 0.08),
  }
}

export function loginThemeAccentSoft(isDark: boolean): string {
  return loginSoftWash(LOGIN_COLOR.primary, isDark)
}

export function loginThemeGoldSoft(isDark: boolean): string {
  return loginSoftWash(LOGIN_COLOR.gold, isDark)
}
