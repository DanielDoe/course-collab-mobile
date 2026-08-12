import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import type { CourseDigitalNote } from "./digital-notes-api"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed } from "./solid-list-thumb"

/** Faculty course notes — Color Hunt accents; list cards match student NoteListCard chrome. */
export const FACULTY_COURSE_NOTES_COLOR = {
  published: REPORT_SOLID.correct,
  publishedInk: REPORT_SOLID.correctInk,
  draft: COLOR_HUNT.orange,
  deleted: REPORT_SOLID.missed,
} as const

/** Same cyan course thumb as student Notes → Course Notes tab. */
export function facultyCourseNoteListThumb(index: number): SolidListThumb {
  return solidListThumbFixed(COLOR_HUNT_COOL.cyan)
}

export function facultyCourseNoteStatus(note: CourseDigitalNote): {
  label: string
  color: string
  icon: "checkmark-circle" | "ellipse"
} {
  if (note.isPublished) {
    return {
      label: "Published",
      color: FACULTY_COURSE_NOTES_COLOR.published,
      icon: "checkmark-circle",
    }
  }
  return {
    label: "Draft",
    color: FACULTY_COURSE_NOTES_COLOR.draft,
    icon: "ellipse",
  }
}

export function facultyCourseNoteMetaLine(note: CourseDigitalNote): string {
  const parts = [note.topic?.trim(), note.session?.trim()].filter(Boolean)
  return parts.length ? parts.join(" · ") : "General"
}
