import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { logQueryDiag } from "./diagnostics"
import { isStaleMutation, nextMutationVersion } from "./versioning"

export type OptimisticContext<TData> = {
  previous: TData | undefined
  version: number
}

export function snapshotQuery<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
): TData | undefined {
  return queryClient.getQueryData<TData>(queryKey)
}

export function rollbackQuery<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  previous: TData | undefined,
): void {
  queryClient.setQueryData(queryKey, previous)
  logQueryDiag({ event: "rollback", keyHint: String(queryKey[1] ?? "query") })
}

export function beginOptimistic<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  resourceKey: string,
  updater: (current: TData | undefined) => TData,
): OptimisticContext<TData> {
  const previous = snapshotQuery<TData>(queryClient, queryKey)
  const version = nextMutationVersion(resourceKey)
  queryClient.setQueryData<TData>(queryKey, updater(previous))
  return { previous, version }
}

export function commitIfCurrent<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  resourceKey: string,
  version: number,
  data: TData,
): boolean {
  if (isStaleMutation(resourceKey, version)) return false
  queryClient.setQueryData(queryKey, data)
  return true
}

export function rollbackIfCurrent<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  resourceKey: string,
  version: number,
  previous: TData | undefined,
): void {
  if (isStaleMutation(resourceKey, version)) return
  rollbackQuery(queryClient, queryKey, previous)
}
