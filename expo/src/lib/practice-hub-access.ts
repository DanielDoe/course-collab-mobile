import type { MembershipTier } from "../types/dashboard"
import { hasNavAccess } from "../constants/student-nav"
import type { PracticeAccess } from "./practice-api"

/** Practice Hub requires Explorer+ (Scholar has no practice access). */
export const PRACTICE_HUB_MIN_TIER: MembershipTier = "Explorer"

export function canAccessPracticeHub(tier: MembershipTier): boolean {
  return hasNavAccess(tier, PRACTICE_HUB_MIN_TIER)
}

export function practiceAccessFromMembership(tier: MembershipTier): PracticeAccess {
  if (tier === "Trailblazer") {
    return {
      level: "full",
      canOpenTopics: true,
      canStartPractice: true,
      unlockFraction: 1,
      upgradeRequiredTier: null,
    }
  }
  if (tier === "Explorer") {
    return {
      level: "partial",
      canOpenTopics: true,
      canStartPractice: true,
      unlockFraction: 0.5,
      upgradeRequiredTier: "Trailblazer",
    }
  }
  return {
    level: "none",
    canOpenTopics: false,
    canStartPractice: false,
    unlockFraction: 0,
    upgradeRequiredTier: "Explorer",
  }
}

function moreGenerousPracticeAccess(left: PracticeAccess, right: PracticeAccess): PracticeAccess {
  const unlockFraction = Math.max(left.unlockFraction, right.unlockFraction)
  const canStartPractice = left.canStartPractice || right.canStartPractice
  const canOpenTopics = left.canOpenTopics || right.canOpenTopics
  const level =
    unlockFraction >= 1 ? "full" : canStartPractice || unlockFraction > 0 ? "partial" : "none"
  let upgradeRequiredTier: PracticeAccess["upgradeRequiredTier"] = null
  if (level === "none") upgradeRequiredTier = "Explorer"
  else if (level === "partial") upgradeRequiredTier = "Trailblazer"
  return { level, canOpenTopics, canStartPractice, unlockFraction, upgradeRequiredTier }
}

/** Prefer paid membership over a stale Scholar snapshot from practice APIs. */
export function resolvePracticeAccess(
  membershipTier: MembershipTier,
  membershipLoaded: boolean,
  apiAccess?: PracticeAccess | null,
): PracticeAccess {
  const fromMembership = practiceAccessFromMembership(membershipTier)
  if (!membershipLoaded) return apiAccess ?? fromMembership
  if (!apiAccess) return fromMembership
  return moreGenerousPracticeAccess(fromMembership, apiAccess)
}
