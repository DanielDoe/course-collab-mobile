import AsyncStorage from "@react-native-async-storage/async-storage"
import type { QueryClient } from "@tanstack/react-query"
import { logQueryDiag } from "./diagnostics"
import { canPersistQueryKey, isQueryPersistStorageKey, persistStorageKey } from "./persist-policy"
import { sanitizePersistedQueryData } from "./persist-sanitize"
import type { QueryScope } from "./scope"

type PersistedQuery = {
  queryKey: unknown[]
  data: unknown
  dataUpdatedAt: number
}

type PersistBucket = {
  scope: string
  savedAt: number
  queries: PersistedQuery[]
}

const MAX_AGE_MS = 24 * 60 * 60_000

export async function hydratePersistedQueries(queryClient: QueryClient, scope: QueryScope): Promise<number> {
  const key = persistStorageKey(scope.portal, scope.userId, scope.courseId)
  try {
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return 0
    const bucket = JSON.parse(raw) as PersistBucket
    if (!bucket?.queries || Date.now() - bucket.savedAt > MAX_AGE_MS) {
      await AsyncStorage.removeItem(key)
      return 0
    }
    let restored = 0
    for (const entry of bucket.queries) {
      if (!Array.isArray(entry.queryKey) || !canPersistQueryKey(entry.queryKey)) continue
      if (entry.queryKey[0] !== scope.portal || entry.queryKey[2] !== scope.userId) continue
      if (String(entry.queryKey[3] ?? "none") !== String(scope.courseId ?? "none")) continue
      queryClient.setQueryData(entry.queryKey, entry.data)
      restored += 1
    }
    logQueryDiag({ event: "persist_read", keyHint: key, durationMs: restored })
    return restored
  } catch {
    return 0
  }
}

export async function persistScopedQueries(queryClient: QueryClient, scope: QueryScope): Promise<void> {
  const key = persistStorageKey(scope.portal, scope.userId, scope.courseId)
  const queries: PersistedQuery[] = []
  for (const query of queryClient.getQueryCache().getAll()) {
    if (!canPersistQueryKey(query.queryKey)) continue
    if (query.state.data == null) continue
    if (query.queryKey[0] !== scope.portal || query.queryKey[2] !== scope.userId) continue
    queries.push({
      queryKey: [...query.queryKey],
      data: sanitizePersistedQueryData(query.queryKey, query.state.data),
      dataUpdatedAt: query.state.dataUpdatedAt,
    })
  }
  const bucket: PersistBucket = {
    scope: `${scope.portal}:${scope.userId}:${scope.courseId ?? "none"}`,
    savedAt: Date.now(),
    queries,
  }
  await AsyncStorage.setItem(key, JSON.stringify(bucket))
  logQueryDiag({ event: "persist_write", keyHint: key, durationMs: queries.length })
}

export async function clearPersistedQueryCache(scope?: QueryScope): Promise<void> {
  if (scope) {
    await AsyncStorage.removeItem(persistStorageKey(scope.portal, scope.userId, scope.courseId))
    return
  }
  const keys = await AsyncStorage.getAllKeys()
  const ours = keys.filter(isQueryPersistStorageKey)
  if (ours.length > 0) await AsyncStorage.multiRemove(ours)
}

export async function clearPersistedQueryCacheForUser(portal: string, userId: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys()
  const prefix = `cc.query.v1.${portal}.${userId}.`
  const ours = keys.filter((key) => key.startsWith(prefix))
  if (ours.length > 0) await AsyncStorage.multiRemove(ours)
}
