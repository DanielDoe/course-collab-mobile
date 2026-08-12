import type { Ionicons } from "@expo/vector-icons"
import { BRAND } from "../../constants"
import type { AppThemeTokens } from "../../constants/app-themes"
import { hexToRgba, resolveThemeTokens } from "../../constants/app-themes"
import { listThumbPalette, type ListThumbPalette, type ListThumbPaletteOptions } from "../theme/list-thumb-palette"
import { DEFAULT_APPEARANCE_PREFS } from "../../lib/appearance-preferences"

export type AssessmentListKind = "quiz" | "homework" | "mid_semester" | "final"

export type AssessmentModuleConfig = {
  kind: AssessmentListKind
  moduleId: string
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  gradient: [string, string]
  accent: string
}

const STATIC_TOKENS = resolveThemeTokens(
  DEFAULT_APPEARANCE_PREFS.themeId,
  DEFAULT_APPEARANCE_PREFS.appearanceMode,
  null,
)

export function getAssessmentConfigs(
  tokens: AppThemeTokens,
): Record<AssessmentListKind, AssessmentModuleConfig> {
  const { accent, accentDark, accentHover } = tokens
  return {
    quiz: {
      kind: "quiz",
      moduleId: "quizzes",
      title: "Quizzes",
      subtitle: "Timed checks · instant feedback",
      icon: "clipboard-outline",
      gradient: [accent, accentDark],
      accent,
    },
    homework: {
      kind: "homework",
      moduleId: "homework",
      title: "Homework",
      subtitle: "Assignments · due dates",
      icon: "book-outline",
      gradient: [accentHover, accent],
      accent,
    },
    mid_semester: {
      kind: "mid_semester",
      moduleId: "mid-semester-exams",
      title: "Mid-Semester",
      subtitle: "Major exams · course milestones",
      icon: "document-text-outline",
      gradient: [accentDark, accent],
      accent,
    },
    final: {
      kind: "final",
      moduleId: "final-exams",
      title: "Final Exams",
      subtitle: "End-of-term assessments",
      icon: "school-outline",
      gradient: [accentDark, accentHover],
      accent,
    },
  }
}

export function getHistoryConfig(tokens: AppThemeTokens) {
  return {
    moduleId: "quiz-history",
    title: "Assessment History",
    subtitle: "Every attempt · scores · timelines",
    icon: "time-outline" as keyof typeof Ionicons.glyphMap,
    gradient: [tokens.accent, tokens.accentDark] as [string, string],
    accent: tokens.accent,
  }
}

export function getGradesConfig(tokens: AppThemeTokens) {
  return {
    moduleId: "grades",
    title: "Grades",
    subtitle: "Course breakdown · components",
    icon: "ribbon-outline" as keyof typeof Ionicons.glyphMap,
    gradient: [tokens.accent, tokens.accentHover] as [string, string],
    accent: tokens.accent,
  }
}

/** @deprecated Use getAssessmentConfigs(useAppThemeTokens()) */
export const ASSESSMENT_CONFIG = getAssessmentConfigs(STATIC_TOKENS)

/** @deprecated Use getHistoryConfig(useAppThemeTokens()) */
export const HISTORY_CONFIG = getHistoryConfig(STATIC_TOKENS)

/** @deprecated Use getGradesConfig(useAppThemeTokens()) */
export const GRADES_CONFIG = getGradesConfig(STATIC_TOKENS)

export function assessmentStatusChipStyle(
  tone: string,
  tokens: AppThemeTokens,
): { bg: string; text: string } {
  switch (tone) {
    case "open":
      return { bg: hexToRgba(tokens.accent, tokens.isDark ? 0.2 : 0.1), text: tokens.accent }
    case "progress":
      return { bg: hexToRgba(tokens.accent, tokens.isDark ? 0.22 : 0.12), text: tokens.accentHover }
    case "done":
      return { bg: hexToRgba(tokens.accent, tokens.isDark ? 0.22 : 0.12), text: tokens.accentHover }
    case "extension":
      return { bg: hexToRgba(tokens.warning, tokens.isDark ? 0.22 : 0.16), text: tokens.warning }
    case "pending":
      return { bg: hexToRgba(tokens.warning, tokens.isDark ? 0.2 : 0.14), text: tokens.warning }
    default:
      return {
        bg: hexToRgba(tokens.textMuted, tokens.isDark ? 0.2 : 0.12),
        text: tokens.textSecondary,
      }
  }
}

/** @deprecated Use assessmentStatusChipStyle(tone, tokens) */
export function legacyAssessmentStatusChipStyle(tone: string): { bg: string; text: string } {
  return assessmentStatusChipStyle(tone, STATIC_TOKENS)
}

export function scoreToneForTokens(
  score: number | null | undefined,
  tokens: AppThemeTokens,
): { bg: string; text: string; label: string } {
  if (score == null || Number.isNaN(score)) {
    return {
      bg: hexToRgba(tokens.textMuted, tokens.isDark ? 0.2 : 0.12),
      text: tokens.textSecondary,
      label: "—",
    }
  }
  if (score >= 90) {
    return {
      bg: hexToRgba(tokens.success, tokens.isDark ? 0.22 : 0.14),
      text: tokens.success,
      label: `${Math.round(score)}%`,
    }
  }
  if (score >= 70) {
    return {
      bg: hexToRgba(tokens.accent, tokens.isDark ? 0.22 : 0.14),
      text: tokens.accent,
      label: `${Math.round(score)}%`,
    }
  }
  return {
    bg: hexToRgba(tokens.danger, tokens.isDark ? 0.22 : 0.12),
    text: tokens.danger,
    label: `${Math.round(score)}%`,
  }
}

/** @deprecated Use scoreToneForTokens(score, tokens) */
export function scoreTone(score?: number | null): { bg: string; text: string; label: string } {
  return scoreToneForTokens(score, STATIC_TOKENS)
}

export function formatAssessmentType(value?: string): string {
  if (!value) return "Assessment"
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function dueMeta(until?: string): { label: string; urgent: boolean; past: boolean } {
  if (!until) return { label: "No due date", urgent: false, past: false }
  const d = new Date(until)
  if (Number.isNaN(d.getTime())) return { label: until, urgent: false, past: false }
  const now = Date.now()
  const diff = d.getTime() - now
  const past = diff < 0
  const urgent = !past && diff < 1000 * 60 * 60 * 48
  const label = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
  return { label: past ? `Ended ${label}` : `Due ${label}`, urgent, past }
}

export function issuesAssessmentType(kind: AssessmentListKind | string): string {
  if (kind === "mid_semester") return "mid_semester"
  if (kind === "final") return "final"
  if (kind === "homework") return "homework"
  return "quiz"
}

export type AssessmentThumbPalette = ListThumbPalette

export function assessmentThumbPalette(accent: string, tokens: AppThemeTokens): AssessmentThumbPalette {
  return {
    color: accent,
    soft: hexToRgba(accent, tokens.isDark ? 0.22 : 0.12),
    border: hexToRgba(accent, tokens.isDark ? 0.35 : 0.2),
  }
}

export function assessmentThumbPaletteByIndex(
  index: number,
  isDark = false,
  options?: ListThumbPaletteOptions,
): AssessmentThumbPalette {
  return listThumbPalette(index, isDark, options)
}

export function configForAssessmentType(
  assessmentType: string | undefined,
  tokens: AppThemeTokens,
): AssessmentModuleConfig {
  const configs = getAssessmentConfigs(tokens)
  const normalized = (assessmentType ?? "").toLowerCase()
  if (normalized.includes("homework")) return configs.homework
  if (normalized.includes("final")) return configs.final
  if (normalized.includes("mid")) return configs.mid_semester
  return configs.quiz
}

/** Legacy BRAND reference for files not yet migrated */
export { BRAND }
