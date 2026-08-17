/**
 * Student dashboard chart palette — follows the active appearance theme.
 *
 * Overall / You  → theme accent (chartPalette[0])
 * Homework       → first distinct companion (often gold / warning)
 * Quiz           → first remaining distinct slot (often success / cool)
 * Class average  → vivid steel, lightly tinted by the accent so it stays
 *                  a "neutral" reference without going muddy grey
 *
 * Dark themes lift the same hues toward white so bars and lines stay bright
 * on Graphite-class surfaces. Do not hardcode a third Color Hunt set here —
 * switching Ocean / PVAMU Gold / Crimson must change the chart.
 */

import {
  blendHexTowardWhite,
  hexToRgba,
  type AppThemeTokens,
} from "../constants/app-themes"

export type ChartSeriesId = "overall" | "homework" | "quiz"

export type ChartSeriesPalette = Record<ChartSeriesId, string>

export type DashboardChartPalette = {
  series: ChartSeriesPalette
  seriesTop: ChartSeriesPalette
  comparisonTop: { you: string; classAvg: string }
  comparison: { you: string; classAvg: string }
  grid: string
  gridFaint: string
  axis: string
  target: string
  targetLabel: string
  targetZone: string
  barTrack: string
  barHighlight: string
}

type Rgb = { r: number; g: number; b: number }

function parseHex(hex: string): Rgb | null {
  const raw = hex.trim()
  if (!raw.startsWith("#")) return null
  const normalized = raw.slice(1)
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized.slice(0, 6)
  if (full.length < 6) return null
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function rgbDist(a: string, b: string): number {
  const left = parseHex(a)
  const right = parseHex(b)
  if (!left || !right) return 999
  const dr = left.r - right.r
  const dg = left.g - right.g
  const db = left.b - right.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function luminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0.5
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
}

function mixHex(a: string, b: string, bWeight: number): string {
  const left = parseHex(a)
  const right = parseHex(b)
  if (!left || !right) return a
  const w = Math.max(0, Math.min(1, bWeight))
  const mix = (x: number, y: number) => Math.round(x * (1 - w) + y * w)
  const toHex = (n: number) => n.toString(16).padStart(2, "0")
  return `#${toHex(mix(left.r, right.r))}${toHex(mix(left.g, right.g))}${toHex(mix(left.b, right.b))}`
}

/** Lift dark / inky swatches so chart marks read as vivid, not recessed. */
function vivid(hex: string, isDark: boolean): string {
  const lum = luminance(hex)
  if (isDark) return blendHexTowardWhite(hex, lum < 0.42 ? 0.3 : 0.14)
  return lum < 0.2 ? blendHexTowardWhite(hex, 0.18) : hex
}

function vividTop(hex: string, isDark: boolean): string {
  return blendHexTowardWhite(hex, isDark ? 0.4 : 0.26)
}

const DISTINCT = 72

function pickDistinct(candidates: string[], used: string[]): string {
  const hit = candidates.find((c) => used.every((u) => rgbDist(c, u) >= DISTINCT))
  return hit ?? candidates[0] ?? used[0] ?? "#6366F1"
}

export function dashboardChartPalette(tokens: AppThemeTokens): DashboardChartPalette {
  const { isDark, accent, warning, success, chartPalette } = tokens
  const slots = [
    chartPalette[0] ?? accent,
    chartPalette[1] ?? warning,
    chartPalette[2] ?? success,
    chartPalette[3] ?? warning,
    chartPalette[4] ?? accent,
  ]

  const overallRaw = slots[0]
  // Keep warning/gold off the series — that hue is reserved for the 80% target
  // so a flat homework line never fuses with the goal into one glowing bar.
  const homeworkRaw = pickDistinct([slots[1], slots[2], slots[4], success], [overallRaw, warning])
  const quizRaw = pickDistinct([slots[2], success, slots[1], slots[4]], [overallRaw, homeworkRaw, warning])

  const series: ChartSeriesPalette = {
    overall: vivid(overallRaw, isDark),
    homework: vivid(homeworkRaw, isDark),
    quiz: vivid(quizRaw, isDark),
  }
  const seriesTop: ChartSeriesPalette = {
    overall: vividTop(series.overall, isDark),
    homework: vividTop(series.homework, isDark),
    quiz: vividTop(series.quiz, isDark),
  }

  const steel = isDark ? "#C5D3E6" : "#6F87A6"
  const classAvg = mixHex(steel, series.overall, 0.2)
  const classAvgTop = blendHexTowardWhite(classAvg, isDark ? 0.28 : 0.18)

  return {
    series,
    seriesTop,
    comparison: { you: series.overall, classAvg },
    comparisonTop: { you: seriesTop.overall, classAvg: classAvgTop },
    grid: isDark ? "rgba(235,235,245,0.10)" : "rgba(60,60,67,0.10)",
    gridFaint: isDark ? "rgba(235,235,245,0.05)" : "rgba(60,60,67,0.055)",
    axis: isDark ? "rgba(235,235,245,0.20)" : "rgba(60,60,67,0.18)",
    target: isDark ? hexToRgba(warning, 0.8) : warning,
    targetLabel: isDark ? blendHexTowardWhite(warning, 0.2) : warning,
    targetZone: hexToRgba(warning, isDark ? 0.1 : 0.07),
    barTrack: hexToRgba(series.overall, isDark ? 0.22 : 0.12),
    barHighlight: isDark ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.55)",
  }
}

export const CHART_SERIES_LABEL: Record<ChartSeriesId, string> = {
  overall: "Overall",
  homework: "Homework",
  quiz: "Quiz",
}
