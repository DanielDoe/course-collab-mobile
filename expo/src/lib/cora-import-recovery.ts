import type { AiTutorChatThread } from "./ai-tutor-chat-storage"
import { buildThread, persistRecoveredThreads } from "./ai-tutor-chat-storage"
import type { ChatMessage } from "./ai-tutor-api"
import {
  getCoraQuestionImportContainers,
  getCoraQuestionImportItems,
  getCoraQuestionImportSources,
  normalizeImportedProblem,
  resolveCoraQuestionImport,
  type CoraImportedProblem,
  type CoraQuestionImportItem,
} from "./cora-api"
import { getActiveUserVersionIndex } from "./cora-message-versions"
import type { StudentSession } from "./session"

const GENERIC_IMPORT_OPENER =
  /^Help me work through this (?:imported )?question(?:\s*:\s*(.+?))?\.?\s*$/i

const AUTO_MATCH_MIN_SCORE = 70
const AUTO_MATCH_MIN_GAP = 18

type CatalogCacheEntry = {
  fetchedAt: number
  items: CoraQuestionImportItem[]
}

const catalogCache = new Map<string, CatalogCacheEntry>()
const CATALOG_TTL_MS = 10 * 60 * 1000

function catalogCacheKey(session: StudentSession): string {
  return `${session.databaseId}:${session.courseId ?? "default"}`
}

function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s$=+\-*/().]/g, "")
    .trim()
}

export function parseGenericImportTitle(content: string): string | null {
  const match = content.trim().match(GENERIC_IMPORT_OPENER)
  if (!match) return null
  return match[1]?.trim() || null
}

export function isGenericImportOpener(content: string): boolean {
  return GENERIC_IMPORT_OPENER.test(content.trim())
}

function readEmbeddedImportedProblem(message: ChatMessage): CoraImportedProblem | undefined {
  if (message.importedQuestion) {
    return normalizeImportedProblem(message.importedQuestion)
  }

  const raw = message as ChatMessage & {
    imported_question?: CoraImportedProblem
    importedQuestionLabel?: string
    imported_question_label?: string
  }

  if (raw.imported_question) {
    return normalizeImportedProblem(raw.imported_question)
  }

  for (const version of message.versions ?? []) {
    if (version.importedQuestion) {
      return normalizeImportedProblem(version.importedQuestion)
    }
  }

  return undefined
}

function readEmbeddedImportLabel(message: ChatMessage, problem?: CoraImportedProblem): string | undefined {
  if (message.importedQuestionLabel?.trim()) return message.importedQuestionLabel.trim()
  const raw = message as ChatMessage & { imported_question_label?: string }
  if (raw.imported_question_label?.trim()) return raw.imported_question_label.trim()
  const activeVersion = message.versions?.[getActiveUserVersionIndex(message)]
  if (activeVersion?.importedQuestionLabel?.trim()) return activeVersion.importedQuestionLabel.trim()
  return problem?.title?.trim() || problem?.topic?.trim() || undefined
}

export function attachImportedQuestionToMessage(
  message: ChatMessage,
  problem: CoraImportedProblem,
  label: string,
): ChatMessage {
  const normalized = normalizeImportedProblem(problem)
  const importedQuestionLabel = label.trim() || readEmbeddedImportLabel(message, normalized)

  if (!message.versions?.length) {
    return {
      ...message,
      importedQuestion: normalized,
      importedQuestionLabel,
    }
  }

  const activeIndex = getActiveUserVersionIndex(message)
  const versions = message.versions.map((version, index) =>
    index === activeIndex
      ? {
          ...version,
          importedQuestion: normalized,
          importedQuestionLabel,
        }
      : version,
  )

  return {
    ...message,
    versions,
    activeVersionIndex: activeIndex,
    importedQuestion: normalized,
    importedQuestionLabel,
  }
}

function scoreCatalogItem(
  item: CoraQuestionImportItem,
  hints: {
    title?: string | null
    userContent?: string
    assistantContent?: string
    threadTitle?: string
  },
): number {
  let score = 0
  const labelNorm = normalizeMatchText(item.label)
  const previewNorm = normalizeMatchText(item.preview)

  if (hints.title) {
    const titleNorm = normalizeMatchText(hints.title)
    if (titleNorm && labelNorm === titleNorm) score += 100
    if (titleNorm && labelNorm.includes(titleNorm)) score += 85
    if (titleNorm && previewNorm.includes(titleNorm)) score += 75
  }

  if (hints.threadTitle) {
    const threadNorm = normalizeMatchText(hints.threadTitle)
    if (threadNorm && labelNorm === threadNorm) score += 95
    if (threadNorm && labelNorm.includes(threadNorm)) score += 80
  }

  if (hints.assistantContent) {
    const assistantNorm = normalizeMatchText(hints.assistantContent)
    if (previewNorm.length >= 24) {
      const previewSlice = previewNorm.slice(0, Math.min(80, previewNorm.length))
      if (assistantNorm.includes(previewSlice)) score += 72
    }
    if (labelNorm.length >= 8 && assistantNorm.includes(labelNorm)) score += 48
  }

  if (hints.userContent && !isGenericImportOpener(hints.userContent)) {
    const userNorm = normalizeMatchText(hints.userContent)
    if (previewNorm.length >= 24 && userNorm.length >= 12) {
      const previewSlice = previewNorm.slice(0, Math.min(48, previewNorm.length))
      if (userNorm.includes(previewSlice) || previewNorm.includes(userNorm.slice(0, 48))) {
        score += 36
      }
    }
  }

  return score
}

function pickCatalogMatch(
  catalog: CoraQuestionImportItem[],
  hints: {
    title?: string | null
    userContent?: string
    assistantContent?: string
    threadTitle?: string
  },
): CoraQuestionImportItem | null {
  const scored = catalog
    .map((item) => ({ item, score: scoreCatalogItem(item, hints) }))
    .filter((entry) => entry.score >= AUTO_MATCH_MIN_SCORE)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null
  if (scored.length === 1) return scored[0]!.item

  const best = scored[0]!
  const second = scored[1]!
  if (best.score - second.score < AUTO_MATCH_MIN_GAP) return null
  return best.item
}

export async function fetchCoraImportCatalog(session: StudentSession): Promise<CoraQuestionImportItem[]> {
  const cacheKey = catalogCacheKey(session)
  const cached = catalogCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CATALOG_TTL_MS) {
    return cached.items
  }

  const sources = (await getCoraQuestionImportSources(session)).sources ?? []
  const items: CoraQuestionImportItem[] = []

  for (const source of sources) {
    const containers = (await getCoraQuestionImportContainers(session, source.key)).containers ?? []
    for (const container of containers) {
      const res = await getCoraQuestionImportItems(session, source.key, container.id)
      items.push(...(res.items ?? []))
    }
  }

  catalogCache.set(cacheKey, { fetchedAt: Date.now(), items })
  return items
}

function messageNeedsImportRecovery(
  message: ChatMessage,
  context?: { isFirstUser?: boolean; nextAssistant?: ChatMessage },
): boolean {
  if (message.role !== "user") return false
  if (message.importedQuestion) return false
  if (readEmbeddedImportedProblem(message)) return true
  if (isGenericImportOpener(message.content)) return true
  if (message.versions?.some((version) => version.importedQuestion)) return true
  if (context?.isFirstUser && context.nextAssistant?.content.trim()) return true
  return false
}

function threadNeedsImportRecovery(thread: AiTutorChatThread): boolean {
  let sawUser = false
  for (let index = 0; index < thread.messages.length; index += 1) {
    const message = thread.messages[index]!
    if (message.role !== "user") continue
    const isFirstUser = !sawUser
    sawUser = true
    const nextAssistant = thread.messages[index + 1]?.role === "assistant" ? thread.messages[index + 1] : undefined
    if (messageNeedsImportRecovery(message, { isFirstUser, nextAssistant })) return true
  }
  return false
}

async function resolveCatalogMatch(
  session: StudentSession,
  catalog: CoraQuestionImportItem[],
  message: ChatMessage,
  nextAssistant: ChatMessage | undefined,
  threadTitle: string,
): Promise<{ problem: CoraImportedProblem; label: string } | null> {
  const embedded = readEmbeddedImportedProblem(message)
  if (embedded) {
    return {
      problem: embedded,
      label: readEmbeddedImportLabel(message, embedded) ?? embedded.title ?? embedded.topic ?? "Imported question",
    }
  }

  const title = parseGenericImportTitle(message.content)
  const match = pickCatalogMatch(catalog, {
    title,
    userContent: message.content,
    assistantContent: nextAssistant?.content,
    threadTitle,
  })

  if (!match) return null

  try {
    const problem = await resolveCoraQuestionImport(session, match)
    return {
      problem,
      label: match.label,
    }
  } catch {
    return null
  }
}

export async function restoreImportedQuestionsInThread(
  session: StudentSession,
  thread: AiTutorChatThread,
  catalog?: CoraQuestionImportItem[],
): Promise<{ thread: AiTutorChatThread; changed: boolean; restoredCount: number }> {
  if (!threadNeedsImportRecovery(thread)) {
    return { thread, changed: false, restoredCount: 0 }
  }

  let catalogItems = catalog
  const needsCatalog = thread.messages.some((message, index) => {
    if (message.role !== "user") return false
    const isFirstUser = !thread.messages.slice(0, index).some((entry) => entry.role === "user")
    const nextAssistant = thread.messages[index + 1]?.role === "assistant" ? thread.messages[index + 1] : undefined
    return (
      messageNeedsImportRecovery(message, { isFirstUser, nextAssistant }) &&
      !readEmbeddedImportedProblem(message)
    )
  })

  if (needsCatalog && !catalogItems) {
    try {
      catalogItems = await fetchCoraImportCatalog(session)
    } catch {
      catalogItems = []
    }
  }

  let restoredCount = 0
  const nextMessages: ChatMessage[] = []

  for (let index = 0; index < thread.messages.length; index += 1) {
    const message = thread.messages[index]!
    const isFirstUser = !thread.messages.slice(0, index).some((entry) => entry.role === "user")
    const nextAssistant = thread.messages[index + 1]?.role === "assistant" ? thread.messages[index + 1] : undefined

    if (!messageNeedsImportRecovery(message, { isFirstUser, nextAssistant })) {
      nextMessages.push(message)
      continue
    }

    const embedded = readEmbeddedImportedProblem(message)
    if (embedded) {
      nextMessages.push(
        attachImportedQuestionToMessage(
          message,
          embedded,
          readEmbeddedImportLabel(message, embedded) ?? embedded.title ?? embedded.topic ?? "Imported question",
        ),
      )
      restoredCount += 1
      continue
    }

    const resolved =
      catalogItems && catalogItems.length > 0
        ? await resolveCatalogMatch(session, catalogItems, message, nextAssistant, thread.title)
        : null

    if (resolved) {
      nextMessages.push(attachImportedQuestionToMessage(message, resolved.problem, resolved.label))
      restoredCount += 1
      continue
    }

    nextMessages.push(message)
  }

  if (restoredCount === 0) {
    return { thread, changed: false, restoredCount: 0 }
  }

  return {
    thread: buildThread(thread.id, nextMessages, thread),
    changed: true,
    restoredCount,
  }
}

export async function restoreImportedQuestionsInThreads(
  session: StudentSession,
  threads: AiTutorChatThread[],
): Promise<{ threads: AiTutorChatThread[]; changed: boolean; restoredCount: number }> {
  const candidates = threads.filter(threadNeedsImportRecovery)
  if (candidates.length === 0) {
    return { threads, changed: false, restoredCount: 0 }
  }

  let catalog: CoraQuestionImportItem[] | undefined
  try {
    catalog = await fetchCoraImportCatalog(session)
  } catch {
    catalog = []
  }

  let changed = false
  let restoredCount = 0
  const nextThreads = [...threads]

  for (const thread of candidates) {
    const index = nextThreads.findIndex((entry) => entry.id === thread.id)
    if (index < 0) continue
    const result = await restoreImportedQuestionsInThread(session, thread, catalog)
    if (result.changed) {
      nextThreads[index] = result.thread
      changed = true
      restoredCount += result.restoredCount
    }
  }

  return { threads: nextThreads, changed, restoredCount }
}
