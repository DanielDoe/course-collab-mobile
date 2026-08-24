import type { StudentContextPayload } from "../student-context-api"
import {
  minimizeStudentContextForExternalAi,
  type ExternalAiContextLevel,
  type ExternalAiStudentContext,
} from "../cora-privacy-minimization"
import type { CoraServerPrivacySettings } from "../cora-privacy-api"
import { CORA_CONTEXT_SOURCES } from "./data-scope"
import type { CoraContextSource, CoraRole } from "./types"

/**
 * Defense-in-depth: strip context fields that must never reach an external AI provider.
 * Primary enforcement remains on permission-aware backend APIs.
 */
export function filterStudentContextForCora(
  context: StudentContextPayload | ExternalAiStudentContext | null | undefined,
  level: ExternalAiContextLevel = "learning",
  privacy?: Partial<CoraServerPrivacySettings>,
): ExternalAiStudentContext | null {
  return minimizeStudentContextForExternalAi(context, level, privacy)
}

export function contextSourcesForRole(role: CoraRole): CoraContextSource[] {
  return CORA_CONTEXT_SOURCES[role]
}

export function contextSourceLabels(sources: CoraContextSource[]): string[] {
  return sources.map((s) => s.replace(/_/g, " "))
}

/**
 * Least-context retrieval: only the sources this role may use.
 * Never merge another role's architecture, admin APIs, or schemas.
 */
export function leastContextSourcesForRole(role: CoraRole, needed?: CoraContextSource[]): CoraContextSource[] {
  const allowed = new Set(CORA_CONTEXT_SOURCES[role])
  if (!needed?.length) return CORA_CONTEXT_SOURCES[role]
  return needed.filter((source) => allowed.has(source))
}
