/** Cora academic-purpose scope outcomes — consume server decisions; do not classify on-device. */

export type CoraScopeDecision =
  | "ALLOW"
  | "ALLOW_WITH_CONTEXT"
  | "ASK_CONTEXT"
  | "REDIRECT"
  | "BLOCK_INTEGRITY"
  | "DENY_PERMISSION"

export type CoraScopeFeedbackState = {
  eventId: number | null
  originalMessage: string
}

export type CoraChatOutcome =
  | {
      kind: "assistant"
      text: string
      creditsCharged?: number
      proposals?: import("../types").CoraActionProposal[]
    }
  | {
      kind: "scope_redirect"
      text: string
      eventId: number | null
      offerFeedback: boolean
      originalUserMessage: string
      creditsCharged: 0
    }
  | { kind: "integrity_block"; text: string; assessmentTitle?: string }
  | { kind: "permission_deny"; text: string }
  | { kind: "error"; message: string }

export function mapStudentChatResponse(
  data: Record<string, unknown>,
  originalUserMessage: string,
): CoraChatOutcome {
  if (data.scopeRedirect) {
    return {
      kind: "scope_redirect",
      text: String(data.response ?? ""),
      eventId: data.scopeEventId != null ? Number(data.scopeEventId) : null,
      offerFeedback: Boolean(data.offerScopeFeedback),
      originalUserMessage,
      creditsCharged: 0,
    }
  }
  if (data.examBlocked || data.assessmentIntegrity) {
    return {
      kind: "integrity_block",
      text: String(data.response ?? ""),
      assessmentTitle: data.assessmentTitle ? String(data.assessmentTitle) : undefined,
    }
  }
  if (data.clearanceDenied || data.readOnlyRefusal) {
    return { kind: "permission_deny", text: String(data.response ?? "") }
  }
  if (data.accessDenied || data.rbacBlocked) {
    return {
      kind: "permission_deny",
      text: String(
        data.blockReason ?? data.response ?? "Cora cannot access that with your current permissions.",
      ),
    }
  }
  const proposals = Array.isArray(data.proposals)
    ? (data.proposals as import("../types").CoraActionProposal[])
    : undefined
  return {
    kind: "assistant",
    text: String(data.response ?? ""),
    creditsCharged: data.creditsCharged != null ? Number(data.creditsCharged) : undefined,
    proposals,
  }
}

/** Faculty/admin responses use `reply` instead of `response`. */
export function mapFacultyOrAdminChatResponse(
  data: Record<string, unknown>,
  originalUserMessage: string,
): CoraChatOutcome {
  const normalized = {
    ...data,
    response: data.response ?? data.reply,
  }
  if (data.scopeRedirect) {
    return {
      kind: "scope_redirect",
      text: String(normalized.response ?? ""),
      eventId: data.scopeEventId != null ? Number(data.scopeEventId) : null,
      offerFeedback: Boolean(data.offerScopeFeedback),
      originalUserMessage,
      creditsCharged: 0,
    }
  }
  return mapStudentChatResponse(normalized, originalUserMessage)
}
