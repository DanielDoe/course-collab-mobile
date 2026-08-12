import { useCallback, useRef } from "react"
import { useFocusEffect } from "expo-router"
import { SHELL_REFRESH_TTL_MS } from "./faculty-shell-refresh-types"

/** Runs `onRefresh` on screen focus, skipping calls within `ttlMs` unless `force` is true. */
export function useThrottledFocusRefresh(
  onRefresh: (options?: { force?: boolean }) => void | Promise<void>,
  enabled = true,
  ttlMs = SHELL_REFRESH_TTL_MS,
) {
  const lastRefreshAtRef = useRef(0)

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return
      const now = Date.now()
      if (lastRefreshAtRef.current > 0 && now - lastRefreshAtRef.current < ttlMs) return
      lastRefreshAtRef.current = now
      void onRefresh()
    }, [enabled, onRefresh, ttlMs]),
  )

  const forceRefresh = useCallback(() => {
    lastRefreshAtRef.current = Date.now()
    return onRefresh({ force: true })
  }, [onRefresh])

  return { forceRefresh, markRefreshed: () => {
    lastRefreshAtRef.current = Date.now()
  } }
}
