import { hexToRgba, type AppThemeTokens } from "../constants/app-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed } from "./solid-list-thumb"

/**
 * Faculty Summer Camp — Color Hunt accents.
 * Card containers stay neutral; color applies to solid thumb tiles, CTAs, links, and status text.
 *
 * Signature list card (Programs / Tracks / Campers / Requests):
 * - `native.secondaryGrouped` body, hairline border, radius 16, compact solid thumb (30×8)
 * - Title + optional eyebrow/description; status as icon + colored label (never color alone)
 * - Orange primary CTAs · cyan secondary links · chevron tertiary
 */
export const FACULTY_SUMMER_CAMP_COLOR = {
  action: GRADES_WARM.orange,
  actionInk: "#FFFFFF",
  link: COLOR_HUNT_COOL.cyan,
  tabActive: COLOR_HUNT.orange,
  published: REPORT_SOLID.correct,
  publishedInk: REPORT_SOLID.correctInk,
  draft: COLOR_HUNT.orange,
  pending: COLOR_HUNT.amber,
  programThumb: COLOR_HUNT.orange,
  trackThumb: COLOR_HUNT_COOL.indigo,
  requestThumb: COLOR_HUNT_COOL.cyan,
} as const

/** Rich camper avatar cycle — warm + cool Color Hunt swatches (12 distinct fills). */
const SUMMER_CAMP_CAMPER_THUMB_CYCLE: SolidListThumb[] = [
  solidListThumbFixed(COLOR_HUNT.orange),
  solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  solidListThumbFixed(COLOR_HUNT.pink),
  solidListThumbFixed("#FF9A00"),
  solidListThumbFixed("#44A1A4"),
  solidListThumbFixed("#24B1B1"),
  solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  solidListThumbFixed("#525EA7"),
  solidListThumbFixed("#E37434"),
  solidListThumbFixed(COLOR_HUNT.amber, COLOR_HUNT.ink),
  solidListThumbFixed("#97DDE9", "#1E3A5F"),
]

function summerCampThumbFromKey(key: string, cycle: SolidListThumb[]): SolidListThumb {
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return cycle[hash % cycle.length]!
}

export function facultySummerCampProgramThumb(): SolidListThumb {
  return solidListThumbFixed(FACULTY_SUMMER_CAMP_COLOR.programThumb)
}

export function facultySummerCampTrackThumb(trainingId: number | string): SolidListThumb {
  return summerCampThumbFromKey(String(trainingId), SUMMER_CAMP_CAMPER_THUMB_CYCLE)
}

export function facultySummerCampCamperThumb(input: {
  id: number | string
  student_id?: string | null
  full_name?: string | null
}): SolidListThumb {
  const seed = `${input.student_id ?? input.id}:${input.full_name ?? ""}`
  return summerCampThumbFromKey(seed, SUMMER_CAMP_CAMPER_THUMB_CYCLE)
}

export function facultySummerCampCamperEnrollmentStatus(enrollments: number): {
  label: string
  color: string
  icon: "checkmark-circle" | "time-outline"
} {
  if (enrollments > 0) {
    return {
      label: `${enrollments} enrollment${enrollments === 1 ? "" : "s"}`,
      color: FACULTY_SUMMER_CAMP_COLOR.link,
      icon: "checkmark-circle",
    }
  }
  return {
    label: "0 enrollments",
    color: FACULTY_SUMMER_CAMP_COLOR.pending,
    icon: "time-outline",
  }
}

export function facultySummerCampActionSoft(tokens: AppThemeTokens): string {
  return hexToRgba(FACULTY_SUMMER_CAMP_COLOR.action, tokens.isDark ? 0.22 : 0.12)
}

export function facultySummerCampRequestThumb(requestId: number | string): SolidListThumb {
  return solidListThumbFixed(FACULTY_SUMMER_CAMP_COLOR.requestThumb)
}

export function facultySummerCampStatus(status: string): {
  label: string
  color: string
  icon: "checkmark-circle" | "ellipse" | "time-outline"
} {
  const normalized = status.toLowerCase()
  if (normalized === "published" || normalized === "active" || normalized === "approved") {
    return { label: statusLabel(status), color: FACULTY_SUMMER_CAMP_COLOR.published, icon: "checkmark-circle" }
  }
  if (normalized === "draft") {
    return { label: "Draft", color: FACULTY_SUMMER_CAMP_COLOR.draft, icon: "ellipse" }
  }
  if (normalized === "pending" || normalized === "requested") {
    return { label: statusLabel(status), color: FACULTY_SUMMER_CAMP_COLOR.pending, icon: "time-outline" }
  }
  return { label: statusLabel(status), color: FACULTY_SUMMER_CAMP_COLOR.draft, icon: "ellipse" }
}

export function facultySummerCampDraftWash(tokens: AppThemeTokens): string {
  return hexToRgba(FACULTY_SUMMER_CAMP_COLOR.draft, tokens.isDark ? 0.16 : 0.1)
}

export function statusLabel(status: string): string {
  if (status === "published") return "Published"
  if (status === "draft") return "Draft"
  return status.replace(/_/g, " ")
}
