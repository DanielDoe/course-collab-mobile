import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { SOLID_THUMB_LOCKED, solidListThumb } from "./solid-list-thumb"

export type LectureCardKind = "completed" | "in_progress" | "available" | "locked"

export type LectureSolidThumb = SolidListThumb

export function lectureSolidThumb(index: number, kind: LectureCardKind): LectureSolidThumb {
  if (kind === "locked") return SOLID_THUMB_LOCKED
  return solidListThumb(index)
}

export function lectureStatusAccent(kind: LectureCardKind, thumb: LectureSolidThumb): string {
  switch (kind) {
    case "completed":
      return "#34C759"
    case "in_progress":
      return COLOR_HUNT.orange
    case "locked":
      return thumb.label
    default:
      return thumb.label
  }
}
