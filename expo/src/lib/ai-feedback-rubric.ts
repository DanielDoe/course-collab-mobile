import type { AiFeedback } from "./assessment-results-api"
import { formatCriteriaKey } from "./ai-feedback-display"

export type RubricRow = {
  id: string
  label: string
  earned: number
  max: number
  pct: number
}

type LooseRecord = Record<string, unknown>

function asNumber(value: unknown): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseRubricArray(raw: unknown): RubricRow[] {
  if (!Array.isArray(raw)) return []
  const rows: RubricRow[] = []

  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const row = item as LooseRecord
    const label = String(row.name ?? row.label ?? row.title ?? row.criterion ?? "").trim()
    const earned =
      asNumber(row.earned) ??
      asNumber(row.points) ??
      asNumber(row.score) ??
      asNumber(row.value)
    const max =
      asNumber(row.max) ??
      asNumber(row.maxPoints) ??
      asNumber(row.total) ??
      asNumber(row.outOf)
    if (!label || earned == null) continue
    const maxPts = max != null && max > 0 ? max : earned
    rows.push({
      id: label,
      label,
      earned,
      max: maxPts,
      pct: maxPts > 0 ? Math.min(100, (earned / maxPts) * 100) : 0,
    })
  }

  return rows
}

function parseCriteriaObject(
  criteria: NonNullable<AiFeedback["criteria"]>,
  questionMaxPoints?: number,
  pointsEarned?: number,
): RubricRow[] {
  const entries = Object.entries(criteria).filter(([, value]) => value != null) as [string, number][]
  if (entries.length === 0) return []

  const values = entries.map(([, value]) => Number(value))
  const sum = values.reduce((total, value) => total + value, 0)
  const allPercentLike = values.every((value) => value >= 0 && value <= 100)

  const sumMatchesQuestion =
    questionMaxPoints != null &&
    questionMaxPoints > 0 &&
    Math.abs(sum - questionMaxPoints) <= Math.max(0.5, questionMaxPoints * 0.05)

  const sumMatchesEarned =
    pointsEarned != null &&
    pointsEarned >= 0 &&
    Math.abs(sum - pointsEarned) <= Math.max(0.5, Math.max(pointsEarned, 1) * 0.05)

  const valuesArePoints = !allPercentLike || sumMatchesQuestion || sumMatchesEarned

  if (valuesArePoints) {
    return entries.map(([key, value]) => {
      const earned = Number(value)
      const max =
        earned <= 10 && Number.isInteger(earned)
          ? 10
          : questionMaxPoints != null && entries.length > 0
            ? questionMaxPoints / entries.length
            : Math.max(earned, 1)
      return {
        id: key,
        label: formatCriteriaKey(key),
        earned,
        max,
        pct: max > 0 ? Math.min(100, (earned / max) * 100) : 0,
      }
    })
  }

  const weightPerCriterion =
    questionMaxPoints != null && questionMaxPoints > 0
      ? questionMaxPoints / entries.length
      : 100 / entries.length

  return entries.map(([key, value]) => {
    const pct = Number(value)
    const earned = (pct / 100) * weightPerCriterion
    return {
      id: key,
      label: formatCriteriaKey(key),
      earned,
      max: weightPerCriterion,
      pct,
    }
  })
}

/** Normalize rubric rows from API feedback (array rubric or criteria object). */
export function buildAiFeedbackRubric(
  feedback: AiFeedback,
  questionMaxPoints?: number,
  pointsEarned?: number,
): RubricRow[] {
  const ext = feedback as AiFeedback & {
    rubric?: unknown
    scoringRubric?: unknown
    gradeBreakdown?: AiFeedback["gradeBreakdown"] & { rubric?: unknown; criteria?: unknown }
  }

  const fromArray = [
    parseRubricArray(ext.rubric),
    parseRubricArray(ext.scoringRubric),
    parseRubricArray(ext.gradeBreakdown?.rubric),
  ].find((rows) => rows.length > 0)

  if (fromArray && fromArray.length > 0) return fromArray

  if (feedback.criteria) {
    return parseCriteriaObject(feedback.criteria, questionMaxPoints, pointsEarned)
  }

  const breakdownCriteria = ext.gradeBreakdown?.criteria
  if (breakdownCriteria && typeof breakdownCriteria === "object") {
    return parseCriteriaObject(
      breakdownCriteria as NonNullable<AiFeedback["criteria"]>,
      questionMaxPoints,
      pointsEarned,
    )
  }

  return []
}

export function formatRubricPoints(earned: number, max: number): string {
  const e = earned % 1 === 0 ? String(Math.round(earned)) : earned.toFixed(1)
  const m = max % 1 === 0 ? String(Math.round(max)) : max.toFixed(1)
  return `${e} / ${m} pts`
}

export function scoreToneColor(
  pct: number,
  tokens: { success: string; warning: string; danger: string },
): string {
  if (pct >= 85) return tokens.success
  if (pct >= 60) return tokens.warning
  return tokens.danger
}
