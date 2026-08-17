import { useCallback, useEffect, useRef, useState } from "react"
import { useFocusEffect } from "@react-navigation/native"
import {
  codebenchApi,
  type CodebenchAnalysis,
  type CodebenchBadgeDetail,
  type CodebenchLeaderboardEntry,
  type CodebenchLearningPlan,
  type CodebenchStreak,
  type DailyChallenge,
} from "../lib/codebench-api"
import { ApiError } from "../lib/api"
import { fetchCodebenchProgress } from "../lib/codebench-progress"
import { SHELL_REFRESH_TTL_MS } from "../lib/faculty-shell-refresh-types"
import type { StudentSession } from "../lib/session"

type Options = {
  enabled?: boolean
  refreshOnFocus?: boolean
}

export function useCodebenchProgress(session: StudentSession | null, options: Options = {}) {
  const { enabled = true, refreshOnFocus = true } = options

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [error, setError] = useState("")

  const [streak, setStreak] = useState<CodebenchStreak>({ streakDays: 0 })
  const [badges, setBadges] = useState<Record<string, boolean>>({})
  const [badgeDetails, setBadgeDetails] = useState<Record<string, CodebenchBadgeDetail>>({})
  const [leaderboard, setLeaderboard] = useState<CodebenchLeaderboardEntry[]>([])
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null)
  const [submissionCount, setSubmissionCount] = useState(0)
  const [totalXp, setTotalXp] = useState(0)
  const [analysis, setAnalysis] = useState<CodebenchAnalysis | null>(null)
  const [learningPlan, setLearningPlan] = useState<CodebenchLearningPlan | null>(null)
  const [hasCodeSample, setHasCodeSample] = useState(false)
  const lastSilentRefreshAtRef = useRef(0)

  const applySnapshot = useCallback((snapshot: Awaited<ReturnType<typeof fetchCodebenchProgress>>) => {
    setStreak(snapshot.streak)
    setBadges(snapshot.badges)
    setBadgeDetails(snapshot.badgeDetails)
    setLeaderboard(snapshot.leaderboard)
    setDailyChallenge(snapshot.dailyChallenge)
    setSubmissionCount(snapshot.submissionCount)
    setTotalXp(snapshot.totalXp)
    setAnalysis(snapshot.analysis)
    setLearningPlan(snapshot.learningPlan)
    setHasCodeSample(snapshot.hasCodeSample)
  }, [])

  const reloadInsights = useCallback(
    async (code: string) => {
      if (!session || !enabled || !code.trim()) {
        setAnalysis(null)
        setLearningPlan(null)
        setHasCodeSample(false)
        return
      }

      setHasCodeSample(true)
      setAnalysisLoading(true)
      try {
        const [analyzeRes, planRes] = await Promise.all([
          codebenchApi.analyze(session, code).catch(() => null),
          codebenchApi.getLearningPlan(session, code).catch(() => null),
        ])
        setAnalysis(analyzeRes)
        setLearningPlan(planRes)
      } finally {
        setAnalysisLoading(false)
      }
    },
    [enabled, session],
  )

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!session || !enabled) return
      if (!opts?.silent) setLoading(true)
      try {
        const snapshot = await fetchCodebenchProgress(session)
        applySnapshot(snapshot)
        setError(snapshot.error)
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Failed to load your CodeBench progress.",
        )
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [applySnapshot, enabled, session],
  )

  useEffect(() => {
    if (!session || !enabled) {
      setLoading(false)
      setError("")
      return
    }
    void load()
  }, [enabled, load, session])

  useFocusEffect(
    useCallback(() => {
      if (!refreshOnFocus || !session || !enabled) return
      const now = Date.now()
      if (
        lastSilentRefreshAtRef.current > 0 &&
        now - lastSilentRefreshAtRef.current < SHELL_REFRESH_TTL_MS
      ) {
        return
      }
      lastSilentRefreshAtRef.current = now
      void load({ silent: true })
    }, [enabled, load, refreshOnFocus, session]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    lastSilentRefreshAtRef.current = Date.now()
    await load({ silent: true })
    setRefreshing(false)
  }, [load])

  return {
    loading,
    refreshing,
    analysisLoading,
    error,
    streak,
    badges,
    badgeDetails,
    leaderboard,
    dailyChallenge,
    submissionCount,
    totalXp,
    analysis,
    learningPlan,
    hasCodeSample,
    onRefresh,
    reloadInsights,
    reload: load,
  }
}
