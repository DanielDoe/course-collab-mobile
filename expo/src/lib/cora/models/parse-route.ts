import { isCoraModelProfile, publicCoraModeLabel } from "./public-label"
import type { CoraModelProfile, CoraPublicModeLabel, CoraUiPayload, PublicCoraRoutingMeta } from "./types"

const UI_TYPES = new Set([
  "text_response",
  "confirmation",
  "created_resource",
  "walkthrough",
  "assessment_preview",
  "question_preview",
  "analytics",
  "progress_summary",
  "error",
  "permission_denied",
  "insufficient_credits",
])

export function parsePublicCoraRouting(raw: unknown, liteMode?: boolean): PublicCoraRoutingMeta | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const profile = isCoraModelProfile(row.profile) ? row.profile : liteMode ? "lite" : "standard"
  const publicMode =
    row.publicMode === "Cora" || row.publicMode === "Cora Lite" || row.publicMode === "Advanced Reasoning"
      ? (row.publicMode as CoraPublicModeLabel)
      : publicCoraModeLabel({ profile, liteMode })
  return {
    profile,
    publicMode,
    complexity: typeof row.complexity === "string" ? row.complexity : undefined,
    reason: typeof row.reason === "string" ? row.reason : undefined,
  }
}

export function parseCoraUiPayload(raw: unknown): CoraUiPayload | null {
  if (!raw || typeof raw !== "object") return null
  const type = (raw as { type?: unknown }).type
  if (typeof type !== "string" || !UI_TYPES.has(type)) return null
  return raw as CoraUiPayload
}

export function parseCoraChatMeta(data: Record<string, unknown>): {
  profile: CoraModelProfile
  publicMode: CoraPublicModeLabel
  routing: PublicCoraRoutingMeta
  ui: CoraUiPayload | null
  liteMode: boolean
} {
  const liteMode = data.coraMode === "lite" || data.profile === "lite"
  const routing =
    parsePublicCoraRouting(data.routing, liteMode) ??
    parsePublicCoraRouting(
      {
        profile: data.profile,
        publicMode: data.publicMode,
      },
      liteMode,
    ) ?? {
      profile: liteMode ? "lite" : "standard",
      publicMode: publicCoraModeLabel({ liteMode }),
    }
  return {
    profile: routing.profile,
    publicMode: routing.publicMode,
    routing,
    ui: parseCoraUiPayload(data.ui),
    liteMode,
  }
}
