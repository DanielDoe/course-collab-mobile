import type { ChatMessage } from "../ai-tutor-api"
import type { CoraActionProposal, CoraConfirmActionResult } from "./types"

/** Attach signed proposals from the agent stream onto an assistant message. */
export function withMessageProposals(
  messages: ChatMessage[],
  assistantId: string,
  proposals: CoraActionProposal[] | undefined,
): ChatMessage[] {
  if (!proposals?.length) return messages
  return messages.map((m) =>
    m.id === assistantId
      ? {
          ...m,
          proposals,
          proposalStatusById: { ...(m.proposalStatusById ?? {}) },
          proposalResultById: { ...(m.proposalResultById ?? {}) },
        }
      : m,
  )
}

export function markProposalConfirming(
  messages: ChatMessage[],
  messageId: string,
  actionId: string,
): ChatMessage[] {
  return messages.map((m) =>
    m.id === messageId
      ? {
          ...m,
          proposalStatusById: {
            ...(m.proposalStatusById ?? {}),
            [actionId]: "confirming",
          },
        }
      : m,
  )
}

export function markProposalResult(
  messages: ChatMessage[],
  messageId: string,
  actionId: string,
  result: CoraConfirmActionResult,
): ChatMessage[] {
  return messages.map((m) => {
    if (m.id !== messageId) return m
    // Keep the proposal in-thread as an audit receipt; never remove on success
    // so revisit shows Completed + Open module (Confirm is gated by status).
    return {
      ...m,
      proposalStatusById: {
        ...(m.proposalStatusById ?? {}),
        [actionId]: result.success ? "done" : "error",
      },
      proposalResultById: {
        ...(m.proposalResultById ?? {}),
        [actionId]: result,
      },
    }
  })
}

/** Guard — completed tasks must never re-fire Confirm. */
export function isProposalConfirmable(
  message: ChatMessage | undefined,
  actionId: string,
): boolean {
  if (!message) return false
  const status = message.proposalStatusById?.[actionId]
  if (status === "done" || status === "confirming") return false
  if (message.proposalResultById?.[actionId]?.success) return false
  return (message.proposals ?? []).some((p) => p.actionId === actionId)
}

export function markProposalError(
  messages: ChatMessage[],
  messageId: string,
  actionId: string,
): ChatMessage[] {
  return messages.map((m) =>
    m.id === messageId
      ? {
          ...m,
          proposalStatusById: {
            ...(m.proposalStatusById ?? {}),
            [actionId]: "error",
          },
        }
      : m,
  )
}

export function removeProposal(
  messages: ChatMessage[],
  messageId: string,
  actionId: string,
): ChatMessage[] {
  return messages.map((m) =>
    m.id === messageId
      ? {
          ...m,
          proposals: (m.proposals ?? []).filter((p) => p.actionId !== actionId),
        }
      : m,
  )
}
