import type { CoraModelProfile, CoraPublicModeLabel } from "./types"

const PROFILES = new Set<CoraModelProfile>([
  "lite",
  "fast",
  "standard",
  "tutor",
  "coding",
  "vision",
  "agent",
  "long_context",
  "reasoning",
  "advanced_reasoning",
  "verifier",
  "embedding",
])

export function isCoraModelProfile(value: unknown): value is CoraModelProfile {
  return typeof value === "string" && PROFILES.has(value as CoraModelProfile)
}

/** Student-facing label — never expose provider marketing names. */
export function publicCoraModeLabel(args: {
  profile?: CoraModelProfile | null
  liteMode?: boolean
  coraMode?: "lite" | "premium" | string | null
}): CoraPublicModeLabel {
  if (args.liteMode || args.coraMode === "lite" || args.profile === "lite") return "Cora Lite"
  if (args.profile === "advanced_reasoning" || args.profile === "reasoning") {
    return "Advanced Reasoning"
  }
  return "Cora"
}

/** Drop raw provider IDs so Cora chat never shows gpt- / claude- names. */
export function sanitizeCoraModelName(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined
  if (/\b(gpt-|claude|openai|anthropic|sonnet|haiku|opus)\b/i.test(value)) return undefined
  return value
}

export function publicCoraActivityLabel(args: {
  model?: string | null
  profile?: string | null
  liteMode?: boolean
}): string {
  const profile = isCoraModelProfile(args.profile) ? args.profile : null
  if (profile || args.liteMode) {
    return publicCoraModeLabel({ profile, liteMode: args.liteMode })
  }
  return sanitizeCoraModelName(args.model) ?? "Cora"
}
