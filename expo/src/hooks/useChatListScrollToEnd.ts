import { useCallback, useEffect, useRef } from "react"

type ScrollableList = {
  scrollToEnd: (options?: { animated?: boolean }) => void
}

/**
 * Smooth chat list scrolling — coalesces rapid scroll-to-end requests
 * (streaming tokens, keyboard layout) so typing and flings stay fluid.
 */
export function useChatListScrollToEnd(
  listRef: React.RefObject<ScrollableList | null>,
  throttleMs = 100,
) {
  const lastRunRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return useCallback(
    (animated = true) => {
      const run = () => {
        lastRunRef.current = Date.now()
        timerRef.current = null
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated })
        })
      }

      const elapsed = Date.now() - lastRunRef.current
      if (elapsed >= throttleMs) {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
        run()
        return
      }

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(run, throttleMs - elapsed)
    },
    [listRef, throttleMs],
  )
}
