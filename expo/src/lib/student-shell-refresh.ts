import {
  fetchClassroomPoints,
  fetchNotificationCount} from "./student-dashboard-stats"
import { setCachedMembershipTier } from "./membership-tier-cache"
import { higherMembershipTier, parseMembershipTier } from "./membership-tier"
import { studentApi, studentAuthenticatedRequest } from "./student-api"
import { fetchServerEntitlements } from "./entitlements-api"
import type { StudentSession } from "./session"
import type { MembershipTier } from "../types/dashboard"
import { setAppBadgeCount } from "./notifications/notification-service"
import { getQueryClient } from "./query/client"
import { invalidateByAction } from "./query/invalidation"
import { studentQueryScope } from "./query/scope"

const STRIPE_SYNC_MIN_MS = 45_000
let lastStripeSyncAt = 0

function considerTier(value: string | null | undefined, current: MembershipTier | null): MembershipTier | null {
  if (value == null || String(value).trim() === "") return current
  const parsed = parseMembershipTier(value)
  return current ? higherMembershipTier(current, parsed) : parsed
}

function invalidateMembershipGatedQueries(session: StudentSession) {
  try {
    invalidateByAction(getQueryClient(), studentQueryScope(session), "student.membership.activate")
  } catch {
    /* query client may not be mounted yet during bootstrap */
  }
}

export async function fetchEffectiveMembershipTier(
  session: StudentSession,
  options?: { syncStripe?: boolean },
): Promise<MembershipTier | null> {
  let best: MembershipTier | null = null
  const forceStripe = options?.syncStripe === true
  const shouldSyncStripe =
    options?.syncStripe !== false &&
    (forceStripe || lastStripeSyncAt === 0 || Date.now() - lastStripeSyncAt >= STRIPE_SYNC_MIN_MS)

  if (shouldSyncStripe) {
    lastStripeSyncAt = Date.now()
    try {
      const sync = await studentApi.syncMembershipStripe(session)
      best = considerTier(sync.tier, best)
    } catch {
      /* webhook may still be processing — fall through to membership reads */
    }
  }

  try {
    const refreshPayload = await studentAuthenticatedRequest<{ tier?: string }>(
      session,
      `/api/student/membership/refresh?studentId=${encodeURIComponent(session.databaseId)}`,
    )
    best = considerTier(refreshPayload.tier, best)
  } catch {
    /* fall through */
  }

  try {
    const membershipPayload = await studentApi.getMembership(session)
    best = considerTier(membershipPayload.membership?.tier, best)
  } catch {
    /* fall through */
  }

  try {
    const infoPayload = await studentAuthenticatedRequest<{ student?: { membership_tier?: string } }>(
      session,
      `/api/student/info?student_id=${encodeURIComponent(session.id)}`,
    )
    best = considerTier(infoPayload.student?.membership_tier, best)
  } catch {
    /* fall through */
  }

  try {
    const entitlements = await fetchServerEntitlements(session)
    best = considerTier(entitlements.plan, best)
  } catch {
    /* entitlements are additive — never block the shell */
  }

  return best
}

export async function refreshStudentShellData(
  session: StudentSession,
  setters: {
    setMembershipTier: (tier: MembershipTier) => void
    setMembershipTierLoaded: (loaded: boolean) => void
    setClassroomPoints: (points: number) => void
    setNotificationCount: (count: number) => void
  },
  options?: { syncStripe?: boolean },
): Promise<void> {
  const [tier, points, notifications] = await Promise.all([
    fetchEffectiveMembershipTier(session, options),
    fetchClassroomPoints(session).catch(() => null),
    fetchNotificationCount(session).catch(() => null),
  ])

  if (tier) {
    await setCachedMembershipTier(session.databaseId, tier)
    setters.setMembershipTier(tier)
    invalidateMembershipGatedQueries(session)
  }
  setters.setMembershipTierLoaded(true)
  if (points != null) setters.setClassroomPoints(points)
  if (notifications != null) {
    setters.setNotificationCount(notifications)
    void setAppBadgeCount(notifications)
  }
}
