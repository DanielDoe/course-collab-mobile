export type TradeCenterMenuTab =
  | "overview"
  | "config"
  | "analytics"
  | "donations"
  | "trade-log"
  | "rollover-trades"
  | "activity-settings"

export const TRADE_CENTER_TABS: Array<{
  id: TradeCenterMenuTab
  label: string
  icon: "grid-outline" | "options-outline" | "bar-chart-outline" | "gift-outline" | "list-outline" | "refresh-outline" | "toggle-outline"
}> = [
  { id: "overview", label: "Overview", icon: "grid-outline" },
  { id: "config", label: "Conversion Rules", icon: "options-outline" },
  { id: "analytics", label: "Student Analytics", icon: "bar-chart-outline" },
  { id: "donations", label: "Donations", icon: "gift-outline" },
  { id: "trade-log", label: "Trade log", icon: "list-outline" },
  { id: "rollover-trades", label: "Rollover Trades", icon: "refresh-outline" },
  { id: "activity-settings", label: "Activity Settings", icon: "toggle-outline" },
]

export type TradeCenterConfig = {
  session: string
  practice_weight: number
  playground_weight: number
  reading_weight: number
  weekly_practice_cap: number
  weekly_playground_cap: number
  weekly_reading_cap: number
  ec_conversion_multiplier: number
  max_engagement_credits: number
  trading_enabled: boolean
  donations_enabled: boolean
  min_donation_points: number
  weekly_reset_day: number
  is_active: boolean
  practice_enabled: boolean
  playground_enabled: boolean
  reading_enabled: boolean
}

export const DEFAULT_TRADE_CENTER_CONFIG: TradeCenterConfig = {
  session: "ALL",
  practice_weight: 1,
  playground_weight: 1,
  reading_weight: 0.8,
  weekly_practice_cap: 60,
  weekly_playground_cap: 36,
  weekly_reading_cap: 40,
  ec_conversion_multiplier: 0.01,
  max_engagement_credits: 10,
  trading_enabled: true,
  donations_enabled: true,
  min_donation_points: 100,
  weekly_reset_day: 1,
  is_active: true,
  practice_enabled: true,
  playground_enabled: true,
  reading_enabled: true,
}

function num(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function int(v: unknown, fallback: number): number {
  return Math.floor(num(v, fallback))
}

function bool(v: unknown, fallback: boolean): boolean {
  if (v === true || v === false) return v
  if (v === "true") return true
  if (v === "false") return false
  return fallback
}

export function parseTradeCenterConfig(raw: Record<string, unknown> | null | undefined): TradeCenterConfig {
  const d = DEFAULT_TRADE_CENTER_CONFIG
  if (!raw) return { ...d }
  return {
    session: String(raw.session ?? d.session),
    practice_weight: num(raw.practice_weight, d.practice_weight),
    playground_weight: num(raw.playground_weight, d.playground_weight),
    reading_weight: num(raw.reading_weight, d.reading_weight),
    weekly_practice_cap: int(raw.weekly_practice_cap, d.weekly_practice_cap),
    weekly_playground_cap: int(raw.weekly_playground_cap, d.weekly_playground_cap),
    weekly_reading_cap: int(raw.weekly_reading_cap, d.weekly_reading_cap),
    ec_conversion_multiplier: num(raw.ec_conversion_multiplier, d.ec_conversion_multiplier),
    max_engagement_credits: int(raw.max_engagement_credits ?? raw.ec_cap, d.max_engagement_credits),
    trading_enabled: bool(raw.trading_enabled, d.trading_enabled),
    donations_enabled: bool(raw.donations_enabled ?? raw.donation_enabled, d.donations_enabled),
    min_donation_points: int(raw.min_donation_points, d.min_donation_points),
    weekly_reset_day: int(raw.weekly_reset_day, d.weekly_reset_day),
    is_active: bool(raw.is_active, d.is_active),
    practice_enabled: bool(raw.practice_enabled, d.practice_enabled),
    playground_enabled: bool(raw.playground_enabled, d.playground_enabled),
    reading_enabled: bool(raw.reading_enabled, d.reading_enabled),
  }
}

export function pointsPerEngagementCredit(multiplier: number): number {
  return Math.max(1, Math.round(1 / (multiplier || 0.01)))
}

export function formatTradeLogWhen(iso: unknown): string {
  if (iso == null || iso === "") return "—"
  const d = new Date(String(iso))
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function humanizeTradeStatus(status: unknown): string {
  const raw = String(status ?? "").trim()
  if (!raw) return "—"
  return raw
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
}

export function rowMatchesTradeSearch(row: Record<string, unknown>, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return Object.values(row).some((v) => v != null && String(v).toLowerCase().includes(q))
}

export const TRADE_SOURCE_LABELS: Record<string, string> = {
  practice: "Practice Hub",
  playground: "Playground",
  reading: "Lecture Reading",
  total: "Activity total",
  classroom: "Classroom",
}
