/** Faculty Cora Insights — same `/api/instructor/cora-insights` contract as v0-coursecollabv3. */

export const CORA_INSIGHTS_TABS = [
  { id: "overview", label: "Overview", icon: "grid-outline" },
  { id: "needs", label: "Student Needs", icon: "people-outline" },
  { id: "gaps", label: "Learning Gaps", icon: "git-network-outline" },
  { id: "usage", label: "Cora Usage", icon: "bar-chart-outline" },
  { id: "assistance", label: "AI Assistance", icon: "sparkles-outline" },
  { id: "live", label: "Live Activity", icon: "pulse-outline" },
  { id: "predictions", label: "Predictions", icon: "trending-up-outline" },
  { id: "interventions", label: "Interventions", icon: "flash-outline" },
] as const

export type CoraInsightsTabId = (typeof CORA_INSIGHTS_TABS)[number]["id"]

export const CORA_INSIGHTS_RANGES = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "semester", label: "Semester" },
] as const

export type CoraInsightsRangeId = (typeof CORA_INSIGHTS_RANGES)[number]["id"]

export const CORA_INSIGHTS_LIVE_FILTERS = [
  { id: "all", label: "All" },
  { id: "cora", label: "Cora" },
  { id: "assessment", label: "Assessment" },
  { id: "practice", label: "Practice" },
  { id: "codebench", label: "CodeBench" },
  { id: "learning", label: "Learning" },
] as const

export type CoraInsightsLiveFilter = (typeof CORA_INSIGHTS_LIVE_FILTERS)[number]["id"]

export const CORA_INSIGHTS_METRIC_LABELS: Record<string, string> = {
  cora_sessions: "Cora Sessions",
  active_students: "Active Students",
  students_needing_attention: "Students Needing Attention",
  avg_requests: "Avg. Cora Requests / Student",
  assisted_success: "Cora-Assisted Success Rate",
  answers_blocked: "Answer-Seeking Requests Blocked",
}

export const CORA_INSIGHTS_KPI_PAGES = {
  cora_sessions: {
    title: "Cora Sessions",
    subtitle: "Students and recent Cora sessions in this window.",
    sources: ["needs", "live"] as const,
  },
  active_students: {
    title: "Active Students",
    subtitle: "Roster students who used Cora in this window.",
    sources: ["needs"] as const,
  },
  students_needing_attention: {
    title: "Students Needing Attention",
    subtitle: "Students who meet the multi-signal attention threshold.",
    sources: ["needs"] as const,
  },
  avg_requests: {
    title: "Cora Requests",
    subtitle: "Sessions per student among those who used Cora.",
    sources: ["needs"] as const,
  },
  assisted_success: {
    title: "Assisted Success",
    subtitle: "What happened after students asked Cora for help.",
    sources: ["assistance"] as const,
  },
  answers_blocked: {
    title: "Answer-Seeking Blocked",
    subtitle: "Integrity signal from Ask Cora on assessments — not a misconduct finding.",
    sources: ["assistance"] as const,
  },
} as const

export type CoraInsightsKpiId = keyof typeof CORA_INSIGHTS_KPI_PAGES

export function coraInsightsKpiPage(id: string | null | undefined) {
  if (!id) return null
  return CORA_INSIGHTS_KPI_PAGES[id as CoraInsightsKpiId] ?? null
}

export function studentsUsingCora(students: CoraInsightsNeedStudent[] | undefined) {
  return [...(students ?? [])]
    .filter((row) => Number(row.coraSessions) > 0)
    .sort((a, b) => Number(b.coraSessions ?? 0) - Number(a.coraSessions ?? 0))
}

export function studentsNeedingAttention(students: CoraInsightsNeedStudent[] | undefined) {
  return (students ?? []).filter((row) => row.risk === "high" || row.risk === "medium")
}

export const CORA_INSIGHTS_HEALTH_LABELS: Record<string, string> = {
  strong: "Strong",
  developing: "Developing",
  struggling: "Struggling",
  critical: "Critical",
}

export const CORA_INSIGHTS_HEALTH_COLORS: Record<string, string> = {
  strong: "#059669",
  developing: "#F59E0B",
  struggling: "#EA580C",
  critical: "#BE123C",
}

export const CORA_INSIGHTS_DEPENDENCE_COPY: Record<string, string> = {
  increasing_independence: "Increasing Independence",
  stable_assistance: "Stable Assistance",
  high_assistance_need: "High Assistance Need",
  insufficient_evidence: "Insufficient Evidence",
}

export const CORA_HEAT_BUCKETS = [
  { id: 0, label: "12–4a" },
  { id: 1, label: "4–8a" },
  { id: 2, label: "8a–12p" },
  { id: 3, label: "12–4p" },
  { id: 4, label: "4–8p" },
  { id: 5, label: "8p–12a" },
] as const

export const CORA_HEAT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export type CoraInsightsQueryExtra = {
  range?: string
  assessmentId?: string
  topic?: string
  studentId?: string
  concept?: string
  liveFilter?: string
}

export type CoraInsightsEnvelope<T> = {
  ok?: boolean
  data?: T
  error?: string
}

export type CoraInsightsFilterOption = {
  assessments: Array<{ id: number; title: string; type?: string | null }>
  topics: string[]
  students: Array<{ id: number; name: string; code?: string; section?: string | null }>
}

export type CoraInsightsKpi = {
  id: string
  value: number | string | null
  delta?: number | null
  sub?: string
}

export type CoraInsightsNeedStudent = {
  id: number
  name: string
  code?: string
  section?: string | null
  risk?: string
  primaryConcern?: string
  evidence?: string
  trend?: string
  coraSessions?: number
  coraUsage?: string
  lastActivity?: string | null
  recommendedAction?: string
  performance?: number | null
  engagement?: number | null
}

export type CoraInsightsAction = {
  id?: string
  title: string
  detail?: string
  href?: string
  cta?: string
  affected?: number
}

export type CoraInsightsOverview = {
  kpis?: CoraInsightsKpi[]
  summary?: string
  health?: {
    sample?: number
    bands?: Array<{ band: string; count?: number; pct?: number }>
  }
  attentionPreview?: CoraInsightsNeedStudent[]
  recommendedActions?: CoraInsightsAction[]
}

export type CoraInsightsNeeds = {
  students?: CoraInsightsNeedStudent[]
}

export type CoraInsightsConcept = {
  concept: string
  students?: number
  requests?: number
  successAfter?: number | null
  independentSuccess?: number | null
}

export type CoraInsightsMistakeExample = {
  studentId?: number
  studentName?: string
  line?: number
  snippet?: string
  submissionId?: number
}

export type CoraInsightsMistake = {
  id?: string
  label: string
  detail?: string
  students?: number
  occurrences?: number
  examples?: CoraInsightsMistakeExample[]
}

export type CoraInsightsGaps = {
  concepts?: CoraInsightsConcept[]
  mistakes?: CoraInsightsMistake[]
  heatmap?: {
    weeks?: string[]
    rows?: Array<{
      concept: string
      cells: Array<{ week: string; intensity: number; students?: number; requests?: number }>
    }>
  }
  conceptDetail?: {
    empty?: boolean
    concept?: string
    students?: number
    sessions?: number
    successAfter?: number | null
    independentSuccess?: number | null
    struggles?: Array<{ label: string; students?: number }>
  } | null
}

export type CoraInsightsUsage = {
  categories?: {
    total?: number
    slices?: Array<{ category?: string; label: string; count: number; pct?: number }>
  }
  timeline?: Array<{
    date?: string
    dateLabel?: string
    interactions?: number
    students?: number
    debugging?: number
    analysis?: number
    planning?: number
    other?: number
  }>
  hourHeat?: Array<{ dow: number; hour: number; count: number }>
  events?: Array<{ title?: string }>
}

export type CoraInsightsAssistance = {
  outcomes?: Array<{
    bucket: string
    correct?: number
    incorrect?: number
    sessions?: number
    students?: number
    usageFallback?: boolean
  }>
  funnel?: {
    asked?: number
    guided?: number
    retried?: number
    solved?: number
    independent?: number
    usageFallback?: boolean
  }
  compare?: Array<{
    concept: string
    coraAssisted?: number | null
    independent?: number | null
    sessions?: number
  }>
  dependence?: {
    label?: string
    note?: string
    weeks?: Array<{ week: string; depth?: number; n?: number }>
  }
  integrity?: Array<{
    assessmentId?: number
    type?: string
    requests?: number
    hints?: number
    concepts?: number
    seeking?: number
    blocked?: number
    solvedPct?: number | null
  }>
}

export type CoraInsightsLiveEvent = {
  at?: string
  studentId?: number
  student?: string
  concept?: string
  summary?: string
  kind?: string
}

export type CoraInsightsLive = {
  events?: CoraInsightsLiveEvent[]
  hotTopics?: Array<{ concept: string; requests?: number; change?: number }>
  spikes?: Array<{ concept: string; message?: string }>
}

export type CoraInsightsPrediction = {
  studentId: number
  name: string
  prediction?: string
  level?: string
  confidence?: number | null
  evidence?: string[]
  action?: string
  ready?: boolean
  note?: string | null
}

export type CoraInsightsPredictions = {
  predictions?: CoraInsightsPrediction[]
  disclaimer?: string
}

export type CoraInsightsStudentProfile = {
  empty?: boolean
  student?: CoraInsightsNeedStudent & { primaryConcern?: string }
  concepts?: Array<{ concept: string; requests?: number; successAfter?: number | null }>
  timeline?: Array<{ week?: string; label?: string; requests?: number }>
  recent?: Array<{ at?: string; summary?: string }>
}

export function buildCoraInsightsQuery(tab: string, extra: CoraInsightsQueryExtra = {}): string {
  const qs = new URLSearchParams({ tab })
  if (extra.range) qs.set("range", extra.range)
  if (extra.assessmentId && extra.assessmentId !== "all") qs.set("assessmentId", extra.assessmentId)
  if (extra.topic && extra.topic !== "all") qs.set("topic", extra.topic)
  if (extra.studentId && extra.studentId !== "all") qs.set("studentId", extra.studentId)
  if (extra.concept) qs.set("concept", extra.concept)
  if (extra.liveFilter && extra.liveFilter !== "all") qs.set("liveFilter", extra.liveFilter)
  return `/api/instructor/cora-insights?${qs}`
}

export function unwrapCoraInsights<T>(body: CoraInsightsEnvelope<T> | null | undefined): T {
  if (!body || body.data === undefined || body.ok === false) {
    throw new Error(body?.error || "Failed to load Cora Insights")
  }
  return body.data
}

export function formatCoraInsightsKpiValue(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—"
  return String(value)
}

export function formatCoraInsightsDelta(delta: number | null | undefined, sub?: string): string {
  if (delta == null) return sub ?? ""
  const arrow = delta > 0 ? "↑" : "↓"
  const pct = Number.isInteger(delta) ? String(Math.abs(delta)) : Math.abs(delta).toFixed(2)
  return sub ? `${arrow} ${pct}% · ${sub}` : `${arrow} ${pct}%`
}

export function initialsFromName(name: string): string {
  const parts = String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?"
}

export function formatCoraInsightsWhen(value?: string | null, withTime = true): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return withTime
    ? date.toLocaleString(undefined, { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString()
}

export function formatCoraInsightsClock(value?: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" })
}

export function riskBadgeTone(risk?: string): "danger" | "warning" | "accent" | "muted" {
  const value = String(risk ?? "low").toLowerCase()
  if (value === "high") return "danger"
  if (value === "medium") return "warning"
  if (value === "watch") return "accent"
  return "muted"
}

export function riskFillColor(risk?: string): string {
  const value = String(risk ?? "low").toLowerCase()
  if (value === "high") return "#BE123C"
  if (value === "medium") return "#B45309"
  if (value === "watch") return "#4F46E5"
  return "#0F766E"
}

export function mapCoraInsightsHref(href?: string | null): string | null {
  if (!href) return null
  if (href.includes("/content/practice")) return "/module/practice"
  if (href.includes("/management/students")) return "/module/students"
  if (href.includes("/analytics")) return "/module/analytics"
  if (href.includes("/cora")) return "/module/cora"
  return null
}

export function interventionItems(data: unknown): CoraInsightsAction[] {
  if (Array.isArray(data)) return data as CoraInsightsAction[]
  if (data && typeof data === "object" && Array.isArray((data as { actions?: unknown }).actions)) {
    return (data as { actions: CoraInsightsAction[] }).actions
  }
  return []
}

export function bucketHourHeat(
  heat: Array<{ dow: number; hour: number; count: number }> | undefined,
  days: readonly string[] = CORA_HEAT_DAYS,
): {
  grid: number[][]
  peak: { dow: number; bucket: number; count: number; dayLabel: string; bucketLabel: string }
} {
  const grid = days.map((_, dow) =>
    CORA_HEAT_BUCKETS.map((bucket) =>
      (heat ?? [])
        .filter((row) => row.dow === dow && Math.floor(row.hour / 4) === bucket.id)
        .reduce((sum, row) => sum + row.count, 0),
    ),
  )
  const peak = { dow: 0, bucket: 0, count: 0 }
  grid.forEach((row, dow) => {
    row.forEach((count, bucket) => {
      if (count > peak.count) Object.assign(peak, { dow, bucket, count })
    })
  })
  return {
    grid,
    peak: {
      ...peak,
      dayLabel: days[peak.dow] ?? "",
      bucketLabel: CORA_HEAT_BUCKETS[peak.bucket]?.label ?? "",
    },
  }
}
