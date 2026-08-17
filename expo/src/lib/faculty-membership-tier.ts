import type { FacultyNavItem } from "../constants/faculty-nav"
import type { FacultyMembershipTier } from "../types/dashboard"

export function parseFacultyMembershipTier(value: string | null | undefined): FacultyMembershipTier {
  if (value === "Pro" || value === "Enterprise") return value
  return "Free"
}

/** Compact badge label — use in drawer chips, lock hints, and tight UI. */
export function facultyMembershipTierShortLabel(tier: FacultyMembershipTier): string {
  return tier
}

/** Full plan label — use where there is room for context (settings rows, profile detail, alerts). */
export function facultyMembershipTierLongLabel(tier: FacultyMembershipTier): string {
  return tier === "Free" ? "Instructor Free" : `Instructor ${tier}`
}

export function formatFacultyMembershipTierLabel(
  tier: FacultyMembershipTier,
  variant: "short" | "long" = "short",
): string {
  return variant === "long" ? facultyMembershipTierLongLabel(tier) : facultyMembershipTierShortLabel(tier)
}

export function getFacultyNavUpgradePrompt(
  item: Pick<FacultyNavItem, "label" | "minTier"> & Partial<Pick<FacultyNavItem, "id" | "route" | "icon">>,
  currentTier: FacultyMembershipTier,
) {
  const requiredTier = item.minTier ?? "Pro"
  return {
    title: `${requiredTier} plan required`,
    message: `${item.label} is included with Instructor ${requiredTier} or higher. You're currently on ${facultyMembershipTierLongLabel(currentTier)} — upgrade to unlock it.`,
    requiredTier,
  }
}
