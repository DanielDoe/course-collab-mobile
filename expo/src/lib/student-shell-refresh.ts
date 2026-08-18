import {
  fetchClassroomPoints,
  fetchNotificationCount} from "./student-dashboard-stats"
import { setCachedMembershipTier } from "./membership-tier-cache"
import { parseMembershipTier } from "./membership-tier"
import { studentApi, studentAuthenticatedRequest } from "./student-api"
import type { StudentSession } from "./session"
import type { MembershipTier } from "../types/dashboard"
import { setAppBadgeCount } from "./notifications/notification-service"

export async function fetchEffectiveMembershipTier(
  session: StudentSession,
): Promise<MembershipTier | null> {
  try {
    const refreshPayload = await studentAuthenticatedRequest<{ tier?: string }>(
      session,
      `/api/student/membership/refresh?studentId=${encodeURIComponent(session.databaseId)}`,
    )
    if (refreshPayload.tier) return parseMembershipTier(refreshPayload.tier)
  } catch {
    /* fall through */
  }

  try {
    const membershipPayload = await studentApi.getMembership(session)
    if (membershipPayload.membership?.tier) {
      return parseMembershipTier(membershipPayload.membership.tier)
    }
  } catch {
    /* fall through */
  }

  try {
    const infoPayload = await studentAuthenticatedRequest<{ student?: { membership_tier?: string } }>(
      session,
      `/api/student/info?student_id=${encodeURIComponent(session.id)}`,
    )
    if (infoPayload.student?.membership_tier) {
      return parseMembershipTier(infoPayload.student.membership_tier)
    }
  } catch {
    /* fall through */
  }

  return null
}

export async function refreshStudentShellData(
  session: StudentSession,
  setters: {
    setMembershipTier: (tier: MembershipTier) => void
    setMembershipTierLoaded: (loaded: boolean) => void
    setClassroomPoints: (points: number) => void
    setNotificationCount: (count: number) => void
  },
): Promise<void> {
  const [tier, points, notifications] = await Promise.all([
    fetchEffectiveMembershipTier(session),
    fetchClassroomPoints(session).catch(() => null),
    fetchNotificationCount(session).catch(() => null),
  ])

  if (tier) {
    await setCachedMembershipTier(session.databaseId, tier)
    setters.setMembershipTier(tier)
  }
  setters.setMembershipTierLoaded(true)
  if (points != null) setters.setClassroomPoints(points)
  if (notifications != null) {
    setters.setNotificationCount(notifications)
    void setAppBadgeCount(notifications)
  }
}
