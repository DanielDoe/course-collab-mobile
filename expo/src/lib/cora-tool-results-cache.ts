import { documentDirectory, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy"

export type CoraToolCacheKey = {
  toolId: string
  variant: string
  resourceKey: string
  contentHash: string
}

export type CoraToolCacheEntry = CoraToolCacheKey & {
  result: string
  sourceLabel: string
  generatedAt: string
  courseId?: number | null
}

type CacheStore = {
  version: 1
  entries: Record<string, CoraToolCacheEntry>
}

const STORE_VERSION = 1 as const
const MAX_ENTRIES = 120

function cacheFilePath(): string | null {
  if (!documentDirectory) return null
  return `${documentDirectory}cora-tool-results.json`
}

function entryId(key: CoraToolCacheKey): string {
  return `${key.toolId}:${key.variant}:${key.resourceKey}:${key.contentHash}`
}

async function readStore(): Promise<CacheStore> {
  const path = cacheFilePath()
  if (!path) return { version: STORE_VERSION, entries: {} }
  try {
    const raw = await readAsStringAsync(path)
    const parsed = JSON.parse(raw) as Partial<CacheStore>
    if (parsed.version !== STORE_VERSION || !parsed.entries || typeof parsed.entries !== "object") {
      return { version: STORE_VERSION, entries: {} }
    }
    return { version: STORE_VERSION, entries: parsed.entries }
  } catch {
    return { version: STORE_VERSION, entries: {} }
  }
}

async function writeStore(store: CacheStore): Promise<void> {
  const path = cacheFilePath()
  if (!path) return
  const keys = Object.keys(store.entries)
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys
      .map((id) => store.entries[id]!)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, MAX_ENTRIES)
    store.entries = Object.fromEntries(sorted.map((entry) => [entryId(entry), entry]))
  }
  try {
    await writeAsStringAsync(path, JSON.stringify(store))
  } catch {
    /* best-effort cache */
  }
}

/** Simple stable hash for cache keys (not cryptographic). */
export function hashToolContent(input: string): string {
  let hash = 0
  const normalized = input.trim().replace(/\s+/g, " ")
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export async function getCachedToolResult(key: CoraToolCacheKey): Promise<CoraToolCacheEntry | null> {
  const store = await readStore()
  return store.entries[entryId(key)] ?? null
}

/** Find a cached result for the same tool + resource even if content hash drifted slightly. */
export async function findLatestCachedToolResult(
  toolId: string,
  variant: string,
  resourceKey: string,
): Promise<CoraToolCacheEntry | null> {
  const store = await readStore()
  const prefix = `${toolId}:${variant}:${resourceKey}:`
  const matches = Object.entries(store.entries)
    .filter(([id]) => id.startsWith(prefix))
    .map(([, entry]) => entry)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
  return matches[0] ?? null
}

export async function setCachedToolResult(
  key: CoraToolCacheKey,
  result: string,
  meta: { sourceLabel: string; courseId?: number | null },
): Promise<void> {
  const trimmed = result.trim()
  if (!trimmed) return
  const store = await readStore()
  const id = entryId(key)
  store.entries[id] = {
    ...key,
    result: trimmed,
    sourceLabel: meta.sourceLabel,
    courseId: meta.courseId ?? null,
    generatedAt: new Date().toISOString(),
  }
  await writeStore(store)
}

export async function listCachedToolResultsForTool(toolId: string): Promise<CoraToolCacheEntry[]> {
  const store = await readStore()
  return Object.values(store.entries)
    .filter((entry) => entry.toolId === toolId)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
}
