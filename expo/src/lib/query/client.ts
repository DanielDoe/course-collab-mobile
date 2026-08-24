import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { logQueryDiag, queryKeyHint } from "./diagnostics"
import { GC_MS, STALE_MS } from "./stale"

let client: QueryClient | null = null

function attachDiagnostics(queryClient: QueryClient): void {
  if (!__DEV__) return

  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "added") {
      const state = event.query.state
      logQueryDiag({
        event: state.dataUpdatedAt > 0 ? "cache_hit" : "cache_miss",
        keyHint: queryKeyHint(event.query.queryKey),
      })
    }
    if (event.type === "updated" && event.action.type === "fetch") {
      logQueryDiag({
        event: "revalidate",
        keyHint: queryKeyHint(event.query.queryKey),
      })
    }
  })

  queryClient.getMutationCache().subscribe((event) => {
    if (event.type !== "updated") return
    if (event.action.type === "pending") {
      logQueryDiag({ event: "mutation", keyHint: String(event.mutation.options.mutationKey ?? "mutation") })
    }
    if (event.action.type === "error") {
      logQueryDiag({ event: "rollback", keyHint: String(event.mutation.options.mutationKey ?? "mutation") })
    }
  })
}

export function createQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: STALE_MS.normal,
        gcTime: GC_MS.persistable,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        networkMode: "offlineFirst",
      },
      mutations: {
        retry: 0,
        networkMode: "online",
      },
    },
  })
  attachDiagnostics(queryClient)
  return queryClient
}

export function getQueryClient(): QueryClient {
  if (!client) {
    client = createQueryClient()
  }
  return client
}

export function resetQueryClient(): QueryClient {
  client?.clear()
  client = createQueryClient()
  return client
}
