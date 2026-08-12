import type { QuizItem } from "../../lib/student-api"
import { dueMeta } from "./assessment-config"

export type AssessmentDetailActions = {
  showStart: boolean
  showContinue: boolean
  showRetake: boolean
  showReport: boolean
  showExtend: boolean
  showClosed: boolean
  showLocked: boolean
  startLabel?: string
  extendLabel?: string
  lockedLabel?: string
  retakeNote?: string | null
  statusLabel: string
  statusTone: "open" | "progress" | "done" | "closed" | "pending" | "extension"
  displayPercent: number | null
  isClosed: boolean
  isBeforeOpen: boolean
}

function isPastCalendarDeadline(item: QuizItem): boolean {
  if (!item.available_until) return false
  return new Date(item.available_until).getTime() < Date.now()
}

function isAssessmentClosedForDisplay(item: QuizItem): boolean {
  if (item.semester_assessments_closed === true) return true
  return isPastCalendarDeadline(item)
}

function isBeforeOpenWindow(item: QuizItem): boolean {
  if (!item.available_from) return false
  return new Date(item.available_from).getTime() > Date.now()
}

function canShowStartAssessment(item: QuizItem): boolean {
  if (!item.can_take || !(item.is_active || item.rollover_active)) return false
  if (item.rollover_active) return true
  if (!isPastCalendarDeadline(item)) return true
  return item.calendar_open === true
}

function displayPercent(item: QuizItem): number | null {
  if (item.display_percentage != null && Number.isFinite(item.display_percentage)) {
    return Math.round(item.display_percentage * 10) / 10
  }
  if (item.best_score != null && Number.isFinite(item.best_score)) {
    return Math.round(item.best_score)
  }
  if (item.score != null && item.total_questions != null && item.total_questions > 0) {
    if (item.total_questions === 100) return Math.round(item.score)
    return Math.round((item.score / item.total_questions) * 100)
  }
  return null
}

function isSavedForLater(item: QuizItem): boolean {
  return !!(item.saved_for_later && (item.is_active || item.rollover_active))
}

export function isInProgressAttempt(item: QuizItem): boolean {
  if (isSavedForLater(item)) return true
  if (item.in_progress_attempt_id != null && item.in_progress_attempt_id > 0) return true
  if (item.attempted && !item.completed) return true
  const status = (item.status ?? "").toLowerCase()
  if (status.includes("progress") || status === "saved_for_later") return true
  // Resume when started but not finalized (matches web Continue CTA)
  const hasReport = !!(item.attempted && item.attempt_id && item.completed)
  if (item.attempted && !hasReport && (item.can_take || item.saved_for_later)) return true
  return false
}

export function getAssessmentListMeta(item: QuizItem): {
  isDone: boolean
  statusLabel: string
  pillTone: "success" | "neutral" | "live"
} {
  if (isInProgressAttempt(item)) {
    return { isDone: false, statusLabel: "Continue", pillTone: "live" }
  }

  const isClosed = isAssessmentClosedForDisplay(item)
  const isBeforeOpen = isBeforeOpenWindow(item)
  const { label, tone } = statusMeta(item, isClosed, isBeforeOpen)
  const isDone = tone === "done" || tone === "closed"
  const pillTone: "success" | "neutral" | "live" =
    tone === "done" ? "success" : tone === "closed" || tone === "pending" ? "neutral" : "live"
  return { isDone, statusLabel: label, pillTone }
}

function statusMeta(item: QuizItem, isClosed: boolean, isBeforeOpen: boolean) {
  if (isSavedForLater(item)) {
    return { label: "Continue", tone: "progress" as const }
  }
  if (item.attempted && item.completed) {
    return { label: "Completed", tone: "done" as const }
  }
  if (item.rollover_active) {
    return { label: "Extension active", tone: "extension" as const }
  }
  if (item.final_access_pending_allowlist && item.is_active) {
    return { label: "Access pending", tone: "pending" as const }
  }
  if (item.is_active) {
    return { label: "Open", tone: "open" as const }
  }
  if (item.can_apply_rollover || item.rollover_requires_upgrade) {
    return { label: "Past due", tone: "extension" as const }
  }
  if (isClosed) {
    return { label: "Closed", tone: "closed" as const }
  }
  if (item.session_access_active === false) {
    return { label: "Inactive", tone: "closed" as const }
  }
  if (isBeforeOpen) {
    return { label: "Opens soon", tone: "pending" as const }
  }
  return { label: "Inactive", tone: "closed" as const }
}

export function buildAssessmentDetailActions(
  item: QuizItem,
  assessmentDisplayName: string,
): AssessmentDetailActions {
  const hasReport = !!(item.attempted && item.attempt_id && item.completed)
  const savedForLater = isSavedForLater(item)
  const canExtend = !!((item.can_apply_rollover || item.rollover_requires_upgrade) && !item.rollover_active)
  const canStart = canShowStartAssessment(item)
  const isClosed = isAssessmentClosedForDisplay(item)
  const isBeforeOpen = isBeforeOpenWindow(item)
  const pendingFinalAllowlist = !!item.final_access_pending_allowlist && item.is_active

  const noPrimaryAction = !hasReport && !savedForLater && !canExtend && !canStart
  const closedByDeadline =
    noPrimaryAction && !item.rollover_active && isClosed
  const lockedNotAvailable = noPrimaryAction && !closedByDeadline

  const startLabelAfterDue =
    canStart && !savedForLater && isPastCalendarDeadline(item)
      ? `Open ${assessmentDisplayName.toLowerCase()}`
      : undefined

  const retakeNote = item.calendar_retake_perks_expired
    ? item.expired_retake_slots != null && item.expired_retake_slots > 0
      ? `${item.expired_retake_slots} retake${item.expired_retake_slots !== 1 ? "s" : ""} expired`
      : "Retakes expired"
    : item.attempts_remaining != null && item.attempts_remaining > 0
      ? `${item.attempts_remaining} retake${item.attempts_remaining !== 1 ? "s" : ""} left`
      : null

  const status = statusMeta(item, isClosed, isBeforeOpen)

  return {
    showStart: !hasReport && !savedForLater && !canExtend && canStart,
    showContinue: savedForLater,
    showRetake:
      hasReport &&
      !!(item.is_active || item.rollover_active) &&
      !item.final_access_pending_allowlist &&
      !item.calendar_retake_perks_expired,
    showReport: hasReport,
    showExtend: !hasReport && !savedForLater && canExtend,
    showClosed: closedByDeadline,
    showLocked: lockedNotAvailable,
    startLabel: startLabelAfterDue ?? `Start ${assessmentDisplayName}`,
    extendLabel: item.rollover_requires_upgrade
      ? "Extend (Upgrade)"
      : `Extend (${item.rollover_hours ?? 24}h${
          item.rollover_membership_applies_max != null && item.rollover_membership_applies_max > 1
            ? ` · ${Math.max(
                0,
                (item.rollover_membership_applies_max ?? 0) - (item.rollover_membership_applies_used ?? 0),
              )} left`
            : ""
        })`,
    lockedLabel: pendingFinalAllowlist
      ? "Access pending — contact your instructor"
      : lockedNotAvailable && isBeforeOpen
        ? `Opens ${dueMeta(item.available_from).label.replace("Due ", "")}`
        : undefined,
    retakeNote,
    statusLabel: status.label,
    statusTone: status.tone,
    displayPercent: displayPercent(item),
    isClosed,
    isBeforeOpen}
}
