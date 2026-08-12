import type { MembershipTier } from "../types/dashboard"
import type { StudentNavItem } from "../constants/student-nav"

export function parseMembershipTier(value: string | null | undefined): MembershipTier {
  if (value === "Explorer" || value === "Trailblazer") return value
  return "Scholar"
}

export function getNavUpgradePrompt(item: StudentNavItem, currentTier: MembershipTier) {
  const requiredTier = item.minTier ?? "Explorer"
  return {
    title: `${requiredTier} plan required`,
    message: `${item.label} is included with the ${requiredTier} plan or higher. You're currently on ${currentTier} — upgrade to unlock it.`,
    requiredTier}
}
