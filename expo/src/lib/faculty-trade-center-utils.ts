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

export function transactionMatchesTrader(
  trader: { id?: number; full_name?: string; student_number?: string },
  row: Record<string, unknown>,
): boolean {
  const traderId = trader.id
  const rowStudentId = row.student_id ?? row.studentId ?? row.user_id
  if (traderId != null && rowStudentId != null && Number(rowStudentId) === Number(traderId)) {
    return true
  }
  const traderNumber = String(trader.student_number ?? "").trim()
  const rowNumber = String(row.student_number ?? row.student_code ?? "").trim()
  if (traderNumber && rowNumber && traderNumber === rowNumber) return true
  const traderName = String(trader.full_name ?? "")
    .trim()
    .toLowerCase()
  const rowName = String(row.student_name ?? row.full_name ?? row.name ?? "")
    .trim()
    .toLowerCase()
  if (traderName && rowName && traderName === rowName) return true
  return false
}

export function tradeTransactionTitle(row: Record<string, unknown>): string {
  const summary = String(row.summary ?? "").trim()
  if (summary) return summary
  const type = String(row.transaction_type ?? row.type ?? row.action ?? "").trim()
  if (type) return humanizeTradeStatus(type)
  return "Trade activity"
}

export function tradeTransactionPoints(row: Record<string, unknown>): string | null {
  const points = row.points ?? row.amount ?? row.points_traded
  if (points == null || points === "") return null
  return `${points} pts`
}

export type TradeLogSectionKey = "transactions" | "rollovers" | "donationRequests" | "pointRequests"

export type TradeCenterTradeLogData = {
  transactions?: Array<Record<string, unknown>>
  rollovers?: Array<Record<string, unknown>>
  donationRequests?: Array<Record<string, unknown>>
  pointRequests?: Array<Record<string, unknown>>
}

export const TRADE_LOG_SECTION_ORDER: TradeLogSectionKey[] = [
  "transactions",
  "rollovers",
  "donationRequests",
  "pointRequests",
]

export function tradeLogSectionTitle(key: TradeLogSectionKey): string {
  switch (key) {
    case "transactions":
      return "Trades"
    case "rollovers":
      return "Rollovers"
    case "donationRequests":
      return "Donations"
    case "pointRequests":
      return "Point Requests"
    default:
      return "Activity"
  }
}

export function tradeLogRowWhen(row: Record<string, unknown>): string {
  return formatTradeLogWhen(
    row.created_at ?? row.timestamp ?? row.reviewed_at ?? row.instructor_responded_at ?? row.applied_at,
  )
}

export function tradeLogRowTitle(key: TradeLogSectionKey, row: Record<string, unknown>): string {
  const summary = String(row.summary ?? "").trim()
  if (summary) return summary

  switch (key) {
    case "transactions":
      return tradeTransactionTitle(row)
    case "rollovers":
      return String(row.student_name ?? row.studentName ?? "Student")
    case "donationRequests": {
      const donor = String(row.donor_name ?? row.student_name ?? "Student")
      const recipient = row.recipient_name ? String(row.recipient_name) : null
      return recipient ? `${donor} → ${recipient}` : donor
    }
    case "pointRequests": {
      const requester = String(row.requester_name ?? row.student_name ?? "Student")
      const requestee = row.requestee_name ? String(row.requestee_name) : null
      return requestee ? `${requester} ← ${requestee}` : requester
    }
    default:
      return "Activity"
  }
}

export function tradeLogRowDescription(key: TradeLogSectionKey, row: Record<string, unknown>): string {
  const parts: string[] = [tradeLogRowWhen(row)]

  const points = row.points ?? row.points_used ?? row.points_deducted ?? row.amount
  if (points != null && points !== "") parts.push(`${points} pts`)

  if (key === "rollovers") {
    const quiz = row.quiz_title ?? row.quizTitle
    if (quiz) parts.push(String(quiz))
    if (row.hours != null) parts.push(`${row.hours}h extension`)
  }

  if (key === "donationRequests" || key === "pointRequests") {
    const sourceKey = String(row.source ?? row.point_source ?? "")
    const source = TRADE_SOURCE_LABELS[sourceKey] ?? (sourceKey || "")
    if (source) parts.push(source)
  }

  if (key === "transactions" && row.credits_gained != null) {
    parts.push(`${row.credits_gained} EC`)
  }

  return parts.filter(Boolean).join(" · ")
}

export function tradeLogRowStatus(row: Record<string, unknown>): string | undefined {
  const status = row.status ?? row.transaction_type
  if (status == null || status === "") return undefined
  return String(status)
}

export function buildTradeLogSections(
  tradeLog: TradeCenterTradeLogData | null,
  search: string,
): Array<{ key: TradeLogSectionKey; rows: Array<Record<string, unknown>> }> {
  if (!tradeLog) return []
  return TRADE_LOG_SECTION_ORDER.map((key) => ({
    key,
    rows: (tradeLog[key] ?? []).filter((row) => rowMatchesTradeSearch(row, search)),
  })).filter((section) => section.rows.length > 0)
}

export const TRADE_SOURCE_LABELS: Record<string, string> = {
  practice: "Practice Hub",
  playground: "Playground",
  reading: "Lecture Reading",
  total: "Activity total",
  classroom: "Classroom",
}

export type TradeCenterRequestKind = "donation" | "point"

export type TradeCenterRequestView = {
  kind: TradeCenterRequestKind
  id: number
  title: string
  subtitle: string
  status: string
  pending: boolean
  meta?: string
  row: Record<string, unknown>
}

export function isTradeCenterRequestPending(status: unknown): boolean {
  const s = String(status ?? "").toLowerCase()
  return s === "pending" || s === "pending_instructor"
}

export function parseTradeCenterRequestRow(
  kind: TradeCenterRequestKind,
  row: Record<string, unknown>,
): TradeCenterRequestView {
  const id = Number(row.id)
  const sourceKey = String(row.source ?? row.point_source ?? "")
  const source = TRADE_SOURCE_LABELS[sourceKey] ?? (sourceKey || "Activity")
  const points = row.points ?? row.amount ?? 0
  const status = String(row.status ?? "pending")
  const pending = isTradeCenterRequestPending(status)
  const title = String(row.student_name ?? row.donor_name ?? row.requester_name ?? "Student")
  const subtitle = `${points} pts · ${source}`
  let meta =
    kind === "donation"
      ? row.recipient_name
        ? `To ${String(row.recipient_name)}`
        : undefined
      : row.reason
        ? String(row.reason)
        : "Peer-approved point request"

  if (!pending) {
    const reviewedAt = row.reviewed_at ?? row.instructor_responded_at
    if (reviewedAt) {
      const when = formatTradeLogWhen(reviewedAt)
      meta = meta ? `${meta} · Reviewed ${when}` : `Reviewed ${when}`
    }
    const rejectionReason = row.rejection_reason
    if (rejectionReason) {
      meta = meta ? `${meta} · ${String(rejectionReason)}` : String(rejectionReason)
    }
  }

  return {
    kind,
    id,
    title,
    subtitle,
    status,
    pending,
    meta,
    row,
  }
}

export function isTradeCenterDevFixtureId(id: number): boolean {
  return Number.isFinite(id) && id < 0
}

/** Dev-only QA rows for simulator / Maestro donation review flows. */
export const TRADE_CENTER_DEV_DONATION_FIXTURES: Array<Record<string, unknown>> = [
  {
    id: -9101,
    student_name: "QA Donor One",
    donor_name: "QA Donor One",
    student_number: "665322501",
    section: "ECE2202",
    points: 150,
    source: "practice",
    status: "pending",
    recipient_name: "Community pool",
    reason: "Simulator donation for instructor review.",
    created_at: new Date().toISOString(),
  },
  {
    id: -9102,
    student_name: "QA Donor Two",
    donor_name: "QA Donor Two",
    student_number: "665322502",
    section: "ECE2202",
    points: 200,
    source: "playground",
    status: "pending",
    recipient_name: "Classmates in need",
    reason: "Extra playground points earmarked for donation.",
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
  },
]

export const TRADE_CENTER_DEV_POINT_FIXTURES: Array<Record<string, unknown>> = [
  {
    id: -9201,
    student_name: "QA Point Request",
    requester_name: "QA Point Request",
    student_number: "665322503",
    section: "ECE2202",
    points: 75,
    source: "reading",
    status: "pending_instructor",
    reason: "Peer support for lab materials.",
    created_at: new Date().toISOString(),
  },
]

function applyTradeCenterDevFixturePatches(
  fixtures: Array<Record<string, unknown>>,
  patches: Record<number, Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return fixtures.map((row) => {
    const patch = patches[Number(row.id)]
    return patch ? { ...row, ...patch } : row
  })
}

export function mergeTradeCenterDevDonationFixtures(
  apiRows: Array<Record<string, unknown>>,
  devPatches: Record<number, Record<string, unknown>> = {},
): Array<Record<string, unknown>> {
  if (!__DEV__) return apiRows
  const fixtures = applyTradeCenterDevFixturePatches(TRADE_CENTER_DEV_DONATION_FIXTURES, devPatches)
  return [...fixtures, ...apiRows]
}

export function mergeTradeCenterDevPointFixtures(
  apiRows: Array<Record<string, unknown>>,
  devPatches: Record<number, Record<string, unknown>> = {},
): Array<Record<string, unknown>> {
  if (!__DEV__) return apiRows
  const fixtures = applyTradeCenterDevFixturePatches(TRADE_CENTER_DEV_POINT_FIXTURES, devPatches)
  return [...fixtures, ...apiRows]
}

export type TradeCenterRolloverTradeView = {
  id: number
  studentId: number
  studentName: string
  studentNumber: string
  section: string
  membershipTier: string
  quizId: number
  quizTitle: string
  assessmentType: string
  sourceCategory: string | null
  sourceLabel: string
  pointsTraded: number
  hours: number
  appliedAt: string | null
  expiresAt: string | null
  isActive: boolean
  isDevFixture: boolean
}

function pickTradeRowString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return ""
}

function pickTradeRowNumber(row: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = row[key]
    if (value == null || value === "") continue
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export function parseTradeCenterRolloverRow(row: Record<string, unknown>): TradeCenterRolloverTradeView {
  const id = pickTradeRowNumber(row, ["id"], 0)
  const appliedAt = pickTradeRowString(row, ["appliedAt", "applied_at", "created_at", "timestamp"]) || null
  const expiresAt = pickTradeRowString(row, ["expiresAt", "expires_at"]) || null
  const isActive =
    row.isActive === true ||
    row.is_active === true ||
    String(row.status ?? "").toLowerCase() === "active" ||
    (expiresAt ? new Date(expiresAt).getTime() > Date.now() : false)

  return {
    id,
    studentId: pickTradeRowNumber(row, ["studentId", "student_id"]),
    studentName:
      pickTradeRowString(row, ["studentName", "student_name", "full_name", "name"]) || "Unknown student",
    studentNumber: pickTradeRowString(row, ["studentNumber", "student_number", "student_code"]),
    section: pickTradeRowString(row, ["section", "section_code", "session"]),
    membershipTier: pickTradeRowString(row, ["membershipTier", "membership_tier"]),
    quizId: pickTradeRowNumber(row, ["quizId", "quiz_id"]),
    quizTitle:
      pickTradeRowString(row, ["quizTitle", "quiz_title", "title", "assessment_title"]) || "Unknown assignment",
    assessmentType: pickTradeRowString(row, ["assessmentType", "assessment_type", "type"]),
    sourceCategory: pickTradeRowString(row, ["sourceCategory", "source_category"]) || null,
    sourceLabel:
      pickTradeRowString(row, ["sourceLabel", "source_label", "rollover_type", "reason"]) || "Rollover",
    pointsTraded: pickTradeRowNumber(row, ["pointsTraded", "points_traded", "points_deducted", "points"]),
    hours: pickTradeRowNumber(row, ["hours", "rollover_hours"], 24),
    appliedAt,
    expiresAt,
    isActive,
    isDevFixture: isTradeCenterDevFixtureId(id),
  }
}

export function rolloverTradeListDescription(view: TradeCenterRolloverTradeView): string {
  const parts = [view.quizTitle, humanizeTradeStatus(view.assessmentType || view.sourceLabel)]
  if (view.pointsTraded > 0) parts.push(`${view.pointsTraded} pts traded`)
  else parts.push(view.sourceLabel)
  return parts.filter(Boolean).join(" · ")
}

export function rolloverTradeListMeta(view: TradeCenterRolloverTradeView): string {
  const when = view.appliedAt ? formatTradeLogWhen(view.appliedAt) : "Applied time unavailable"
  return `${when} · ${view.hours}h extension`
}

/** Dev-only QA rows for rollover list/detail flows in the simulator. */
export const TRADE_CENTER_DEV_ROLLOVER_FIXTURES: Array<Record<string, unknown>> = [
  {
    id: -9301,
    studentId: 665322590,
    studentName: "Daniel Doe",
    studentNumber: "665322590",
    section: "ECE2202",
    membershipTier: "Trailblazer",
    quizId: 101,
    quizTitle: "Quiz 3 — Loops & Arrays",
    assessmentType: "quiz",
    sourceCategory: "quiz",
    sourceLabel: "Quiz",
    pointsTraded: 120,
    hours: 24,
    appliedAt: new Date(Date.now() - 3_600_000).toISOString(),
    expiresAt: new Date(Date.now() + 82_800_000).toISOString(),
    isActive: true,
  },
  {
    id: -9302,
    studentId: 665322501,
    studentName: "QA Rollover Student",
    studentNumber: "665322501",
    section: "ECE2202",
    membershipTier: "Scholar",
    quizId: 202,
    quizTitle: "Homework 4 — Pointers",
    assessmentType: "homework",
    sourceCategory: "homework",
    sourceLabel: "Homework",
    pointsTraded: 80,
    hours: 12,
    appliedAt: new Date(Date.now() - 172_800_000).toISOString(),
    expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
    isActive: false,
  },
  {
    id: -9303,
    studentId: 665322502,
    studentName: "QA Instructor Grant",
    studentNumber: "665322502",
    section: "ECE2202",
    membershipTier: "Explorer",
    quizId: 303,
    quizTitle: "Mid-Semester Exam A",
    assessmentType: "midterm",
    sourceCategory: null,
    sourceLabel: "Instructor",
    pointsTraded: 0,
    hours: 24,
    appliedAt: new Date(Date.now() - 7_200_000).toISOString(),
    expiresAt: new Date(Date.now() + 79_200_000).toISOString(),
    isActive: true,
  },
]

export function mergeTradeCenterDevRolloverResponse<T extends { trades: Array<Record<string, unknown>>; total: number }>(
  response: T | null,
): T | null {
  if (!response) return null
  if (!__DEV__) return response
  return {
    ...response,
    trades: [...TRADE_CENTER_DEV_ROLLOVER_FIXTURES, ...response.trades],
    total: response.total + TRADE_CENTER_DEV_ROLLOVER_FIXTURES.length,
  }
}
