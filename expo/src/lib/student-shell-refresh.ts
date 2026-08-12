import {
  fetchClassroomPoints,
  fetchNotificationCount} from "./student-dashboard-stats"
import { setCachedMembershipTier } from "./membership-tier-cache"
import { parseMembershipTier } from "./membership-tier"
import { studentApi } from "./student-api"
import type { StudentSession } from "./session"
import { API_BASE_URL } from "../constants"
import type { MembershipTier } from "../types/dashboard"
import { setAppBadgeCount } from "./notifications/notification-service"

export async function fetchEffectiveMembershipTier(
  session: StudentSession,
): Promise<MembershipTier | null> {
  try {
    const refreshRes = await fetch(
      `${API_BASE_URL}/api/student/membership/refresh?studentId=${encodeURIComponent(session.databaseId)}`,
      {
        headers: {
          Accept: "application/json",
          "x-student-id": session.databaseId}},
    )
    if (refreshRes.ok) {
      const refreshPayload = (await refreshRes.json()) as { tier?: string }
      if (refreshPayload.tier) return parseMembershipTier(refreshPayload.tier)
    }
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
    const infoRes = await fetch(
      `${API_BASE_URL}/api/student/info?student_id=${encodeURIComponent(session.id)}`,
      {
        headers: {
          Accept: "application/json",
          "x-student-id": session.databaseId}},
    )
    if (infoRes.ok) {
      const infoPayload = (await infoRes.json()) as { student?: { membership_tier?: string } }
      if (infoPayload.student?.membership_tier) {
        return parseMembershipTier(infoPayload.student.membership_tier)
      }
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
    fetchClassroomPoints(session.databaseId, session.section),
    fetchNotificationCount(session.databaseId),
  ])

  if (tier) {
    await setCachedMembershipTier(session.databaseId, tier)
    setters.setMembershipTier(tier)
  }
  setters.setMembershipTierLoaded(true)
  setters.setClassroomPoints(points)
  setters.setNotificationCount(notifications)
  void setAppBadgeCount(notifications)
}
