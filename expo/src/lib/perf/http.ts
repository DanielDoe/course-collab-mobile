import { PERF_BUDGETS } from "./budgets"

export type HttpDiag = {
  method: string
  route: string
  status: number
  durationMs: number
  payloadBytes: number
}

function safeRoute(path: string): string {
  const trimmed = path.trim()
  const q = trimmed.indexOf("?")
  return q === -1 ? trimmed : trimmed.slice(0, q)
}

export function classifyHttpBudget(diag: HttpDiag): "ok" | "slow" | "large" {
  if (diag.durationMs > PERF_BUDGETS.apiMs) return "slow"
  if (diag.payloadBytes > PERF_BUDGETS.payloadBytes) return "large"
  return "ok"
}

export function logHttpDiag(diag: HttpDiag): void {
  if (!__DEV__) return
  const flag = classifyHttpBudget(diag)
  const parts = [
    "[http]",
    diag.method.toUpperCase(),
    safeRoute(diag.route),
    String(diag.status),
    `${Math.round(diag.durationMs)}ms`,
    `${diag.payloadBytes}B`,
  ]
  if (flag !== "ok") parts.push(flag === "slow" ? "SLOW" : "LARGE")
  console.log(parts.join(" "))
}

export function observeHttpResponse(input: {
  method?: string
  path: string
  status: number
  startedAt: number
  payloadBytes: number
}): HttpDiag {
  const diag: HttpDiag = {
    method: input.method ?? "GET",
    route: input.path,
    status: input.status,
    durationMs: Date.now() - input.startedAt,
    payloadBytes: input.payloadBytes,
  }
  logHttpDiag(diag)
  return diag
}
