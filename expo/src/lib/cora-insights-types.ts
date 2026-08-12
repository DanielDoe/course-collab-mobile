export type CoraConceptMastery = {
  topic: string
  mastery: number
  questionsAsked?: number
  accuracy?: number
  lastPracticed?: string
}

export type CoraMisconception = {
  name: string
  topic: string
  occurrences: number
  severity: "minor" | "moderate" | "severe" | string
}

export type CoraBehaviorInsights = {
  avgQuestionDepth?: number
  curiosityIndex?: number
  struggleDetection?: number
  independenceScore?: number
}

export type CoraInteractionTrends = {
  conceptQuestions?: number
  debugQuestions?: number
  totalInteractions?: number
  weeklyPattern?: Record<number, number>
}

export type CoraConversationTimelineItem = {
  id: number
  date: string
  topic: string
  messagePreview: string
  responseTime?: number
  satisfaction?: number
}

export type CoraProgressDetailed = {
  conceptMastery: CoraConceptMastery[]
  reasoningScore: number
  reasoningHistory: { week: string; score: number }[]
  misconceptions: CoraMisconception[]
  behaviorInsights: CoraBehaviorInsights
  interactionTrends: CoraInteractionTrends
  conversationTimeline: CoraConversationTimelineItem[]
  conceptHeatmap: Record<string, number>
}

export function normalizeMasteryPercent(value: number | undefined | null): number {
  const n = Number(value) || 0
  if (n <= 1) return Math.round(n * 100)
  return Math.round(Math.min(100, n))
}

export function masteryStatusLabel(pct: number): "Mastered" | "Learning" | "Review" {
  if (pct >= 80) return "Mastered"
  if (pct >= 55) return "Learning"
  return "Review"
}

export function masteryColor(pct: number): string {
  if (pct >= 80) return "#10b981"
  if (pct >= 55) return "#8b5cf6"
  return "#f59e0b"
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function weeklyPatternToChartData(pattern: Record<number, number> | undefined) {
  return DAY_LABELS.map((label, index) => ({
    label,
    value: pattern?.[index] ?? 0,
  }))
}
