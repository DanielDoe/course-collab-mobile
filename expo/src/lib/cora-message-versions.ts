import type { ChatMessage } from "./ai-tutor-api"
import type { CoraImportedProblem } from "./cora-api"

export type ChatMessageVersion = {
  content: string
  importedQuestion?: CoraImportedProblem
  importedQuestionLabel?: string
  assistantContent?: string
}

export function getUserMessageVersions(message: ChatMessage): ChatMessageVersion[] {
  if (message.role !== "user") return []
  if (message.versions?.length) return message.versions
  if (!message.content.trim() && !message.importedQuestion) return []
  return [
    {
      content: message.content,
      importedQuestion: message.importedQuestion,
      importedQuestionLabel: message.importedQuestionLabel,
    },
  ]
}

export function getActiveUserVersionIndex(message: ChatMessage): number {
  const versions = getUserMessageVersions(message)
  if (versions.length === 0) return 0
  const idx = message.activeVersionIndex ?? versions.length - 1
  return Math.min(Math.max(idx, 0), versions.length - 1)
}

export function getActiveUserVersion(message: ChatMessage): ChatMessageVersion {
  const versions = getUserMessageVersions(message)
  return versions[getActiveUserVersionIndex(message)] ?? { content: message.content }
}

export function userMessageHasMultipleVersions(message: ChatMessage): boolean {
  return getUserMessageVersions(message).length > 1
}

export function saveAssistantOnActiveVersion(message: ChatMessage, assistantContent: string): ChatMessage {
  if (message.role !== "user") return message
  const versions = getUserMessageVersions(message).map((v) => ({ ...v }))
  const idx = getActiveUserVersionIndex(message)
  versions[idx] = { ...versions[idx], assistantContent }
  return { ...message, versions, activeVersionIndex: idx }
}

export function appendUserMessageVersion(
  message: ChatMessage,
  next: Pick<ChatMessageVersion, "content" | "importedQuestion" | "importedQuestionLabel">,
): ChatMessage {
  const versions = getUserMessageVersions(message).map((v) => ({ ...v }))
  versions.push({
    content: next.content,
    importedQuestion: next.importedQuestion,
    importedQuestionLabel: next.importedQuestionLabel,
  })
  const activeVersionIndex = versions.length - 1
  return {
    ...message,
    versions,
    activeVersionIndex,
    content: next.content,
    importedQuestion: next.importedQuestion,
    importedQuestionLabel: next.importedQuestionLabel,
  }
}

export function applyUserMessageVersion(message: ChatMessage, versionIndex: number): ChatMessage {
  const versions = getUserMessageVersions(message)
  const idx = Math.min(Math.max(versionIndex, 0), versions.length - 1)
  const ver = versions[idx]!
  return {
    ...message,
    versions: message.versions?.length ? message.versions : versions,
    activeVersionIndex: idx,
    content: ver.content,
    importedQuestion: ver.importedQuestion,
    importedQuestionLabel: ver.importedQuestionLabel,
  }
}

export function rebuildThreadAfterVersionChange(
  messages: ChatMessage[],
  userIndex: number,
  updatedUser: ChatMessage,
): ChatMessage[] {
  const ver = getActiveUserVersion(updatedUser)
  const next: ChatMessage[] = messages.slice(0, userIndex).concat(updatedUser)
  if (ver.assistantContent?.trim()) {
    next.push({
      id: `${updatedUser.id}-assistant-v${updatedUser.activeVersionIndex ?? 0}`,
      role: "assistant",
      content: ver.assistantContent,
    })
  }
  return next
}

export function shouldCollapseChatText(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return trimmed.split("\n").length > 8 || trimmed.length > 520
}

export const CHAT_COLLAPSED_MAX_HEIGHT = 168
