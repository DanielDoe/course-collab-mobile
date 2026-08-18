import { documentDirectory, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy"
import { API_BASE_URL } from "../constants"
import {
  LEGAL_CONTENT_FALLBACK,
  LEGAL_CONTENT_FALLBACK_VERSION,
  getFallbackLegalDocument,
} from "../content/legal/fallback"
import type { LegalContentCatalog, LegalDocument, LegalDocumentId } from "../content/legal/types"
import { isLegalDocumentId } from "../content/legal/types"

export const LEGAL_CONTENT_API_PATH = "/api/compliance/legal"
const CACHE_FILE = documentDirectory ? `${documentDirectory}coursecollab-legal-cache.json` : null

type LegalCacheEnvelope = {
  version: string
  fetchedAt: string
  catalog: LegalContentCatalog
}

function isCatalog(value: unknown): value is LegalContentCatalog {
  if (!value || typeof value !== "object") return false
  const record = value as LegalContentCatalog
  return (
    typeof record.version === "string" &&
    typeof record.updated === "string" &&
    typeof record.documents === "object" &&
    record.documents !== null
  )
}

async function readCache(): Promise<LegalCacheEnvelope | null> {
  if (!CACHE_FILE) return null
  try {
    const raw = await readAsStringAsync(CACHE_FILE)
    const parsed = JSON.parse(raw) as LegalCacheEnvelope
    if (!parsed?.catalog || !isCatalog(parsed.catalog)) return null
    return parsed
  } catch {
    return null
  }
}

async function writeCache(catalog: LegalContentCatalog): Promise<void> {
  if (!CACHE_FILE) return
  const envelope: LegalCacheEnvelope = {
    version: catalog.version,
    fetchedAt: new Date().toISOString(),
    catalog,
  }
  await writeAsStringAsync(CACHE_FILE, JSON.stringify(envelope))
}

export async function fetchLegalContentCatalog(): Promise<LegalContentCatalog> {
  const url = `${API_BASE_URL}${LEGAL_CONTENT_API_PATH}`
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
  if (!response.ok) {
    throw new Error(`Legal content request failed (${response.status})`)
  }
  const body = (await response.json()) as unknown
  if (!isCatalog(body)) {
    throw new Error("Legal content response was malformed.")
  }
  await writeCache(body)
  return body
}

export async function loadLegalDocument(id: LegalDocumentId): Promise<{
  document: LegalDocument
  source: "network" | "cache" | "fallback"
  version: string
}> {
  if (!isLegalDocumentId(id)) {
    throw new Error(`Unknown legal document: ${id}`)
  }

  try {
    const catalog = await fetchLegalContentCatalog()
    return {
      document: catalog.documents[id],
      source: "network",
      version: catalog.version,
    }
  } catch {
    const cached = await readCache()
    if (cached?.catalog.documents[id]) {
      return {
        document: cached.catalog.documents[id],
        source: "cache",
        version: cached.catalog.version,
      }
    }
  }

  return {
    document: getFallbackLegalDocument(id),
    source: "fallback",
    version: LEGAL_CONTENT_FALLBACK_VERSION,
  }
}

export async function prefetchLegalContentCatalog(): Promise<void> {
  try {
    await fetchLegalContentCatalog()
  } catch {
    /* best-effort warm cache */
  }
}
