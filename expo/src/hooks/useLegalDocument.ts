import { useCallback, useEffect, useState } from "react"
import { getFallbackLegalDocument } from "../content/legal/fallback"
import type { LegalDocument, LegalDocumentId } from "../content/legal/types"
import { loadLegalDocument } from "../lib/legal-content-api"

type LegalDocumentState = {
  document: LegalDocument
  loading: boolean
  error: string | null
  source: "network" | "cache" | "fallback" | null
  refresh: () => void
}

/** Bundled copy renders immediately; network/cache refresh never blanks the scroll body. */
export function useLegalDocument(id: LegalDocumentId): LegalDocumentState {
  const [document, setDocument] = useState<LegalDocument>(() => getFallbackLegalDocument(id))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<"network" | "cache" | "fallback">("fallback")
  const [reloadKey, setReloadKey] = useState(0)

  const refresh = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  useEffect(() => {
    setDocument(getFallbackLegalDocument(id))
    setSource("fallback")
    setError(null)
  }, [id])

  useEffect(() => {
    let cancelled = false
    setError(null)
    const showLoadingIndicator = reloadKey > 0
    if (showLoadingIndicator) setLoading(true)

    loadLegalDocument(id)
      .then((result) => {
        if (cancelled) return
        setDocument(result.document)
        setSource(result.source)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Could not load this document.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  return { document, loading, error, source, refresh }
}
