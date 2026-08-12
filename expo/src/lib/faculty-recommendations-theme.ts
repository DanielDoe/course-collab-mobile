import type { IoniconName } from "@/components/icons/AppIcon"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"
import { REPORT_SOLID } from "./assessment-report-theme"
import { recommendationStatusLabel } from "./faculty-recommendations-utils"

export const FACULTY_RECOMMENDATIONS_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  letter: COLOR_HUNT.pink,
  guest: COLOR_HUNT_COOL.indigo,
  form: COLOR_HUNT_COOL.cyan,
  journey: COLOR_HUNT_COOL.cyan,
  pdf: COLOR_HUNT_COOL.gold,
  pipeline: COLOR_HUNT_COOL.indigo,
  delivered: COLOR_HUNT_COOL.cyan,
  ready: COLOR_HUNT_COOL.gold,
  review: COLOR_HUNT.pinkDeep,
  draft: COLOR_HUNT.pink,
} as const

export type FacultyRecommendationsStatusMeta = {
  label: string
  color: string
  icon: IoniconName
}

function normalizeRecommendationStatus(status: string): string {
  return String(status ?? "").trim().toLowerCase()
}

export function facultyRecommendationDisplayStatus(status: string): string {
  const s = normalizeRecommendationStatus(status)
  if (s === "downloaded") return "Delivered"
  if (s === "finalized") return "Ready"
  if (s === "instructor_review_pending") return "In review"
  if (s === "student_selected") return "Submitted"
  if (s === "ai_generated") return "Drafts ready"
  if (s === "student_form_pending") return "Questionnaire"
  if (s === "info_requested") return "Info requested"
  if (s === "revision_requested") return "Revision needed"
  return recommendationStatusLabel(status)
}

/** Status-aware thumb — avoids one pink tile + green text for every row. */
export function facultyRecommendationLetterThumb(status: string, seed: string | number): SolidListThumb {
  const s = normalizeRecommendationStatus(status)
  if (s === "requested") return solidListThumbFixed(COLOR_HUNT.orange)
  if (s === "info_requested" || s === "revision_requested") return solidListThumbFixed(COLOR_HUNT.amber)
  if (s === "rejected") return solidListThumbFixed(REPORT_SOLID.missed)
  if (s === "finalized") return solidListThumbFixed(FACULTY_RECOMMENDATIONS_COLOR.ready)
  if (s === "downloaded") return solidListThumbFixed(FACULTY_RECOMMENDATIONS_COLOR.delivered)
  if (["student_selected", "instructor_review_pending"].includes(s)) {
    return solidListThumbFixed(FACULTY_RECOMMENDATIONS_COLOR.review)
  }
  if (["ai_generated", "approved"].includes(s)) return solidListThumbFixed(FACULTY_RECOMMENDATIONS_COLOR.draft)
  if (s === "student_form_pending") return solidListThumbFixed(FACULTY_RECOMMENDATIONS_COLOR.pipeline)
  return solidListThumbFromHash(seed)
}

export function facultyRecommendationGuestThumb(seed: string | number): SolidListThumb {
  return solidListThumbFromHash(`guest-rec-${seed}`)
}

export function facultyRecommendationStatusMeta(status: string, label?: string): FacultyRecommendationsStatusMeta {
  const s = normalizeRecommendationStatus(status)
  const display = label ?? facultyRecommendationDisplayStatus(status)

  if (s === "downloaded") {
    return { label: display, color: FACULTY_RECOMMENDATIONS_COLOR.delivered, icon: "checkmark-done-outline" }
  }
  if (s === "finalized") {
    return { label: display, color: FACULTY_RECOMMENDATIONS_COLOR.ready, icon: "document-attach-outline" }
  }
  if (s === "rejected") {
    return { label: display, color: REPORT_SOLID.missed, icon: "close-circle-outline" }
  }
  if (s === "requested") {
    return { label: display, color: COLOR_HUNT.orange, icon: "time-outline" }
  }
  if (s === "info_requested" || s === "revision_requested") {
    return { label: display, color: COLOR_HUNT.amber, icon: "alert-circle-outline" }
  }
  if (["student_selected", "instructor_review_pending"].includes(s)) {
    return { label: display, color: FACULTY_RECOMMENDATIONS_COLOR.review, icon: "create-outline" }
  }
  if (["ai_generated", "approved"].includes(s)) {
    return { label: display, color: FACULTY_RECOMMENDATIONS_COLOR.draft, icon: "sparkles-outline" }
  }
  if (s === "student_form_pending") {
    return { label: display, color: FACULTY_RECOMMENDATIONS_COLOR.pipeline, icon: "list-outline" }
  }
  return { label: display, color: FACULTY_RECOMMENDATIONS_COLOR.form, icon: "ellipse" }
}

export function facultyRecommendationJourneyColor(status: string): string {
  const s = normalizeRecommendationStatus(status)
  if (s === "downloaded") return FACULTY_RECOMMENDATIONS_COLOR.delivered
  if (s === "finalized") return FACULTY_RECOMMENDATIONS_COLOR.ready
  if (s === "rejected") return REPORT_SOLID.missed
  if (s === "requested") return COLOR_HUNT.orange
  if (s === "info_requested" || s === "revision_requested") return COLOR_HUNT.amber
  if (["student_selected", "instructor_review_pending"].includes(s)) return FACULTY_RECOMMENDATIONS_COLOR.review
  if (["ai_generated", "approved"].includes(s)) return FACULTY_RECOMMENDATIONS_COLOR.draft
  if (s === "student_form_pending") return FACULTY_RECOMMENDATIONS_COLOR.pipeline
  return FACULTY_RECOMMENDATIONS_COLOR.journey
}

export function facultyGuestRequestStatusColor(status: string): string {
  const s = normalizeRecommendationStatus(status)
  if (s === "pending") return COLOR_HUNT.amber
  if (s === "approved") return FACULTY_RECOMMENDATIONS_COLOR.delivered
  if (s === "rejected") return REPORT_SOLID.missed
  return FACULTY_RECOMMENDATIONS_COLOR.guest
}
