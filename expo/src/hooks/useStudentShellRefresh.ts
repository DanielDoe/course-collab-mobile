import { useCallback, useEffect, useRef } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useFocusEffect } from "expo-router"
import { getCachedMembershipTier } from "../lib/membership-tier-cache"
import { refreshStudentShellData } from "../lib/student-shell-refresh"
import { consumeStudentShellBootstrap } from "../lib/app-bootstrap-cache"
import { ensureAppBootstrap } from "../lib/post-login-bootstrap"
import { SHELL_REFRESH_TTL_MS, type RefreshStudentDataOptions } from "../lib/faculty-shell-refresh-types"
import { useStudentShell } from "../context/StudentShellContext"
import type { StudentSession } from "../lib/session"

export function useStudentShellRefresh(session: StudentSession) {
  const {
    setMembershipTier,
    setMembershipTierLoaded,
    setClassroomPoints,
    setNotificationCount,
    registerRefreshStudentData,
  } = useStudentShell()
  const refreshingRef = useRef(false)
  const lastRefreshAtRef = useRef(0)
  const initialRefreshDoneRef = useRef(false)

  const refreshAll = useCallback(
    async (options?: RefreshStudentDataOptions) => {
      const force = options?.force === true
      const now = Date.now()

      if (refreshingRef.current) return
      if (!force && lastRefreshAtRef.current > 0 && now - lastRefreshAtRef.current < SHELL_REFRESH_TTL_MS) {
        return
      }

      refreshingRef.current = true
      try {
        await refreshStudentShellData(
          session,
          {
            setMembershipTier,
            setMembershipTierLoaded,
            setClassroomPoints,
            setNotificationCount,
          },
          { syncStripe: force },
        )
        lastRefreshAtRef.current = Date.now()
      } finally {
        refreshingRef.current = false
      }
    },
    [session, setMembershipTier, setMembershipTierLoaded, setClassroomPoints, setNotificationCount],
  )

  useEffect(() => {
    registerRefreshStudentData(refreshAll)
    return () => registerRefreshStudentData(null)
  }, [refreshAll, registerRefreshStudentData])

  useEffect(() => {
    let mounted = true

    void (async () => {
      await ensureAppBootstrap(session)
      if (!mounted) return

      const cachedShell = consumeStudentShellBootstrap()
      if (cachedShell) {
        if (cachedShell.membershipTier) {
          setMembershipTier(cachedShell.membershipTier)
        }
        setMembershipTierLoaded(true)
        setClassroomPoints(cachedShell.classroomPoints)
        setNotificationCount(cachedShell.notificationCount)
        lastRefreshAtRef.current = Date.now()
      } else {
        const cached = await getCachedMembershipTier(session.databaseId)
        if (!mounted) return
        if (cached) {
          setMembershipTier(cached)
          setMembershipTierLoaded(true)
        } else {
          setMembershipTierLoaded(false)
        }
      }

      if (!initialRefreshDoneRef.current) {
        initialRefreshDoneRef.current = true
        await refreshAll({ force: true })
      }
    })()

    return () => {
      mounted = false
    }
  }, [
    refreshAll,
    session,
    setClassroomPoints,
    setMembershipTier,
    setMembershipTierLoaded,
    setNotificationCount,
  ])

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active") void refreshAll()
    }
    const sub = AppState.addEventListener("change", onChange)
    return () => sub.remove()
  }, [refreshAll])

  useFocusEffect(
    useCallback(() => {
      void refreshAll()
    }, [refreshAll]),
  )

  return { refreshAll }
}
