import type { IoniconName } from "@/components/icons/AppIcon"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumb } from "./solid-list-thumb"

/** Rotating solid Color Hunt thumb — matches lecture slide list cards. */
export function collabListThumb(index: number): SolidListThumb {
  return solidListThumb(index)
}

function normalizeStatus(status?: string): string {
  return (status ?? "").toLowerCase()
}

export function collabGroupStatusAccent(
  status: string | undefined,
  thumb: SolidListThumb,
  isDiscover?: boolean,
): string {
  if (isDiscover) return thumb.label
  const s = normalizeStatus(status)
  if (s === "approved" || s === "active" || s === "completed") return REPORT_SOLID.correct
  if (s === "pending" || s === "draft") return COLOR_HUNT.orange
  if (s === "rejected") return REPORT_SOLID.missed
  return thumb.label
}

export function collabGroupStatusIcon(status: string | undefined, isDiscover?: boolean): IoniconName {
  if (isDiscover) return "enter-outline"
  const s = normalizeStatus(status)
  if (s === "approved" || s === "active" || s === "completed") return "checkmark-circle"
  if (s === "pending" || s === "draft") return "time-outline"
  if (s === "rejected") return "close-circle"
  return "ellipse"
}

export function collabProjectStatusAccent(status: string | undefined, thumb: SolidListThumb): string {
  const s = normalizeStatus(status)
  if (s === "approved") return REPORT_SOLID.correct
  if (s === "pending" || s === "draft") return COLOR_HUNT.orange
  if (s === "rejected") return REPORT_SOLID.missed
  return thumb.label
}

export function collabProjectStatusIcon(status: string | undefined): IoniconName {
  const s = normalizeStatus(status)
  if (s === "approved") return "checkmark-circle"
  if (s === "pending" || s === "draft") return "time-outline"
  if (s === "rejected") return "close-circle"
  return "ellipse"
}

export function collabStatusLabel(status?: string, fallback = "Active"): string {
  const s = normalizeStatus(status)
  if (!s) return fallback
  if (s === "approved") return "Approved"
  if (s === "pending") return "Pending review"
  if (s === "rejected") return "Rejected"
  if (s === "draft") return "Draft"
  if (s === "active") return "Active"
  if (s === "completed") return "Completed"
  return status ?? fallback
}
