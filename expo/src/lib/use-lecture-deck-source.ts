import { useEffect, useState } from "react"
import { buildAuthenticatedDeckSource, resolveLectureDeckUrl } from "./lecture-deck-url"
import {
  loadLectureDeckPdf,
  type LectureDeckPdfSource,
  type LoadLectureDeckResult,
} from "./lecture-deck-loader"
import { API_BASE_URL } from "../constants"

export function useResolvedLectureDeckSource(params: {
  deckUrl: string | null | undefined
  headers?: Record<string, string>
  cacheKey?: string
  enabled?: boolean
}): {
  source: LectureDeckPdfSource | null
  loading: boolean
  error: string
  retryNonce: number
  retry: () => void
} {
  const enabled = params.enabled !== false
  const [source, setSource] = useState<LectureDeckPdfSource | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!enabled || !params.deckUrl?.trim()) {
      setSource(null)
      setError("")
      setLoading(false)
      return
    }

    const resolved = resolveLectureDeckUrl(params.deckUrl)
    if (!resolved) {
      setSource(null)
      setError("Slide deck URL is unavailable.")
      setLoading(false)
      return
    }

    const needsPrefetch =
      resolved.includes("/api/student/lectures/") ||
      resolved.includes("/api/instructor/") ||
      resolved.startsWith(API_BASE_URL)

    setLoading(true)
    setError("")

    void (async () => {
      let result: LoadLectureDeckResult
      if (needsPrefetch) {
        result = await loadLectureDeckPdf({
          url: resolved,
          headers: params.headers,
          cacheKey: params.cacheKey,
        })
      } else {
        result = { ok: true, source: { uri: resolved, headers: params.headers } }
      }
      if (cancelled) return
      if (result.ok) {
        setSource(result.source)
        setError("")
      } else {
        setSource(null)
        setError(result.message)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, params.cacheKey, params.deckUrl, params.headers, retryNonce])

  return {
    source,
    loading,
    error,
    retryNonce,
    retry: () => setRetryNonce((value) => value + 1),
  }
}

export function buildFacultyDeckRequest(
  pdfUrl: string | null | undefined,
  scope?: { instructorId: number; courseId?: number | null },
): { uri: string; headers?: Record<string, string> } | null {
  return buildAuthenticatedDeckSource(pdfUrl, scope)
}
