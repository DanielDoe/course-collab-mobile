import { REPORT_SOLID } from "./assessment-report-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { IoniconName } from "@/components/icons/AppIcon"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

/** Progress Reviews — Color Hunt review cards + AI generate banner. */
export const FACULTY_PROGRESS_REVIEWS_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  tabActive: COLOR_HUNT_COOL.indigo,
  ai: COLOR_HUNT_COOL.indigo,
  generateBanner: COLOR_HUNT_COOL.indigo,
  saved: COLOR_HUNT_COOL.cyan,
  missing: COLOR_HUNT.orange,
  stale: COLOR_HUNT.pinkDeep,
} as const

export function facultyProgressReviewThumb(
  status: "saved" | "missing" | "stale" | string,
  id?: number | string,
): SolidListThumb {
  if (status === "saved") return solidListThumbFixed(COLOR_HUNT_COOL.cyan)
  if (status === "missing") return solidListThumbFixed(COLOR_HUNT.orange)
  if (status === "stale") return solidListThumbFixed(COLOR_HUNT.pinkDeep)
  return solidListThumbFromHash(id ?? status)
}

export type FacultyProgressReviewStatusMeta = {
  label: string
  color: string
  icon: IoniconName
}

export function facultyProgressReviewStatusMeta(sent: boolean): FacultyProgressReviewStatusMeta {
  return sent
    ? { label: "Emailed", color: REPORT_SOLID.correct, icon: "mail-outline" }
    : { label: "Draft", color: FACULTY_PROGRESS_REVIEWS_COLOR.missing, icon: "document-outline" }
}

export function facultyProgressReviewKpiAccent(index: number): SolidListThumb {
  const cycle = [
    solidListThumbFixed(COLOR_HUNT_COOL.indigo),
    solidListThumbFixed(COLOR_HUNT_COOL.cyan),
    solidListThumbFixed(COLOR_HUNT.orange),
    solidListThumbFixed(COLOR_HUNT.pink),
  ] as const
  return cycle[index % cycle.length]!
}
