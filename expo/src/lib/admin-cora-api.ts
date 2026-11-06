import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import { apiErrorMessage } from "./http-errors"
import type { ChatMessage } from "./ai-tutor-api"
import type { CoraActionProposal } from "./cora/types"
import { parseCoraChatMeta } from "./cora/models"
import type { AdminSession } from "./session"
import { adminAuthenticatedHeaders } from "./admin-session-headers"
import { applyCoraOutputGate, evaluateCoraSecurityTurn, sanitizeCoraUserError } from "./cora-security"

export type AdminCoraChatResponse = {
  reply: string
  restricted?: boolean
  proposals?: CoraActionProposal[]
  plans?: unknown[]
  toolCalls?: unknown[]
  contextSyncedAt?: string
  error?: string
  scopeRedirect?: boolean
  scopeDecision?: string
  scopeEventId?: number | null
  offerScopeFeedback?: boolean
  creditsCharged?: number
  clearanceDenied?: boolean
  profile?: import("./cora/models").CoraModelProfile
  publicMode?: import("./cora/models").CoraPublicModeLabel
  ui?: import("./cora/models").CoraUiPayload
  routing?: import("./cora/models").PublicCoraRoutingMeta
}

/** Admin Cora chat — returns signed proposals for confirmation cards. */
export async function sendAdminCoraMessage(params: {
  session: AdminSession
  message: string
  conversationHistory: ChatMessage[]
  institutionId?: number | null
  signal?: AbortSignal
  confirmScopeRelated?: boolean
  declaredAcademicContext?: string | null
}): Promise<AdminCoraChatResponse> {
  const security = evaluateCoraSecurityTurn({
    actor: "admin",
    message: params.message,
    history: params.conversationHistory,
  })
  if (security.action !== "allow" && security.reply) {
    return { reply: applyCoraOutputGate(security.reply, "admin") }
  }
  const url = `${API_BASE_URL}/api/admin/cora/chat`
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: await adminAuthenticatedHeaders(params.session.id),
    body: JSON.stringify({
      message: params.message,
      conversationHistory: params.conversationHistory.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      ...(params.institutionId != null ? { institutionId: params.institutionId } : {}),
      ...(params.confirmScopeRelated ? { confirmScopeRelated: true } : {}),
      ...(params.declaredAcademicContext
        ? { declaredAcademicContext: params.declaredAcademicContext }
        : {}),
    }),
    signal: params.signal,
  })
  const text = await response.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { error: text }
    }
  }
  if (!response.ok) {
    throw new ApiError(sanitizeCoraUserError(apiErrorMessage(parsed, response.status)), response.status, parsed)
  }
  const raw = (parsed ?? {}) as AdminCoraChatResponse
  const meta = parseCoraChatMeta(raw as unknown as Record<string, unknown>)
  return {
    ...raw,
    reply: applyCoraOutputGate(raw.reply ?? "", "admin"),
    toolCalls: undefined,
    profile: meta.profile,
    publicMode: meta.publicMode,
    routing: meta.routing,
    ...(meta.ui ? { ui: meta.ui } : {}),
  }
}
