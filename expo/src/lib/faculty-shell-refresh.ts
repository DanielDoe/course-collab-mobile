import { API_BASE_URL } from "../constants"
import { setCachedFacultyMembershipTier } from "./faculty-membership-tier-cache"
import { parseFacultyMembershipTier } from "./faculty-membership-tier"
import { instructorApi } from "./instructor-api"
import type { FacultySession } from "./session"
import type { FacultyMembershipTier } from "../types/dashboard"

export async function fetchEffectiveFacultyMembershipTier(
  session: FacultySession,
): Promise<FacultyMembershipTier | null> {
  try {
    const refreshRes = await fetch(
      `${API_BASE_URL}/api/instructor/membership/refresh?instructorId=${encodeURIComponent(String(session.id))}`,
      {
        headers: {
          Accept: "application/json",
          "x-instructor-id": String(session.id),
        },
      },
    )
    if (refreshRes.ok) {
      const refreshPayload = (await refreshRes.json()) as { tier?: string }
      if (refreshPayload.tier) return parseFacultyMembershipTier(refreshPayload.tier)
    }
  } catch {
    /* fall through */
  }

  try {
    const membershipPayload = await instructorApi.getMembership(session.id)
    if (membershipPayload.membership?.tier) {
      return parseFacultyMembershipTier(membershipPayload.membership.tier)
    }
  } catch {
    /* fall through */
  }

  return null
}

export async function refreshFacultyShellMembership(
  session: FacultySession,
  setters: {
    setMembershipTier: (tier: FacultyMembershipTier) => void
    setMembershipTierLoaded: (loaded: boolean) => void
  },
): Promise<void> {
  const tier = await fetchEffectiveFacultyMembershipTier(session)
  if (tier) {
    await setCachedFacultyMembershipTier(session.id, tier)
    setters.setMembershipTier(tier)
  }
  setters.setMembershipTierLoaded(true)
}
