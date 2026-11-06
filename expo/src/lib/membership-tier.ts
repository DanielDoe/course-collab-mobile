import type { MembershipTier } from "../types/dashboard"
import type { StudentNavItem } from "../constants/student-nav"

const TIER_RANK: Record<MembershipTier, number> = {
  Scholar: 0,
  Explorer: 1,
  Trailblazer: 2,
}

/** Stripe / entitlements may send slugs like `trailblazer_semester` or `student-explorer`. */
export function parseMembershipTier(value: string | null | undefined): MembershipTier {
  if (value == null) return "Scholar"
  const compact = String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, "")
  if (!compact) return "Scholar"
  if (compact.includes("trailblazer")) return "Trailblazer"
  if (compact.includes("explorer")) return "Explorer"
  return "Scholar"
}

export function membershipTierRank(tier: MembershipTier): number {
  return TIER_RANK[tier]
}

export function higherMembershipTier(left: MembershipTier, right: MembershipTier): MembershipTier {
  return membershipTierRank(left) >= membershipTierRank(right) ? left : right
}

export function getNavUpgradePrompt(item: StudentNavItem, currentTier: MembershipTier) {
  const requiredTier = item.minTier ?? "Explorer"
  return {
    title: `${requiredTier} plan required`,
    message: `${item.label} is included with the ${requiredTier} plan or higher. You're currently on ${currentTier} — upgrade to unlock it.`,
    requiredTier}
}
