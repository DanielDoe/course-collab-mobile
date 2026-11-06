import { PERF_BUDGETS } from "./budgets"

export type CoraTurnDiag = {
  route: string
  durationMs: number
  status?: number
  payloadBytes?: number
  creditsCharged?: number
  inputTokens?: number
  outputTokens?: number
  toolRounds?: number
  model?: string
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

/** Pull timing/cost fields only — never log prompts, answers, or tool payloads. */
export function coraTurnFromResponse(data: Record<string, unknown> | null | undefined): Partial<CoraTurnDiag> {
  if (!data) return {}
  const routing = data.routing && typeof data.routing === "object" ? (data.routing as Record<string, unknown>) : null
  return {
    creditsCharged: num(data.creditsCharged ?? data.credits_charged),
    inputTokens: num(data.inputTokens ?? data.input_tokens ?? data.promptTokens),
    outputTokens: num(data.outputTokens ?? data.output_tokens ?? data.completionTokens),
    toolRounds: num(data.toolRounds ?? data.tool_rounds ?? data.toolCallCount),
    model:
      typeof data.profile === "string"
        ? data.profile
        : typeof routing?.profile === "string"
          ? routing.profile
          : undefined,
  }
}

export function logCoraTurn(diag: CoraTurnDiag): void {
  if (!__DEV__) return
  const parts = [
    "[cora]",
    diag.route,
    `${Math.round(diag.durationMs)}ms`,
  ]
  if (diag.status != null) parts.push(`status=${diag.status}`)
  if (diag.payloadBytes != null) parts.push(`${diag.payloadBytes}B`)
  if (diag.model) parts.push(`model=${diag.model}`)
  if (diag.creditsCharged != null) parts.push(`credits=${diag.creditsCharged}`)
  if (diag.inputTokens != null) parts.push(`in=${diag.inputTokens}`)
  if (diag.outputTokens != null) parts.push(`out=${diag.outputTokens}`)
  if (diag.toolRounds != null) parts.push(`tools=${diag.toolRounds}`)
  if (diag.durationMs > PERF_BUDGETS.coraTurnMs) parts.push("SLOW")
  console.log(parts.join(" "))
}
