import { useCallback, useEffect, useState } from "react"
import type { LegalDocument, LegalDocumentId } from "../content/legal/types"
import { loadLegalDocument } from "../lib/legal-content-api"

type LegalDocumentState = {
  document: LegalDocument | null
  loading: boolean
  error: string | null
  source: "network" | "cache" | "fallback" | null
  refresh: () => void
}

export function useLegalDocument(id: LegalDocumentId): LegalDocumentState {
  const [document, setDocument] = useState<LegalDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<"network" | "cache" | "fallback" | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const refresh = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

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
