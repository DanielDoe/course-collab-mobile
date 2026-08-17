import type { RecommendationRequest } from "./course-info-api"
import type { GuestEntitlements } from "./guest-types"
import { guestCoraCommerceEnabled } from "../constants/guest-nav"
import {
  GUEST_CORA_CAREER_LIFETIME_CREDITS,
  GUEST_FREE_STARTER_CORA_CREDITS,
} from "./guest-membership-config"
import {
  countGuestLettersByFilter,
  guestNeedsAction,
  guestIsTerminal,
  summarizeGuestRequests,
} from "./guest-recommendation-utils"
import { recommendationStatusLabel } from "./faculty-recommendation-utils"
import { purposeLabel } from "./course-info-api"

export type GuestPipelineSegment = {
  key: string
  label: string
  count: number
  color: string
}

export type GuestDashboardInsight = {
  id: string
  type: "warning" | "tip" | "info"
  message: string
  actionLabel?: string
  actionRoute?: string
}

export type GuestDeadlineItem = {
  id: number
  label: string
  deadline: string
  daysRemaining: number
  status: string
  instructorName?: string | null
}

export type GuestStatusBarItem = {
  label: string
  value: number
  color: string
}

export function buildGuestPipelineSegments(
  requests: RecommendationRequest[],
  colors: { needsYou: string; inProgress: string; completed: string; rejected: string },
): GuestPipelineSegment[] {
  const counts = countGuestLettersByFilter(requests)
  const finalized = requests.filter((row) => String(row.status ?? "") === "finalized").length
  const downloaded = requests.filter((row) => String(row.status ?? "") === "downloaded").length
  const rejected = requests.filter((row) => String(row.status ?? "") === "rejected").length

  return [
    { key: "needs_you", label: "Needs you", count: counts.needs_you, color: colors.needsYou },
    { key: "in_progress", label: "In progress", count: counts.in_progress, color: colors.inProgress },
    { key: "completed", label: "Completed", count: finalized + downloaded, color: colors.completed },
    { key: "rejected", label: "Closed", count: rejected, color: colors.rejected },
  ].filter((segment) => segment.count > 0)
}

export function buildGuestStatusBars(
  requests: RecommendationRequest[],
  colors: { needsYou: string; inProgress: string; completed: string; rejected: string },
): GuestStatusBarItem[] {
  const counts = countGuestLettersByFilter(requests)
  const finalized = requests.filter((row) => String(row.status ?? "") === "finalized").length
  const downloaded = requests.filter((row) => String(row.status ?? "") === "downloaded").length
  const rejected = requests.filter((row) => String(row.status ?? "") === "rejected").length

  return [
    { label: "Needs you", value: counts.needs_you, color: colors.needsYou },
    { label: "In progress", value: counts.in_progress, color: colors.inProgress },
    { label: "Completed", value: finalized + downloaded, color: colors.completed },
    { label: "Closed", value: rejected, color: colors.rejected },
  ].filter((item) => item.value > 0)
}

export function buildGuestDeadlineItems(requests: RecommendationRequest[], limit = 3): GuestDeadlineItem[] {
  const now = Date.now()
  return requests
    .filter((row) => row.deadline && !guestIsTerminal(String(row.status ?? "")))
    .map((row) => {
      const deadlineMs = new Date(row.deadline!).getTime()
      const daysRemaining = Math.ceil((deadlineMs - now) / (1000 * 60 * 60 * 24))
      return {
        id: row.id,
        label: purposeLabel(row.purpose),
        deadline: row.deadline!,
        daysRemaining,
        status: row.status ?? "",
        instructorName: row.instructor_name,
      }
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, limit)
}

export function buildGuestDashboardInsights(
  requests: RecommendationRequest[],
  entitlements: GuestEntitlements,
  upcomingDeadline: string | null,
): GuestDashboardInsight[] {
  const insights: GuestDashboardInsight[] = []
  const summary = summarizeGuestRequests(requests)
  const needsYou = requests.filter((row) => guestNeedsAction(row.status))

  if (needsYou.length > 0) {
    insights.push({
      id: "needs-action",
      type: "warning",
      message:
        needsYou.length === 1
          ? "1 letter needs your attention — review the next step in your workspace."
          : `${needsYou.length} letters need your attention — pick up where you left off.`,
      actionLabel: "View letters",
      actionRoute: "/module/recommendations",
    })
  }

  if (upcomingDeadline) {
    const deadlineMs = new Date(upcomingDeadline).getTime()
    const days = Math.ceil((deadlineMs - Date.now()) / (1000 * 60 * 60 * 24))
    if (days <= 14) {
      const match = requests.find((row) => row.deadline === upcomingDeadline)
      insights.push({
        id: "deadline-soon",
        type: days <= 7 ? "warning" : "tip",
        message:
          days <= 0
            ? "A recommendation deadline is today — finish outstanding steps soon."
            : days === 1
              ? "A recommendation deadline is tomorrow."
              : `Next recommendation deadline in ${days} days.`,
        actionLabel: match ? "Open letter" : "View letters",
        actionRoute: match ? `/recommendation/${match.id}` : "/module/recommendations",
      })
    }
  }

  if (entitlements.coraCredits.isLow && entitlements.plan === "cora_career") {
    insights.push({
      id: "credits-low",
      type: "warning",
      message: `Cora Credits are running low (${entitlements.coraCredits.available.toLocaleString()} left).`,
      actionLabel: "Buy credits",
      actionRoute: "/module/cora-credits",
    })
  }

  if (entitlements.plan === "guest_free" && guestCoraCommerceEnabled(entitlements)) {
    insights.push({
      id: "upgrade-career",
      type: "tip",
      message: `Unlock Cora Career for résumé review, interview prep, and ${GUEST_CORA_CAREER_LIFETIME_CREDITS.toLocaleString()} lifetime credits.`,
      actionLabel: "Get Cora Career",
      actionRoute: "/guest/cora-career/checkout",
    })
  }

  if (requests.length === 0) {
    insights.push({
      id: "get-started",
      type: "info",
      message: "Start your first recommendation request — brief assistance is free for all guests.",
      actionLabel: "New request",
      actionRoute: "/module/recommendations?tab=new",
    })
  } else if (summary.completed > 0 && needsYou.length === 0) {
    const latest = [...requests].sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
        new Date(a.updated_at ?? a.created_at ?? 0).getTime(),
    )[0]
    if (latest) {
      insights.push({
        id: "recent-update",
        type: "info",
        message: `Latest update: ${purposeLabel(latest.purpose)} is ${recommendationStatusLabel(latest.status).toLowerCase()}.`,
        actionLabel: "Open letter",
        actionRoute: `/recommendation/${latest.id}`,
      })
    }
  }

  return insights.slice(0, 4)
}

export function guestCreditsCap(entitlements: GuestEntitlements): number {
  if (entitlements.plan === "cora_career") {
    return entitlements.planConfig?.coraCreditsIncluded ?? GUEST_CORA_CAREER_LIFETIME_CREDITS
  }
  return entitlements.planConfig?.coraCreditsIncluded ?? GUEST_FREE_STARTER_CORA_CREDITS
}

export function guestCreditsUsedFraction(entitlements: GuestEntitlements): number {
  const cap = guestCreditsCap(entitlements)
  if (cap <= 0) return 0
  const remaining = entitlements.coraCredits.available
  return Math.max(0, Math.min(1, 1 - remaining / cap))
}
