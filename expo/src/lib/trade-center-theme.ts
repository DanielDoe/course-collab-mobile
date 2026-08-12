import type { IoniconName } from "@/components/icons/AppIcon"
import { hexToRgba } from "../constants/app-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"

export type TradeCenterBalanceKey = "lifetimeEc" | "practice" | "playground" | "reading"

export type TradeCenterBalanceTheme = {
  icon: IoniconName
  fill: string
  iconInk: string
  valueInk: string
}

/** Color Hunt accents for trade center KPI tiles — containers stay neutral. */
export const TRADE_CENTER_BALANCE_THEMES: Record<TradeCenterBalanceKey, TradeCenterBalanceTheme> = {
  lifetimeEc: {
    icon: "sparkles-outline",
    fill: GRADES_WARM.gold,
    iconInk: GRADES_WARM.ink,
    valueInk: GRADES_WARM.orange,
  },
  practice: {
    icon: "school-outline",
    fill: GRADES_WARM.orange,
    iconInk: "#FFFFFF",
    valueInk: GRADES_WARM.orange,
  },
  playground: {
    icon: "game-controller-outline",
    fill: COLOR_HUNT_COOL.cyan,
    iconInk: "#FFFFFF",
    valueInk: COLOR_HUNT_COOL.cyan,
  },
  reading: {
    icon: "book-outline",
    fill: COLOR_HUNT_COOL.indigo,
    iconInk: "#FFFFFF",
    valueInk: COLOR_HUNT_COOL.indigo,
  },
}

export function tradeCenterProgressTrack(fill: string, isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.12)" : hexToRgba(fill, 0.16)
}

export function tradeCenterHistoryTheme(transactionType?: string): TradeCenterBalanceTheme {
  if (transactionType === "DONATION") {
    return {
      icon: "heart-outline",
      fill: COLOR_HUNT.pink,
      iconInk: "#FFFFFF",
      valueInk: COLOR_HUNT.pinkDeep,
    }
  }
  return {
    icon: "swap-horizontal-outline",
    fill: GRADES_WARM.orange,
    iconInk: "#FFFFFF",
    valueInk: GRADES_WARM.orange,
  }
}

/** Primary action buttons — Color Hunt fills; card containers stay neutral. */
export const TRADE_CENTER_ACTION = {
  trade: {
    fill: GRADES_WARM.orange,
    ink: "#FFFFFF",
    icon: "trophy-outline" as const,
  },
  donate: {
    fill: COLOR_HUNT.pink,
    ink: "#FFFFFF",
    icon: "heart-outline" as const,
  },
} as const
