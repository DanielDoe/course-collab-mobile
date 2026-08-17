/**
 * Client mirror of web `lib/cora/models`.
 * Mobile never selects a provider model — the server router is authoritative.
 */

export type CoraModelProfile =
  | "lite"
  | "fast"
  | "standard"
  | "tutor"
  | "coding"
  | "vision"
  | "agent"
  | "long_context"
  | "reasoning"
  | "advanced_reasoning"
  | "verifier"
  | "embedding"

export type CoraPublicModeLabel = "Cora" | "Cora Lite" | "Advanced Reasoning"

export type CoraComplexityLevel = "LOW" | "NORMAL" | "HIGH" | "VERY_HIGH"

export type PublicCoraRoutingMeta = {
  profile: CoraModelProfile
  publicMode: CoraPublicModeLabel
  complexity?: string
  reason?: string
}

export type CoraUiAction = {
  label: string
  route?: string
  actionId?: string
}

export type CoraUiPayload =
  | { type: "text_response"; message: string }
  | {
      type: "confirmation"
      message: string
      actionId: string
      preview: Record<string, unknown>
      actions: CoraUiAction[]
    }
  | {
      type: "created_resource"
      message: string
      resource: { type: string; id: string | number; title?: string }
      actions?: CoraUiAction[]
    }
  | { type: "walkthrough"; title: string; objective?: string; steps: unknown[] }
  | { type: "assessment_preview"; message: string; count: number; data: unknown }
  | { type: "question_preview"; message: string; count: number; data: unknown }
  | { type: "analytics"; message: string; data: unknown }
  | { type: "progress_summary"; message: string; data: unknown }
  | { type: "error"; message: string; code?: string }
  | { type: "permission_denied"; message: string }
  | { type: "insufficient_credits"; message: string; needed?: number; available?: number }

export type CoraWalkthroughStep = {
  id: string
  title: string
  explanation: string
  equation?: string
  code?: string
  visual?: string
  hint?: string
  checkpoint?: string
  expectedAnswer?: string
}

export type CoraWalkthrough = {
  title: string
  objective: string
  givens: string[]
  concepts: string[]
  steps: CoraWalkthroughStep[]
  finalAnswer?: string
  commonMistakes: string[]
  followUps: string[]
}
