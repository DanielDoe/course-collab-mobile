import { hexToRgba, type AppThemeTokens } from "../constants/app-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"
import {
  TRADE_CENTER_ACTION,
  TRADE_CENTER_BALANCE_THEMES,
  tradeCenterHistoryTheme,
  tradeCenterProgressTrack,
  type TradeCenterBalanceKey,
} from "./trade-center-theme"

export const FACULTY_TRADE_CENTER_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  action: TRADE_CENTER_ACTION.trade.fill,
  actionInk: TRADE_CENTER_ACTION.trade.ink,
  donate: TRADE_CENTER_ACTION.donate.fill,
  donateInk: TRADE_CENTER_ACTION.donate.ink,
  ec: GRADES_WARM.orange,
  points: COLOR_HUNT_COOL.cyan,
  donation: COLOR_HUNT.pink,
  config: COLOR_HUNT_COOL.indigo,
  rollover: COLOR_HUNT.amber,
} as const

export { TRADE_CENTER_ACTION, TRADE_CENTER_BALANCE_THEMES, tradeCenterHistoryTheme, tradeCenterProgressTrack }
export type { TradeCenterBalanceKey }

export function facultyTradeCenterTraderThumb(seed: string | number): SolidListThumb {
  return solidListThumbFromHash(seed)
}

export function facultyTradeCenterDonationThumb(): SolidListThumb {
  return solidListThumbFixed(FACULTY_TRADE_CENTER_COLOR.donation)
}

export function facultyTradeCenterActionSoft(tokens: AppThemeTokens): string {
  return hexToRgba(FACULTY_TRADE_CENTER_COLOR.action, tokens.isDark ? 0.22 : 0.12)
}

export function facultyTradeCenterKpiSolid(key: TradeCenterBalanceKey | "students" | "avgEc" | "trades" | "donations") {
  switch (key) {
    case "lifetimeEc":
      return TRADE_CENTER_BALANCE_THEMES.lifetimeEc
    case "practice":
      return TRADE_CENTER_BALANCE_THEMES.practice
    case "playground":
      return TRADE_CENTER_BALANCE_THEMES.playground
    case "reading":
      return TRADE_CENTER_BALANCE_THEMES.reading
    case "students":
      return { fill: COLOR_HUNT_COOL.cyan, iconInk: "#FFFFFF", valueInk: COLOR_HUNT_COOL.cyan, icon: "people-outline" as const }
    case "avgEc":
      return { fill: GRADES_WARM.orange, iconInk: "#FFFFFF", valueInk: GRADES_WARM.orange, icon: "trending-up-outline" as const }
    case "trades":
      return { fill: COLOR_HUNT_COOL.indigo, iconInk: "#FFFFFF", valueInk: COLOR_HUNT_COOL.indigo, icon: "swap-horizontal-outline" as const }
    case "donations":
      return { fill: COLOR_HUNT.pink, iconInk: "#FFFFFF", valueInk: COLOR_HUNT.pink, icon: "heart-outline" as const }
    default:
      return TRADE_CENTER_BALANCE_THEMES.lifetimeEc
  }
}

export function facultyTradeCenterRequestStatusColor(status: string): string {
  const s = status.toLowerCase()
  if (s.includes("pending")) return COLOR_HUNT.amber
  if (s.includes("approved")) return REPORT_SOLID.correct
  if (s.includes("reject")) return REPORT_SOLID.missed
  return FACULTY_TRADE_CENTER_COLOR.link
}
