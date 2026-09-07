import { useEffect, useRef } from "react"

/** Reset module search/filters when the active course (or other scope) changes. */
export function useResetOnScopeChange(
  scopeKey: string | number | null | undefined,
  reset: () => void,
) {
  const prev = useRef(scopeKey)
  useEffect(() => {
    if (prev.current === scopeKey) return
    prev.current = scopeKey
    reset()
  }, [scopeKey, reset])
}
