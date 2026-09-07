import { useCallback, useEffect, useRef, useState } from "react"
import { studentApi } from "../lib/student-api"
import { emitModuleRefresh } from "../lib/notifications/notification-events"
import type { StudentSession } from "../lib/session"

function parseCompletedSlides(value: unknown): number[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0))].sort(
      (a, b) => a - b,
    )
  }
  if (typeof value === "string") {
    try {
      return parseCompletedSlides(JSON.parse(value))
    } catch {
      return []
    }
  }
  return []
}

/** Sync lecture PDF page views with the same backend progress API as web. */
export function useLectureSlideProgressSync(session: StudentSession | null, lectureId: number) {
  const viewedPagesRef = useRef<Set<number>>(new Set())
  const activePageRef = useRef(1)
  const totalPagesRef = useRef(0)
  const hydratedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSavedStatusRef = useRef<string | null>(null)
  const [initialPage, setInitialPage] = useState(1)
  const [progressHydrated, setProgressHydrated] = useState(false)

  const saveProgress = useCallback(async () => {
    if (!session || !Number.isFinite(lectureId) || !hydratedRef.current) return
    const totalSlides = totalPagesRef.current
    if (totalSlides < 1) return

    const completedSlides = [...viewedPagesRef.current].sort((a, b) => a - b)
    const currentSlide = activePageRef.current

    try {
      const res = await studentApi.saveLectureSlideProgress(session, lectureId, {
        currentSlide,
        totalSlides,
        completedSlides,
        timeSpentSeconds: 30,
      })
      if (res.status && res.status !== lastSavedStatusRef.current) {
        lastSavedStatusRef.current = res.status
        emitModuleRefresh("lectures")
      }
    } catch {
      /* non-blocking — viewer keeps working */
    }
  }, [lectureId, session])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void saveProgress()
    }, 1200)
  }, [saveProgress])

  const handleDocumentLoaded = useCallback(
    (totalPages: number) => {
      totalPagesRef.current = Math.max(1, totalPages)
      if (viewedPagesRef.current.size === 0) {
        viewedPagesRef.current.add(activePageRef.current || 1)
      }
      if (hydratedRef.current) {
        void saveProgress()
      }
    },
    [saveProgress],
  )

  const handlePageChange = useCallback(
    (page: number, totalPages: number) => {
      if (totalPages > 0) totalPagesRef.current = totalPages
      const normalized = Math.max(1, Math.min(page, totalPagesRef.current || page))
      activePageRef.current = normalized
      viewedPagesRef.current.add(normalized)
      scheduleSave()
    },
    [scheduleSave],
  )

  useEffect(() => {
    if (!session || !Number.isFinite(lectureId)) {
      setProgressHydrated(true)
      return
    }

    let cancelled = false
    hydratedRef.current = false
    viewedPagesRef.current = new Set()
    activePageRef.current = 1
    totalPagesRef.current = 0
    lastSavedStatusRef.current = null
    setInitialPage(1)
    setProgressHydrated(false)

    void studentApi
      .getLectureProgress(session, lectureId)
      .then((data) => {
        if (cancelled) return
        const completed = parseCompletedSlides(data.progress?.completed_slides)
        if (completed.length > 0) {
          viewedPagesRef.current = new Set(completed)
        }
        const lastPage = Number(data.progress?.last_viewed_slide_order)
        if (Number.isFinite(lastPage) && lastPage > 0) {
          activePageRef.current = lastPage
          viewedPagesRef.current.add(lastPage)
          setInitialPage(lastPage)
        }
        lastSavedStatusRef.current = data.status ?? data.progress?.status ?? null
      })
      .catch(() => {
        /* start fresh */
      })
      .finally(() => {
        if (cancelled) return
        hydratedRef.current = true
        setProgressHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [lectureId, session])

  useEffect(() => {
    if (!session || !progressHydrated) return

    intervalRef.current = setInterval(() => {
      void saveProgress()
    }, 45_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      void saveProgress()
    }
  }, [progressHydrated, saveProgress, session])

  return {
    initialPage,
    progressHydrated,
    onDocumentLoaded: handleDocumentLoaded,
    onPageChange: handlePageChange,
  }
}
