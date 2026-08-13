/**
 * Cora transaction plans — multi-step write previews before confirmation.
 * Mirrors web `lib/cora/capabilities/resolve-capabilities.ts`.
 */

export type CoraRiskLevel = "none" | "confirm" | "high" | "forbidden"

export type CoraTransactionOperation = {
  tool: string
  risk: CoraRiskLevel
  payload: Record<string, unknown>
  target?: string
  label?: string
}

export type CoraTransactionPlan = {
  intent: string
  courseId?: number | null
  courseLabel?: string
  operations: CoraTransactionOperation[]
  preview?: {
    title: string
    summary: string
    fields: { label: string; value: string }[]
    confirmLabel: string
  }
  createdAt: string
}

export function createTransactionPlan(input: {
  intent: string
  courseId?: number | null
  courseLabel?: string
  operations: CoraTransactionOperation[]
  preview?: CoraTransactionPlan["preview"]
}): CoraTransactionPlan {
  return {
    intent: input.intent,
    courseId: input.courseId ?? null,
    courseLabel: input.courseLabel,
    operations: input.operations,
    preview: input.preview,
    createdAt: new Date().toISOString(),
  }
}

export function planRiskLevel(plan: CoraTransactionPlan): CoraRiskLevel {
  const order: CoraRiskLevel[] = ["none", "confirm", "high", "forbidden"]
  let max: CoraRiskLevel = "none"
  for (const op of plan.operations) {
    if (order.indexOf(op.risk) > order.indexOf(max)) max = op.risk
  }
  return max
}

export function extractTransactionPlans(text: string): {
  cleanText: string
  plans: CoraTransactionPlan[]
} {
  const marker = "__CORA_TRANSACTION__:"
  const plans: CoraTransactionPlan[] = []
  let clean = text
  let idx = clean.indexOf(marker)
  while (idx >= 0) {
    const start = idx + marker.length
    if (clean[start] !== "{") break
    let depth = 0
    let inString = false
    let escape = false
    let end = -1
    for (let i = start; i < clean.length; i++) {
      const ch = clean[i]!
      if (inString) {
        if (escape) escape = false
        else if (ch === "\\") escape = true
        else if (ch === '"') inString = false
        continue
      }
      if (ch === '"') {
        inString = true
        continue
      }
      if (ch === "{") depth += 1
      else if (ch === "}") {
        depth -= 1
        if (depth === 0) {
          end = i + 1
          break
        }
      }
    }
    if (end < 0) break
    try {
      const parsed = JSON.parse(clean.slice(start, end)) as CoraTransactionPlan
      if (parsed?.intent && Array.isArray(parsed.operations)) plans.push(parsed)
    } catch {
      /* ignore */
    }
    clean = `${clean.slice(0, idx)}${clean.slice(end)}`.trim()
    idx = clean.indexOf(marker)
  }
  return { cleanText: clean.trim(), plans }
}
