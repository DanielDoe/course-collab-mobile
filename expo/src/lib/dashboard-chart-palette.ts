/**
 * Student dashboard chart palette — faculty-quality Color Hunt series with a
 * theme accent tie-in for the primary "You / Overall" metric.
 *
 * Overall / You  → theme accent when vivid, else faculty cyan
 * Homework       → warm amber (distinct from 80% target gold band)
 * Quiz           → cool indigo
 * Class average  → muted steel, lightly tinted by accent
 */

import {
  blendHexTowardWhite,
  hexToRgba,
  type AppThemeTokens,
} from "../constants/app-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { FACULTY_CHART_COLORS } from "./faculty-dashboard-theme"

export type ChartSeriesId = "overall" | "homework" | "quiz"

export type ChartSeriesPalette = Record<ChartSeriesId, string>

export type DashboardChartPalette = {
  series: ChartSeriesPalette
  seriesTop: ChartSeriesPalette
  seriesDark: ChartSeriesPalette
  comparisonTop: { you: string; classAvg: string }
  comparison: { you: string; classAvg: string }
  /** Per comparison group — Quiz, Homework, Attendance (solid bar fills) */
  comparisonGroups: [string, string, string]
  comparisonGroupsStroke: [string, string, string]
  grid: string
  gridFaint: string
  axis: string
  target: string
  targetLabel: string
  targetZone: string
  barTrack: string
  comparisonClassFill: string
  comparisonClassStroke: string
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

function vivid(hex: string, isDark: boolean): string {
  const lum = luminance(hex)
  if (isDark) return blendHexTowardWhite(hex, lum < 0.42 ? 0.28 : 0.12)
  return lum < 0.22 ? blendHexTowardWhite(hex, 0.16) : hex
}

function vividTop(hex: string, isDark: boolean): string {
  return blendHexTowardWhite(hex, isDark ? 0.38 : 0.22)
}

function vividDark(hex: string, isDark: boolean): string {
  return isDark ? blendHexTowardWhite(hex, 0.08) : mixHex(hex, "#1e293b", 0.22)
}

export function dashboardChartPalette(tokens: AppThemeTokens): DashboardChartPalette {
  const { isDark, accent, warning, chartPalette } = tokens
  const accentPrimary = chartPalette[0] ?? accent ?? FACULTY_CHART_COLORS.primary

  const overallRaw = mixHex(accentPrimary, FACULTY_CHART_COLORS.primary, 0.35)
  const homeworkRaw = COLOR_HUNT.amber
  const quizRaw = COLOR_HUNT_COOL.indigo

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
  const seriesDark: ChartSeriesPalette = {
    overall: vividDark(series.overall, isDark),
    homework: vividDark(series.homework, isDark),
    quiz: vividDark(series.quiz, isDark),
  }

  const steel = isDark ? "#94A3B8" : "#64748B"
  const classAvg = mixHex(steel, series.overall, 0.15)
  const classAvgTop = blendHexTowardWhite(classAvg, isDark ? 0.22 : 0.14)

  const comparisonGroups: [string, string, string] = [
    isDark ? blendHexTowardWhite(COLOR_HUNT_COOL.cyan, 0.06) : COLOR_HUNT_COOL.cyan,
    isDark ? blendHexTowardWhite(COLOR_HUNT.amber, 0.06) : COLOR_HUNT.amber,
    isDark ? blendHexTowardWhite(COLOR_HUNT_COOL.indigo, 0.06) : COLOR_HUNT_COOL.indigo,
  ]
  const comparisonGroupsStroke: [string, string, string] = [
    mixHex(COLOR_HUNT_COOL.cyan, "#0F172A", isDark ? 0.18 : 0.32),
    mixHex(COLOR_HUNT.amber, "#451A03", isDark ? 0.18 : 0.34),
    mixHex(COLOR_HUNT_COOL.indigo, "#0F172A", isDark ? 0.18 : 0.32),
  ]
  const comparisonClassFill = isDark ? "#64748B" : "#94A3B8"
  const comparisonClassStroke = isDark ? "#CBD5E1" : "#475569"

  return {
    series,
    seriesTop,
    seriesDark,
    comparison: { you: series.overall, classAvg },
    comparisonTop: { you: seriesTop.overall, classAvg: classAvgTop },
    comparisonGroups,
    comparisonGroupsStroke,
    comparisonClassFill,
    comparisonClassStroke,
    grid: FACULTY_CHART_COLORS.grid,
    gridFaint: isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.14)",
    axis: isDark ? "rgba(148,163,184,0.35)" : "rgba(100,116,139,0.35)",
    target: isDark ? hexToRgba(warning, 0.75) : hexToRgba(COLOR_HUNT.amber, 0.65),
    targetLabel: isDark ? blendHexTowardWhite(COLOR_HUNT.amber, 0.15) : "#B45309",
    targetZone: hexToRgba(COLOR_HUNT.amber, isDark ? 0.08 : 0.06),
    barTrack: isDark ? "rgba(148,163,184,0.10)" : "rgba(148,163,184,0.08)",
  }
}

export const CHART_SERIES_LABEL: Record<ChartSeriesId, string> = {
  overall: "Overall",
  homework: "Homework",
  quiz: "Quiz",
}
