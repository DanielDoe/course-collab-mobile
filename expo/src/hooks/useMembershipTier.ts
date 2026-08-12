import { useCallback } from "react"
import { fetchEffectiveMembershipTier, refreshStudentShellData } from "../lib/student-shell-refresh"
import { useStudentShell } from "../context/StudentShellContext"
import type { StudentSession } from "../lib/session"

type Options = {
  loadOnMount?: boolean
}

/** @deprecated Prefer useStudentShellRefresh for full shell sync. */
export function useMembershipTier(session: StudentSession, _options: Options = {}) {
  const setters = useStudentShell()

  const refreshMembershipTier = useCallback(async () => {
    const tier = await fetchEffectiveMembershipTier(session)
    if (tier) {
      setters.setMembershipTier(tier)
    }
    setters.setMembershipTierLoaded(true)
    return tier
  }, [session, setters])

  const refreshAll = useCallback(async () => {
    await refreshStudentShellData(session, {
      setMembershipTier: setters.setMembershipTier,
      setMembershipTierLoaded: setters.setMembershipTierLoaded,
      setClassroomPoints: setters.setClassroomPoints,
      setNotificationCount: setters.setNotificationCount})
  }, [session, setters])

  return {
    membershipTier: setters.membershipTier,
    membershipTierLoaded: setters.membershipTierLoaded,
    refreshMembershipTier,
    refreshAll}
}
