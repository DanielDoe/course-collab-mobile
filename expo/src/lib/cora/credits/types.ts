import type { CoraMode } from "./economy"

export type CoraBalanceMonth = {
  creditsUsed: number
  interactions: number
  agentRuns: number
  tokensProcessed: number
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningTokens: number
}

export type CoraBalance = {
  credits: number
  includedBalance: number
  purchasedBalance: number
  reservedCredits: number
  periodKey: string
  lifetimeCreditsUsed: number
  membershipTier: string | null
  lowBalanceFraction?: number
  coraMode: CoraMode
  isLow: boolean
  month: CoraBalanceMonth
  includedCapHint?: number
}

export type CoraActivityRow = {
  id: number
  feature: string
  /** Human-friendly label when server provides one (tool/operation). */
  title?: string
  module?: string | null
  operation?: string | null
  toolName?: string | null
  model: string | null
  provider?: string | null
  profile?: string | null
  creditsCharged: number
  tokens: {
    input: number
    cachedInput: number
    output: number
    reasoning: number
    total: number
  }
  agentRunId?: string | null
  createdAt: string
  latencyMs: number | null
  status?: string | null
  providerCostHidden?: boolean
}

export type CoraActivityPage = {
  activity: CoraActivityRow[]
  hasMore: boolean
  nextOffset: number
  total: number
  totalPages: number
  page: number
  limit: number
  offset: number
  query?: string | null
}

export type CoraCreditPack = {
  id: string
  audience: "student" | "instructor"
  name: string
  credits: number
  priceInCents: number
  priceDisplay: string
  description: string
  perThousandDisplay: string
}

export type CoraExpensiveTaskPayload = {
  needsConfirmation: true
  expensiveTask: true
  estimateLow: number
  estimateHigh: number
  estimatedCredits: number
  creditsRemaining: number
  threshold: number
  response?: string
  message?: string
}
