import { SYSTEM } from "../../constants/faculty-native-theme"
import type { LectureItem } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import type { LectureCardKind } from "../../lib/lecture-list-theme"
import { adaptThumbPaletteForAppearance, listThumbPalette, type ListThumbPaletteOptions } from "../theme/list-thumb-palette"

export type { LectureCardKind }

export type LectureCardPalette = {
  color: string
  soft: string
  border: string
}


export function formatCourseLabel(session: StudentSession | null): string {
  if (!session) return "Course lectures"
  const code = session.courseCode?.trim()
  const title = session.courseTitle?.trim()
  if (code && title) return `${code}: ${title}`
  return code || title || session.section || "Course lectures"
}

export function resolveLectureCardKind(lecture: LectureItem): LectureCardKind {
  const status = (lecture.status ?? "").toLowerCase().replace(/_/g, " ")
  const progress = clampProgress(lecture.progress_percentage)

  if (
    status.includes("lock") ||
    status.includes("upcoming") ||
    status.includes("scheduled") ||
    status === "draft" ||
    status === "unpublished"
  ) {
    return "locked"
  }

  if (progress >= 100 || status.includes("complete")) return "completed"
  if (progress > 0 || status.includes("progress")) return "in_progress"
  return "available"
}

export function clampProgress(value?: number): number {
  if (value == null || Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function lectureThumbPalette(
  index: number,
  kind: LectureCardKind,
  isDark = false,
  options?: ListThumbPaletteOptions,
): LectureCardPalette {
  const surface = options?.surfaceColor
  if (kind === "locked") return adaptThumbPaletteForAppearance(SYSTEM.gray, isDark, surface)
  if (kind === "in_progress") return adaptThumbPaletteForAppearance(SYSTEM.orange, isDark, surface)
  return listThumbPalette(index, isDark, options)
}

export function lectureStatusLabel(kind: LectureCardKind): string {
  switch (kind) {
    case "completed":
      return "Completed"
    case "in_progress":
      return "In Progress"
    default:
      return "Not Started"
  }
}

export function lectureStatusColor(kind: LectureCardKind, palette: LectureCardPalette): string {
  switch (kind) {
    case "completed":
      return SYSTEM.green.color
    case "in_progress":
      return SYSTEM.orange.color
    case "locked":
      return SYSTEM.gray.color
    default:
      return palette.color
  }
}

export type LectureFilter = "all" | LectureCardKind

export function matchesLectureFilter(lecture: LectureItem, filter: LectureFilter): boolean {
  if (filter === "all") return true
  return resolveLectureCardKind(lecture) === filter
}
