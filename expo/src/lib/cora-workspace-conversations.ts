import type { AiTutorChatThread } from "./ai-tutor-chat-storage"
import { deriveThreadPreview as previewFromMessages, deriveThreadTitle as titleFromMessages, isStorableChatMessage } from "./ai-tutor-chat-storage"
import type { ChatMessage, ChatMessageVersion } from "./ai-tutor-api"
import { normalizeImportedProblem, type CoraImportedProblem } from "./cora-api"

export type WorkspaceConversationMessage = {
  id: string
  role: "ai" | "student"
  content: string
  timestamp?: string
  topic?: string
  importedQuestion?: CoraImportedProblem
  importedQuestionLabel?: string
  versions?: ChatMessageVersion[]
  activeVersionIndex?: number
  /** Confirm cards — must round-trip through cloud sync or refresh wipes them. */
  proposals?: ChatMessage["proposals"]
  proposalStatusById?: ChatMessage["proposalStatusById"]
  proposalResultById?: ChatMessage["proposalResultById"]
}

export type WorkspaceConversation = {
  id: string
  title: string
  messages: WorkspaceConversationMessage[]
  createdAt: string
  lastUpdated: string
  archivedAt?: string
  capabilityId?: string
}

function normalizeDbRole(role: string): "user" | "assistant" {
  if (role === "user" || role === "student") return "user"
  return "assistant"
}

function toDbRole(role: "user" | "assistant"): "student" | "ai" {
  return role === "user" ? "student" : "ai"
}

function mapDbMessage(message: WorkspaceConversationMessage & Record<string, unknown>): ChatMessage {
  const rawImport = message.importedQuestion ?? message.imported_question
  const importedQuestion = rawImport
    ? normalizeImportedProblem(rawImport as CoraImportedProblem)
    : undefined
  const importedQuestionLabel =
    (typeof message.importedQuestionLabel === "string" ? message.importedQuestionLabel : undefined) ??
    (typeof message.imported_question_label === "string" ? message.imported_question_label : undefined)
  const proposals = Array.isArray(message.proposals) ? message.proposals : undefined
  const proposalStatusById =
    message.proposalStatusById && typeof message.proposalStatusById === "object"
      ? (message.proposalStatusById as ChatMessage["proposalStatusById"])
      : undefined
  const proposalResultById =
    message.proposalResultById && typeof message.proposalResultById === "object"
      ? (message.proposalResultById as ChatMessage["proposalResultById"])
      : undefined
  return {
    id: message.id,
    role: normalizeDbRole(String(message.role)),
    content: message.content ?? "",
    ...(importedQuestion ? { importedQuestion } : {}),
    ...(importedQuestionLabel ? { importedQuestionLabel } : {}),
    ...(message.versions?.length ? { versions: message.versions, activeVersionIndex: message.activeVersionIndex } : {}),
    ...(proposals?.length ? { proposals } : {}),
    ...(proposalStatusById ? { proposalStatusById } : {}),
    ...(proposalResultById ? { proposalResultById } : {}),
  }
}

function mergeChatMessage(primary: ChatMessage, fallback: ChatMessage): ChatMessage {
  return {
    ...primary,
    content: primary.content.trim() ? primary.content : fallback.content,
    importedQuestion: primary.importedQuestion ?? fallback.importedQuestion,
    importedQuestionLabel: primary.importedQuestionLabel ?? fallback.importedQuestionLabel,
    versions: primary.versions?.length ? primary.versions : fallback.versions,
    activeVersionIndex: primary.activeVersionIndex ?? fallback.activeVersionIndex,
    // Never drop confirm cards when one side synced without them.
    proposals: primary.proposals?.length ? primary.proposals : fallback.proposals,
    proposalStatusById: {
      ...(fallback.proposalStatusById ?? {}),
      ...(primary.proposalStatusById ?? {}),
    },
    proposalResultById: {
      ...(fallback.proposalResultById ?? {}),
      ...(primary.proposalResultById ?? {}),
    },
  }
}

function mergeThreadMessages(primary: ChatMessage[], secondary: ChatMessage[]): ChatMessage[] {
  const secondaryById = new Map(secondary.map((message) => [message.id, message]))
  const merged = primary.map((message) => {
    const other = secondaryById.get(message.id)
    return other ? mergeChatMessage(message, other) : message
  })
  for (const message of secondary) {
    if (!merged.some((entry) => entry.id === message.id)) {
      merged.push(message)
    }
  }
  merged.sort((a, b) => {
    const aNum = Number(a.id)
    const bNum = Number(b.id)
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum
    return 0
  })
  return merged
}

function mergeThreadsPreferRicher(local: AiTutorChatThread, remote: AiTutorChatThread): AiTutorChatThread {
  const remoteTime = new Date(remote.updatedAt).getTime()
  const localTime = new Date(local.updatedAt).getTime()
  const primary = remoteTime >= localTime ? remote : local
  const secondary = primary === remote ? local : remote
  const messages = mergeThreadMessages(primary.messages, secondary.messages)
  return {
    ...primary,
    messages,
    preview: previewFromMessages(messages),
    title: primary.titleIsCustom ? primary.title : titleFromMessages(messages),
  }
}

export function workspaceConversationToThread(conversation: WorkspaceConversation): AiTutorChatThread {
  const messages = (conversation.messages ?? []).map(mapDbMessage).filter(isStorableChatMessage)
  const updatedAt = conversation.lastUpdated ?? conversation.createdAt ?? new Date().toISOString()
  const createdAt = conversation.createdAt ?? updatedAt
  return {
    id: conversation.id,
    title: conversation.title?.trim() || titleFromMessages(messages),
    preview: previewFromMessages(messages),
    messages,
    createdAt,
    updatedAt,
    ...(conversation.archivedAt ? { archivedAt: conversation.archivedAt } : {}),
    ...(conversation.capabilityId ? { capabilityId: conversation.capabilityId as AiTutorChatThread["capabilityId"] } : {}),
  }
}

export function threadToWorkspaceConversation(thread: AiTutorChatThread): WorkspaceConversation {
  const now = new Date().toISOString()
  return {
    id: thread.id,
    title: thread.title,
    createdAt: thread.createdAt ?? now,
    lastUpdated: thread.updatedAt ?? now,
    ...(thread.archivedAt ? { archivedAt: thread.archivedAt } : {}),
    ...(thread.capabilityId ? { capabilityId: thread.capabilityId } : {}),
    messages: thread.messages.map((message) => ({
      id: message.id,
      role: toDbRole(message.role),
      content: message.content,
      timestamp: message.id.match(/^\d+$/) ? new Date(Number(message.id)).toISOString() : thread.updatedAt,
      ...(message.role === "assistant" ? { topic: "auto-detect" } : {}),
      ...(message.importedQuestion ? { importedQuestion: message.importedQuestion } : {}),
      ...(message.importedQuestionLabel ? { importedQuestionLabel: message.importedQuestionLabel } : {}),
      ...(message.versions?.length
        ? { versions: message.versions, activeVersionIndex: message.activeVersionIndex }
        : {}),
      ...(message.proposals?.length ? { proposals: message.proposals } : {}),
      ...(message.proposalStatusById ? { proposalStatusById: message.proposalStatusById } : {}),
      ...(message.proposalResultById ? { proposalResultById: message.proposalResultById } : {}),
    })),
  }
}

/** Merge DB threads with local cache — DB wins on id conflict when newer. Skips archived ids. */
export function mergeConversationThreads(
  remote: AiTutorChatThread[],
  local: AiTutorChatThread[],
  archivedIds: ReadonlySet<string> = new Set(),
): AiTutorChatThread[] {
  const byId = new Map<string, AiTutorChatThread>()

  for (const thread of local) {
    if (!archivedIds.has(thread.id)) byId.set(thread.id, thread)
  }

  for (const thread of remote) {
    if (archivedIds.has(thread.id)) continue
    const existing = byId.get(thread.id)
    if (!existing) {
      byId.set(thread.id, thread)
      continue
    }
    byId.set(thread.id, mergeThreadsPreferRicher(existing, thread))
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}
