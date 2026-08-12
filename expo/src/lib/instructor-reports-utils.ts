import { Platform, Share } from "react-native"
import { NATIVE } from "../constants/faculty-native-theme"

/** Report template IDs — aligned with web `app/instructor/reports/page.tsx`. */
export type InstructorReportTemplateId =
  | "quiz-performance"
  | "student-progress"
  | "session-analytics"
  | "assessment-summary"
  | "completion-rates"
  | "learning-analytics"
  | "performance-trends"
  | "anti-cheat-reports"
  | "observability"
  | "individual-student"

export type ReportTemplateTone = "teal" | "blue" | "violet" | "amber" | "rose" | "sky" | "slate"

export type ReportTemplateConfig = {
  id: InstructorReportTemplateId
  label: string
  description: string
  category: string
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap
  tone: ReportTemplateTone
  /** Uses dedicated endpoints instead of POST /api/instructor/reports */
  specialEndpoint?: "anti-cheat" | "observability"
}

export const INSTRUCTOR_REPORT_TEMPLATES: ReportTemplateConfig[] = [
  {
    id: "quiz-performance",
    label: "Quiz Performance Analysis",
    description: "Detailed analysis of quiz performance across all students.",
    category: "Assessment",
    icon: "bar-chart-outline",
    tone: "teal",
  },
  {
    id: "student-progress",
    label: "Student Progress Report",
    description: "Track individual student progress and engagement.",
    category: "Student",
    icon: "people-outline",
    tone: "blue",
  },
  {
    id: "session-analytics",
    label: "Session Analytics",
    description: "Session performance and participation metrics.",
    category: "Session",
    icon: "trending-up-outline",
    tone: "violet",
  },
  {
    id: "assessment-summary",
    label: "Assessment Summary",
    description: "Overview of all assessments and their outcomes.",
    category: "Assessment",
    icon: "flag-outline",
    tone: "amber",
  },
  {
    id: "completion-rates",
    label: "Completion Rates",
    description: "Completion rates across different assessments.",
    category: "Analytics",
    icon: "checkmark-circle-outline",
    tone: "teal",
  },
  {
    id: "learning-analytics",
    label: "Learning Analytics Dashboard",
    description: "Daily activity, top performers, and intervention needs.",
    category: "Analytics",
    icon: "sparkles-outline",
    tone: "sky",
  },
  {
    id: "performance-trends",
    label: "Performance Trends",
    description: "Performance trends over the last 12 weeks.",
    category: "Analytics",
    icon: "analytics-outline",
    tone: "violet",
  },
  {
    id: "anti-cheat-reports",
    label: "Anti-Cheat Behavior Analysis",
    description: "Behavior patterns and potential cheating incidents.",
    category: "Security",
    icon: "shield-outline",
    tone: "rose",
    specialEndpoint: "anti-cheat",
  },
  {
    id: "observability",
    label: "System Observability Logs",
    description: "Student behaviors and system events for debugging.",
    category: "System",
    icon: "pulse-outline",
    tone: "slate",
    specialEndpoint: "observability",
  },
]

export type SavedInstructorReport = {
  id: number
  type: string
  title: string
  data: Record<string, unknown>[]
  metadata?: Record<string, unknown>
  filters?: Record<string, unknown>
  generatedAt?: string
  createdAt?: string
}

export type ReportDateRange = {
  startDate?: string
  endDate?: string
}

export type DateRangePreset = "all" | "7d" | "30d" | "90d"

export const REPORT_DATE_PRESETS: Array<{ id: DateRangePreset; label: string }> = [
  { id: "all", label: "All time" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
]

export function dateRangeForPreset(preset: DateRangePreset): ReportDateRange {
  if (preset === "all") return {}
  const end = new Date()
  const start = new Date(end)
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90
  start.setDate(start.getDate() - days)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export function getReportTemplate(id: string): ReportTemplateConfig | undefined {
  return INSTRUCTOR_REPORT_TEMPLATES.find((t) => t.id === id)
}

export function reportTypeLabel(type: string): string {
  const hit = getReportTemplate(type)
  if (hit) return hit.label
  if (type === "individual-student") return "Individual student report"
  return type.replace(/-/g, " ").replace(/_/g, " ")
}

export const REPORT_TEMPLATE_TONES: Record<
  ReportTemplateTone,
  { bg: string; icon: string; border: string; soft: string }
> = {
  teal: { bg: NATIVE.secondaryGrouped, icon: NATIVE.accent, border: NATIVE.separatorOpaque, soft: NATIVE.accentSoft },
  blue: { bg: NATIVE.secondaryGrouped, icon: NATIVE.tint, border: NATIVE.separatorOpaque, soft: NATIVE.fill },
  violet: { bg: NATIVE.secondaryGrouped, icon: "#5856D6", border: NATIVE.separatorOpaque, soft: NATIVE.fill },
  amber: { bg: NATIVE.secondaryGrouped, icon: "#FF9500", border: NATIVE.separatorOpaque, soft: NATIVE.fill },
  rose: { bg: NATIVE.secondaryGrouped, icon: NATIVE.destructive, border: NATIVE.separatorOpaque, soft: "rgba(255,59,48,0.06)" },
  sky: { bg: NATIVE.secondaryGrouped, icon: "#32ADE6", border: NATIVE.separatorOpaque, soft: NATIVE.fill },
  slate: { bg: NATIVE.secondaryGrouped, icon: NATIVE.secondaryLabel, border: NATIVE.separatorOpaque, soft: NATIVE.fill },
}

export function reportTemplateAccent(templateId: string) {
  const tone = getReportTemplate(templateId)?.tone ?? "slate"
  return REPORT_TEMPLATE_TONES[tone]
}

export function normalizeSavedReport(raw: Record<string, unknown>): SavedInstructorReport {
  let data = raw.data
  let metadata = raw.metadata
  if (typeof data === "string") {
    try {
      data = JSON.parse(data)
    } catch {
      data = []
    }
  }
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata)
    } catch {
      metadata = {}
    }
  }
  return {
    id: Number(raw.id),
    type: String(raw.type ?? raw.report_type ?? ""),
    title: String(raw.title ?? "Report"),
    data: Array.isArray(data) ? (data as Record<string, unknown>[]) : [],
    metadata: (metadata as Record<string, unknown>) ?? {},
    filters: (raw.filters as Record<string, unknown>) ?? {},
    generatedAt: (raw.generatedAt ?? raw.generated_at) as string | undefined,
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
  }
}

export function filterReportTemplates(query: string, category?: string): ReportTemplateConfig[] {
  const q = query.trim().toLowerCase()
  return INSTRUCTOR_REPORT_TEMPLATES.filter((t) => {
    if (category && category !== "all" && t.category !== category) return false
    if (!q) return true
    return [t.label, t.description, t.category, t.id].join(" ").toLowerCase().includes(q)
  })
}

export function filterSavedReports(reports: SavedInstructorReport[], query: string): SavedInstructorReport[] {
  const q = query.trim().toLowerCase()
  if (!q) return reports
  return reports.filter((r) =>
    [r.title, r.type, reportTypeLabel(r.type)].filter(Boolean).join(" ").toLowerCase().includes(q),
  )
}

export function reportRecordCount(report: SavedInstructorReport): number {
  return report.data?.length ?? 0
}

export function reportSummaryLine(report: SavedInstructorReport): string {
  const count = reportRecordCount(report)
  const when = report.createdAt ?? report.generatedAt
  const parts = [`${count} record${count === 1 ? "" : "s"}`]
  if (when) parts.push(new Date(when).toLocaleDateString())
  return parts.join(" · ")
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function reportToCsv(report: SavedInstructorReport): string {
  const rows = report.data ?? []
  if (!rows.length) return ""
  const keys = Object.keys(rows[0] ?? {})
  return [keys.join(","), ...rows.map((row) => keys.map((k) => csvEscape(row[k])).join(","))].join("\n")
}

export async function shareReportCsv(report: SavedInstructorReport): Promise<void> {
  const csv = reportToCsv(report)
  if (!csv) throw new Error("This report has no data to export.")

  const filename = `${report.type}-report-${new Date().toISOString().slice(0, 10)}.csv`
  const { cacheDirectory, writeAsStringAsync, EncodingType } = await import("expo-file-system/legacy")
  if (!cacheDirectory) throw new Error("Could not access file cache on this device.")
  const uri = `${cacheDirectory}${filename}`
  await writeAsStringAsync(uri, csv, { encoding: EncodingType.UTF8 })
  await Share.share({
    url: uri,
    title: report.title,
    message: Platform.OS === "android" ? `${report.title}\n\n${csv.slice(0, 2000)}` : undefined,
  })
}

export type StudentReportSearchHit = {
  id: number
  fullName: string
  studentNumber: string | number | null
  email: string
  section: string | null
  sessionCatalogCode: string | null
}

export type StudentIndividualReportPayload = {
  student: {
    id: number
    fullName: string
    studentNumber: string | number | null
    email: string
    section: string | null
    sessionCatalogCode: string | null
  }
  summary: {
    completedAttempts: number
    avgPercentage: number
    flaggedAttempts: number
  }
  gradebook?: Record<string, unknown>
  attempts: Array<{
    attemptId?: number
    quizTitle?: string
    completedAt?: string | null
    percentage?: number
    tabSwitches?: number
    copyPasteAttempts?: number
    [key: string]: unknown
  }>
  generatedAt: string
}
