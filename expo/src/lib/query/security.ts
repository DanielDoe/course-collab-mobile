import type { QueryClient } from "@tanstack/react-query"
import { logQueryDiag } from "./diagnostics"
import { queryKeyPortal, queryKeyUserId } from "./keys"
import { clearPersistedQueryCache, clearPersistedQueryCacheForUser } from "./persist"
import type { QueryScope } from "./scope"
import { resetMutationVersions } from "./versioning"

/** Privileged in-memory data is removed rather than relying on key isolation alone. */
const PRIVILEGED_PREFIXES = [["admin"], ["faculty", "students"], ["faculty", "quizzes"], ["faculty", "homework"]]

export function clearInMemoryQueryCache(queryClient: QueryClient): void {
  queryClient.clear()
  queryClient.getMutationCache().clear()
  resetMutationVersions()
  logQueryDiag({ event: "scope_clear", keyHint: "memory" })
}

export async function clearUserQueryState(
  queryClient: QueryClient,
  session: { portal: string; userId: string } | null,
): Promise<void> {
  clearInMemoryQueryCache(queryClient)
  if (session) {
    await clearPersistedQueryCacheForUser(session.portal, session.userId)
  } else {
    await clearPersistedQueryCache()
  }
}

export function removePrivilegedQueries(queryClient: QueryClient): void {
  for (const query of queryClient.getQueryCache().getAll()) {
    const portal = queryKeyPortal(query.queryKey)
    const privileged = PRIVILEGED_PREFIXES.some((prefix) =>
      prefix.every((part, index) => query.queryKey[index] === part),
    )
    if (portal === "admin" || privileged) {
      queryClient.removeQueries({ queryKey: query.queryKey, exact: true })
    }
  }
}

export function assertQueryMatchesScope(queryKey: readonly unknown[], scope: QueryScope): boolean {
  return queryKey[0] === scope.portal && queryKeyUserId(queryKey) === scope.userId
}
