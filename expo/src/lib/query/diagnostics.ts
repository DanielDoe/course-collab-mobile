export type QueryDiagEvent =
  | "cache_hit"
  | "cache_miss"
  | "revalidate"
  | "mutation"
  | "rollback"
  | "dedupe"
  | "persist_write"
  | "persist_read"
  | "scope_clear"

type DiagPayload = {
  event: QueryDiagEvent
  durationMs?: number
  keyHint?: string
}

function keyHint(queryKey: readonly unknown[]): string {
  return queryKey
    .filter((part) => typeof part === "string" || typeof part === "number")
    .slice(0, 6)
    .join("/")
}

export function queryKeyHint(queryKey: readonly unknown[]): string {
  return keyHint(queryKey)
}

export function logQueryDiag(payload: DiagPayload): void {
  if (!__DEV__) return
  const parts = [`[qc] ${payload.event}`]
  if (payload.keyHint) parts.push(payload.keyHint)
  if (payload.durationMs != null) parts.push(`${Math.round(payload.durationMs)}ms`)
  console.log(parts.join(" "))
}

export function withTimedDiag<T>(event: QueryDiagEvent, keyHintValue: string, work: () => Promise<T>): Promise<T> {
  const started = Date.now()
  return work().finally(() => {
    logQueryDiag({ event, keyHint: keyHintValue, durationMs: Date.now() - started })
  })
}
