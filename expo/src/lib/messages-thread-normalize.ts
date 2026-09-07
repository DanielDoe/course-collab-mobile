import type { MessageRecipient, ThreadSummary } from "./messages-api"

export const UNKNOWN_MESSAGE_PARTICIPANT: MessageRecipient = {
  kind: "student",
  id: 0,
  displayName: "Unknown participant",
  email: null,
  subtitle: "",
}

export function normalizeMessageParticipant(
  participant: ThreadSummary["otherParticipant"] | null | undefined,
): MessageRecipient {
  if (!participant || typeof participant !== "object") return UNKNOWN_MESSAGE_PARTICIPANT
  const displayName = String(participant.displayName ?? "").trim()
  return {
    kind: participant.kind === "instructor" ? "instructor" : "student",
    id: Number.isFinite(participant.id) ? participant.id : 0,
    displayName: displayName || UNKNOWN_MESSAGE_PARTICIPANT.displayName,
    email: participant.email ?? null,
    subtitle: participant.subtitle ?? "",
  }
}

function normalizeLastMessage(last: ThreadSummary["lastMessage"]): ThreadSummary["lastMessage"] {
  if (!last) return null
  return {
    ...last,
    body: last.body == null ? "" : String(last.body),
  }
}

export function normalizeThreadSummary(thread: ThreadSummary): ThreadSummary {
  return {
    ...thread,
    otherParticipant: normalizeMessageParticipant(thread.otherParticipant),
    unreadCount: Number.isFinite(thread.unreadCount) ? thread.unreadCount : 0,
    lastMessage: normalizeLastMessage(thread.lastMessage),
  }
}

export function normalizeThreadSummaries(threads: ThreadSummary[] | null | undefined): ThreadSummary[] {
  return (threads ?? []).map(normalizeThreadSummary)
}
