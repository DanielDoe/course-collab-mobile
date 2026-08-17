import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useFocusEffect } from "expo-router"
import type { StudentSession } from "../lib/session"
import type { FacultySession } from "../lib/session"
import { coraCreditsApi } from "../lib/cora/credits/api"
import type { CoraActivityRow, CoraBalance } from "../lib/cora/credits/types"

const STALE_MS = 30_000
/** Compact preview on membership/plans — fixed page size, no growing list. */
export const CORA_ACTIVITY_PAGE_SIZE = 5

type Role = "student" | "instructor"

export function useCoraBalance(args: {
  role: Role
  session: StudentSession | FacultySession | null
  enabled?: boolean
}) {
  const { role, session, enabled = true } = args
  const [balance, setBalance] = useState<CoraBalance | null>(null)
  const [activity, setActivity] = useState<CoraActivityRow[]>([])
  const [activityPage, setActivityPage] = useState(1)
  const [activityTotalPages, setActivityTotalPages] = useState(1)
  const [activityTotal, setActivityTotal] = useState(0)
  const [activityLoadingPage, setActivityLoadingPage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef(0)

  const fetchActivityPage = useCallback(
    async (page: number) => {
      if (!session) {
        return {
          activity: [] as CoraActivityRow[],
          page: 1,
          totalPages: 1,
          total: 0,
        }
      }
      const result =
        role === "student"
          ? await coraCreditsApi.getStudentActivity(session as StudentSession, {
              limit: CORA_ACTIVITY_PAGE_SIZE,
              page,
            })
          : await coraCreditsApi.getInstructorActivity(session as FacultySession, {
              limit: CORA_ACTIVITY_PAGE_SIZE,
              page,
            })
      return {
        activity: result.activity,
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
      }
    },
    [session, role],
  )

  const applyActivityPage = useCallback(
    (result: {
      activity: CoraActivityRow[]
      page: number
      totalPages: number
      total: number
    }) => {
      setActivity(result.activity)
      setActivityPage(result.page)
      setActivityTotalPages(result.totalPages)
      setActivityTotal(result.total)
    },
    [],
  )

  const refresh = useCallback(
    async (options?: { force?: boolean; includeActivity?: boolean }) => {
      if (!session || !enabled) return null
      const now = Date.now()
      if (!options?.force && now - lastFetchRef.current < STALE_MS && balance) {
        return balance
      }
      setLoading(true)
      setError(null)
      try {
        const next =
          role === "student"
            ? await coraCreditsApi.getStudentBalance(session as StudentSession)
            : await coraCreditsApi.getInstructorBalance(session as FacultySession)
        setBalance(next)
        lastFetchRef.current = Date.now()
        if (options?.includeActivity) {
          applyActivityPage(await fetchActivityPage(1))
        }
        return next
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load Cora credits")
        return null
      } finally {
        setLoading(false)
      }
    },
    [session, enabled, role, balance, fetchActivityPage, applyActivityPage],
  )

  const goToActivityPage = useCallback(
    async (page: number) => {
      if (!session || !enabled) return
      const target = Math.max(1, Math.min(activityTotalPages, Math.floor(page)))
      if (target === activityPage && activity.length) return
      setActivityLoadingPage(true)
      setError(null)
      try {
        applyActivityPage(await fetchActivityPage(target))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load activity page")
      } finally {
        setActivityLoadingPage(false)
      }
    },
    [
      session,
      enabled,
      activityTotalPages,
      activityPage,
      activity.length,
      fetchActivityPage,
      applyActivityPage,
    ],
  )

  useEffect(() => {
    if (!session || !enabled) return
    void refresh({ force: true, includeActivity: true })
  }, [session, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      if (!session || !enabled) return
      void refresh({ includeActivity: true })
    }, [session, enabled, refresh]),
  )

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active" && session && enabled) {
        void refresh({ includeActivity: true })
      }
    }
    const sub = AppState.addEventListener("change", onChange)
    return () => sub.remove()
  }, [session, enabled, refresh])

  return {
    balance,
    activity,
    activityPage,
    activityTotalPages,
    activityTotal,
    activityLoadingPage,
    goToActivityPage,
    loading,
    error,
    refresh,
    setBalance,
  }
}
