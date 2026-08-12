import type { CoraDomain, CoraHintLevel } from "./cora-types"

export const CORA_NAME = "Cora"
export const CORA_WORDMARK = "cora"
export const CORA_TAGLINE = "Course + Core"
export const CORA_HEADER_TAGLINE = "Your Personal Learning Intelligence"
export const CORA_SUBTITLE = "Don't just get the answer. Learn every step."
export const CORA_WORKSPACE_SUBTITLE = "Ask · explore · build understanding"
export const CORA_IMMERSIVE_SUBTITLE = "Immersive learning"
export const CORA_SOLVE_LABEL = `✨ Solve with ${CORA_NAME}`
export const CORA_LOADING_LABEL = "Building your workspace…"
export const CORA_AI_BADGE = "Cora AI"

/** Web CoraBrand gradient wordmark */
export const CORA_WORDMARK_GRADIENT = ["#9b87f5", "#5b8def", "#5ec8f8"] as const

/** Web user message bubble */
export const CORA_USER_BUBBLE_GRADIENT = ["#582c83", "#6b3d96"] as const

/** Web AI avatar + primary CTAs */
export const CORA_AI_AVATAR_GRADIENT = ["#8b5cf6", "#4f46e5"] as const

/** Workspace canvas (web: #fafbfc) */
export const CORA_WORKSPACE_CANVAS = "#fafbfc"

export const CORA_HINT_LABELS: Record<CoraHintLevel, string> = {
  almost: "Almost there",
  step: "Show this step",
  solution: "Reveal solution",
}

export const CORA_DOMAIN_GRADIENT: Record<CoraDomain, [string, string]> = {
  circuit: ["#10b981", "#2dd4bf"],
  coding: ["#8b5cf6", "#6366f1"],
  math: ["#0ea5e9", "#22d3ee"],
  generic: ["#64748b", "#94a3b8"],
}

export const CORA_BUTTON_GRADIENT: [string, string] = ["#7c3aed", "#4f46e5"]
