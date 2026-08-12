import type { AiTutorCredits, ChatMessage } from "./ai-tutor-api"
import { AI_TUTOR_CONTEXT_WINDOW, countExchanges } from "./ai-tutor-chat-storage"

/** Rough token estimate (~4 characters per token). */
export function estimateConversationTokens(messages: ChatMessage[]): number {
  const chars = messages.reduce((sum, message) => sum + message.content.length, 0)
  return Math.max(0, Math.ceil(chars / 4))
}

export function parseThreadTimestamp(threadId: string | null | undefined): string | null {
  if (!threadId) return null
  const match = threadId.match(/^cora-(\d+)$/)
  if (!match) return null
  const ms = Number(match[1])
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toISOString()
}

export type ConversationSummaryParts = {
  empty: boolean
  firstQuestion: string | null
  latestReply: string | null
  waitingForReply: boolean
}

function truncateMarkdownPreview(text: string, maxLen: number): string {
  const normalized = text.trim().replace(/\s+/g, " ")
  if (normalized.length <= maxLen) return normalized

  let cut = normalized.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(" ")
  if (lastSpace > maxLen * 0.6) cut = cut.slice(0, lastSpace)
  cut = cut.replace(/(\*{1,2}|_{1,2}|`+|\$)+$/, "")
  return `${cut}…`
}

export function buildConversationSummaryParts(messages: ChatMessage[]): ConversationSummaryParts {
  const userMessages = messages.filter((message) => message.role === "user" && message.content.trim())
  const assistantMessages = messages.filter((message) => message.role === "assistant" && message.content.trim())

  if (userMessages.length === 0) {
    return {
      empty: true,
      firstQuestion: null,
      latestReply: null,
      waitingForReply: false,
    }
  }

  const firstQuestion = truncateMarkdownPreview(userMessages[0]?.content ?? "", 220)
  const latestReplyRaw = assistantMessages.at(-1)?.content ?? ""
  const latestReply = latestReplyRaw.trim()
    ? truncateMarkdownPreview(latestReplyRaw, 320)
    : null

  return {
    empty: false,
    firstQuestion,
    latestReply,
    waitingForReply: assistantMessages.length === 0,
  }
}

export function buildConversationSummary(messages: ChatMessage[]): string {
  const parts = buildConversationSummaryParts(messages)

  if (parts.empty) {
    return "No messages yet. Ask Cora a question or import a course problem to begin."
  }

  if (parts.waitingForReply) {
    return `Started with: “${parts.firstQuestion?.replace(/"/g, "'") ?? ""}”. Waiting for Cora's first reply.`
  }

  return `Started with: “${parts.firstQuestion?.replace(/"/g, "'") ?? ""}”. Latest reply: “${parts.latestReply?.replace(/"/g, "'") ?? ""}”.`
}

export function formatConversationDate(value: string | null | undefined): string {
  if (!value) return "Unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatCreditsLabel(credits: AiTutorCredits | null): string {
  if (!credits) return "Loading…"
  const limitLabel = String(credits.creditsLimit)
  if (credits.isUnlimited || limitLabel.toLowerCase() === "unlimited") {
    return "Unlimited this week"
  }
  return `${credits.credits} of ${limitLabel} credits left this week`
}

export function searchConversationMessages(messages: ChatMessage[], query: string): ChatMessage[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return messages.filter((message) => message.content.toLowerCase().includes(needle))
}

export function snippetAroundMatch(text: string, query: string, radius = 64): string {
  const source = text.replace(/\s+/g, " ").trim()
  const index = source.toLowerCase().indexOf(query.trim().toLowerCase())
  if (index < 0) {
    return source.length > radius * 2 ? truncateMarkdownPreview(source, radius * 2) : source
  }
  const start = Math.max(0, index - radius)
  const end = Math.min(source.length, index + query.length + radius)
  const prefix = start > 0 ? "…" : ""
  const suffix = end < source.length ? "…" : ""
  const snippet = `${prefix}${source.slice(start, end)}${suffix}`
  return truncateMarkdownPreview(snippet, radius * 2 + query.length + 8)
}

export function conversationDepthLabel(messages: ChatMessage[], maxExchanges: number): string {
  const exchanges = countExchanges(messages)
  return `${exchanges}/${maxExchanges} exchanges · ${AI_TUTOR_CONTEXT_WINDOW}-message context window`
}
