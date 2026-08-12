import { COLOR_HUNT_COOL } from "../../lib/codebench-badge-theme"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import { solidListThumb, solidListThumbFixed } from "../../lib/solid-list-thumb"

export type NoteCardKind = "personal" | "shared" | "course"

export function noteSolidThumb(index: number, kind: NoteCardKind): SolidListThumb {
  if (kind === "shared") return solidListThumbFixed(COLOR_HUNT_COOL.indigo)
  if (kind === "course") return solidListThumbFixed(COLOR_HUNT_COOL.cyan)
  return solidListThumb(index)
}

export function noteThumbIcon(kind: NoteCardKind): "document-text-outline" | "people-outline" | "book-outline" {
  if (kind === "shared") return "people-outline"
  if (kind === "course") return "book-outline"
  return "document-text-outline"
}

export function noteStatusLabel(kind: NoteCardKind): string {
  switch (kind) {
    case "shared":
      return "Shared"
    case "course":
      return "Course note"
    default:
      return "Personal"
  }
}

export function noteStatusColor(kind: NoteCardKind, thumb: SolidListThumb): string {
  return thumb.label
}

export function formatNoteWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
