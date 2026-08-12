import type { ChatMessage } from "./ai-tutor-api"
import type { MembershipTier } from "../types/dashboard"
import { documentDirectory, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy"
import { isCoraSectionId, type CoraSectionId } from "./cora-nav-config"
import type { StudentCoraCapabilityId } from "./student-cora-config"

export type AiTutorChatThread = {
  id: string
  title: string
  preview: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  /** When true, title was set manually and should not be overwritten on save. */
  titleIsCustom?: boolean
  /** Set when moved to Archived — kept for restore. */
  archivedAt?: string
  /** Home capability that started this thread, when applicable. */
  capabilityId?: StudentCoraCapabilityId
}

export type AiTutorChatTab = CoraSectionId

/** @deprecated Legacy tab ids from before Cora redesign */
type LegacyAiTutorChatTab = "overview" | "chat" | "history" | "solve"

/** Max user turns per thread for Explorer members. */
export const AI_TUTOR_MAX_EXCHANGES_EXPLORER = 20

/** Max user turns per thread for Trailblazer members. */
export const AI_TUTOR_MAX_EXCHANGES_TRAILBLAZER = 50

/** @deprecated Use getMaxExchangesForTier(tier) */
export const AI_TUTOR_MAX_EXCHANGES = AI_TUTOR_MAX_EXCHANGES_EXPLORER

/** Messages sent to the API as conversation context (matches server window). */
export const AI_TUTOR_CONTEXT_WINDOW = 10

export function getMaxExchangesForTier(tier: MembershipTier): number {
  if (tier === "Trailblazer") return AI_TUTOR_MAX_EXCHANGES_TRAILBLAZER
  return AI_TUTOR_MAX_EXCHANGES_EXPLORER
}

type ThreadStore = {
  version: 3
  threads: AiTutorChatThread[]
  archivedThreads: AiTutorChatThread[]
  activeThreadId: string | null
  activeTab: AiTutorChatTab
}

const MAX_THREADS = 40
const MAX_ARCHIVED_THREADS = 40
const STORE_VERSION = 3 as const
const DEFAULT_TAB: AiTutorChatTab = "home"

function normalizeTab(tab: string | undefined): AiTutorChatTab {
  if (tab && isCoraSectionId(tab)) return tab
  if (tab === "overview") return "home"
  if (tab === "chat" || tab === "history") return "workspace"
  return DEFAULT_TAB
}

function storagePath(studentId: string): string {
  return `ai-tutor-chats-${studentId}.json`
}

async function readStore(studentId: string): Promise<ThreadStore> {
  try {
    if (!documentDirectory) return emptyStore()
    const uri = `${documentDirectory}${storagePath(studentId)}`
    const raw = await readAsStringAsync(uri)
    const parsed = JSON.parse(raw) as Partial<ThreadStore> & {
      version?: number
      threads?: AiTutorChatThread[]
      archivedThreads?: AiTutorChatThread[]
    }
    if (!Array.isArray(parsed.threads)) {
      return emptyStore()
    }
    return {
      version: STORE_VERSION,
      threads: parsed.threads,
      archivedThreads: Array.isArray(parsed.archivedThreads) ? parsed.archivedThreads : [],
      activeThreadId: parsed.activeThreadId ?? null,
      activeTab: normalizeTab(parsed.activeTab as AiTutorChatTab | LegacyAiTutorChatTab | undefined),
    }
  } catch {
    return emptyStore()
  }
}

function emptyStore(): ThreadStore {
  return { version: STORE_VERSION, threads: [], archivedThreads: [], activeThreadId: null, activeTab: DEFAULT_TAB }
}

export function getArchivedThreadIds(store: Pick<ThreadStore, "archivedThreads">): Set<string> {
  return new Set(store.archivedThreads.map((thread) => thread.id))
}

async function writeStore(studentId: string, store: ThreadStore): Promise<void> {
  try {
    if (!documentDirectory) return
    const uri = `${documentDirectory}${storagePath(studentId)}`
    await writeAsStringAsync(uri, JSON.stringify(store))
  } catch {
    /* non-fatal — chat prefs are best-effort on device */
  }
}

export function createThreadId(): string {
  return `cora-${Date.now()}`
}

export function deriveThreadTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find(
    (m) => m.role === "user" && (m.content.trim() || m.importedQuestion),
  )
  if (!firstUser) return "New conversation"
  if (!firstUser.content.trim() && firstUser.importedQuestion) {
    const label =
      firstUser.importedQuestionLabel ??
      firstUser.importedQuestion.title ??
      firstUser.importedQuestion.topic ??
      "Imported question"
    return label.length > 56 ? `${label.slice(0, 53)}…` : label
  }
  const text = firstUser.content.trim().replace(/\s+/g, " ")
  return text.length > 56 ? `${text.slice(0, 53)}…` : text
}

export function deriveThreadPreview(messages: ChatMessage[]): string {
  const last = [...messages].reverse().find((m) => m.content.trim() || m.importedQuestion)
  if (!last) return "No messages yet"
  const prefix = last.role === "user" ? "You: " : "Cora: "
  if (!last.content.trim() && last.importedQuestion) {
    const label =
      last.importedQuestionLabel ??
      last.importedQuestion.title ??
      last.importedQuestion.topic ??
      "Imported question"
    const combined = prefix + label
    return combined.length > 96 ? `${combined.slice(0, 93)}…` : combined
  }
  const text = last.content.trim().replace(/\s+/g, " ")
  const combined = prefix + text
  return combined.length > 96 ? `${combined.slice(0, 93)}…` : combined
}

export function countExchanges(messages: ChatMessage[]): number {
  return messages.filter(
    (m) => m.role === "user" && (m.content.trim() || m.importedQuestion),
  ).length
}

export function exchangesRemaining(messages: ChatMessage[], maxExchanges: number): number {
  return Math.max(0, maxExchanges - countExchanges(messages))
}

export function isThreadAtExchangeLimit(messages: ChatMessage[], maxExchanges: number): boolean {
  return countExchanges(messages) >= maxExchanges
}

/** Message worth persisting in a thread — text and/or imported course question. */
export function isStorableChatMessage(message: ChatMessage): boolean {
  return Boolean(message.content.trim() || message.importedQuestion)
}

export function buildThread(
  id: string,
  messages: ChatMessage[],
  existing?: AiTutorChatThread | null,
  capabilityId?: StudentCoraCapabilityId,
): AiTutorChatThread {
  const now = new Date().toISOString()
  const meaningful = messages.filter(isStorableChatMessage)
  const autoTitle = deriveThreadTitle(meaningful)
  return {
    id,
    title: existing?.titleIsCustom ? existing.title.trim() || autoTitle : autoTitle,
    preview: deriveThreadPreview(meaningful),
    messages: meaningful,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...(existing?.titleIsCustom ? { titleIsCustom: true } : {}),
    ...(existing?.archivedAt ? { archivedAt: existing.archivedAt } : {}),
    capabilityId: capabilityId ?? existing?.capabilityId,
  }
}

function newestThread(threads: AiTutorChatThread[]): AiTutorChatThread | null {
  if (threads.length === 0) return null
  return [...threads].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0]
}

export function findStudentCoraThreadForCapability(
  threads: AiTutorChatThread[],
  archivedThreads: AiTutorChatThread[],
  capabilityId: StudentCoraCapabilityId,
): AiTutorChatThread | null {
  return (
    newestThread(threads.filter((thread) => thread.capabilityId === capabilityId)) ??
    newestThread(archivedThreads.filter((thread) => thread.capabilityId === capabilityId))
  )
}

export async function loadChatSession(studentId: string): Promise<{
  threads: AiTutorChatThread[]
  archivedThreads: AiTutorChatThread[]
  activeThreadId: string | null
  activeTab: AiTutorChatTab
}> {
  const store = await readStore(studentId)
  const sortByUpdated = (a: AiTutorChatThread, b: AiTutorChatThread) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  const threads = store.threads.sort(sortByUpdated)
  const archivedThreads = store.archivedThreads.sort(sortByUpdated)
  const activeThread =
    store.activeThreadId != null ? threads.find((t) => t.id === store.activeThreadId) : undefined
  return {
    threads,
    archivedThreads,
    activeThreadId: activeThread ? activeThread.id : null,
    activeTab: store.activeTab,
  }
}

/** @deprecated Use loadChatSession */
export async function loadThreads(studentId: string): Promise<AiTutorChatThread[]> {
  const session = await loadChatSession(studentId)
  return session.threads
}

export async function saveSessionPrefs(
  studentId: string,
  prefs: Partial<Pick<ThreadStore, "activeThreadId" | "activeTab">>,
): Promise<void> {
  const store = await readStore(studentId)
  await writeStore(studentId, {
    ...store,
    activeThreadId: prefs.activeThreadId !== undefined ? prefs.activeThreadId : store.activeThreadId,
    activeTab: prefs.activeTab ?? store.activeTab,
  })
}

export async function persistRecoveredThreads(
  studentId: string,
  updates: AiTutorChatThread[],
): Promise<{ threads: AiTutorChatThread[]; archivedThreads: AiTutorChatThread[] }> {
  if (updates.length === 0) {
    const store = await readStore(studentId)
    return { threads: store.threads, archivedThreads: store.archivedThreads }
  }

  const store = await readStore(studentId)
  const updateById = new Map(updates.map((thread) => [thread.id, thread]))
  const threads = store.threads.map((thread) => updateById.get(thread.id) ?? thread)
  const archivedThreads = store.archivedThreads.map((thread) => updateById.get(thread.id) ?? thread)

  await writeStore(studentId, {
    ...store,
    threads,
    archivedThreads,
  })

  return { threads, archivedThreads }
}

export async function saveThread(studentId: string, thread: AiTutorChatThread): Promise<AiTutorChatThread[]> {
  const store = await readStore(studentId)
  const without = store.threads.filter((t) => t.id !== thread.id)
  const next = [thread, ...without]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_THREADS)
  await writeStore(studentId, {
    ...store,
    threads: next,
  })
  return next
}

/** Single read/write when syncing many threads from the server. */
export async function upsertActiveThreads(
  studentId: string,
  threads: AiTutorChatThread[],
): Promise<AiTutorChatThread[]> {
  if (threads.length === 0) {
    const store = await readStore(studentId)
    return store.threads.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }

  const store = await readStore(studentId)
  const byId = new Map(threads.map((thread) => [thread.id, thread]))
  const preserved = store.threads.filter((thread) => !byId.has(thread.id))
  const next = [...threads, ...preserved]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_THREADS)

  await writeStore(studentId, {
    ...store,
    threads: next,
  })

  return next
}

export async function renameThread(
  studentId: string,
  threadId: string,
  title: string,
): Promise<{ threads: AiTutorChatThread[]; archivedThreads: AiTutorChatThread[] }> {
  const trimmed = title.trim()
  const store = await readStore(studentId)
  if (!trimmed) {
    return {
      threads: store.threads.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
      archivedThreads: store.archivedThreads.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    }
  }

  const now = new Date().toISOString()
  const applyRename = (list: AiTutorChatThread[]) =>
    list.map((thread) =>
      thread.id === threadId
        ? { ...thread, title: trimmed, titleIsCustom: true, updatedAt: now }
        : thread,
    )

  const threads = applyRename(store.threads)
  const archivedThreads = applyRename(store.archivedThreads)

  await writeStore(studentId, { ...store, threads, archivedThreads })

  const sortByUpdated = (a: AiTutorChatThread, b: AiTutorChatThread) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()

  return {
    threads: threads.sort(sortByUpdated),
    archivedThreads: archivedThreads.sort(sortByUpdated),
  }
}

export async function archiveThread(
  studentId: string,
  threadId: string,
): Promise<{ threads: AiTutorChatThread[]; archivedThreads: AiTutorChatThread[] }> {
  const store = await readStore(studentId)
  const thread = store.threads.find((t) => t.id === threadId)
  if (!thread) {
    return {
      threads: store.threads.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
      archivedThreads: store.archivedThreads.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    }
  }

  const now = new Date().toISOString()
  const archivedThread: AiTutorChatThread = { ...thread, archivedAt: now, updatedAt: now }
  const threads = store.threads.filter((t) => t.id !== threadId)
  const archivedThreads = [archivedThread, ...store.archivedThreads.filter((t) => t.id !== threadId)]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_ARCHIVED_THREADS)

  await writeStore(studentId, {
    ...store,
    threads,
    archivedThreads,
    activeThreadId: store.activeThreadId === threadId ? null : store.activeThreadId,
  })

  return {
    threads: threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    archivedThreads,
  }
}

export async function restoreThread(
  studentId: string,
  threadId: string,
): Promise<{ threads: AiTutorChatThread[]; archivedThreads: AiTutorChatThread[] }> {
  const store = await readStore(studentId)
  const thread = store.archivedThreads.find((t) => t.id === threadId)
  if (!thread) {
    return {
      threads: store.threads.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
      archivedThreads: store.archivedThreads.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    }
  }

  const now = new Date().toISOString()
  const { archivedAt: _, ...rest } = thread
  const restored: AiTutorChatThread = { ...rest, updatedAt: now }
  const archivedThreads = store.archivedThreads.filter((t) => t.id !== threadId)
  const threads = [restored, ...store.threads.filter((t) => t.id !== threadId)]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_THREADS)

  await writeStore(studentId, {
    ...store,
    threads,
    archivedThreads,
  })

  return { threads, archivedThreads }
}

export async function permanentlyDeleteThread(
  studentId: string,
  threadId: string,
): Promise<{ threads: AiTutorChatThread[]; archivedThreads: AiTutorChatThread[] }> {
  const store = await readStore(studentId)
  const threads = store.threads.filter((t) => t.id !== threadId)
  const archivedThreads = store.archivedThreads.filter((t) => t.id !== threadId)

  await writeStore(studentId, {
    ...store,
    threads,
    archivedThreads,
    activeThreadId: store.activeThreadId === threadId ? null : store.activeThreadId,
  })

  return {
    threads: threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    archivedThreads: archivedThreads.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  }
}

/** @deprecated Use archiveThread — moves to Archived instead of hard delete. */
export async function deleteThread(studentId: string, threadId: string): Promise<AiTutorChatThread[]> {
  const { threads } = await archiveThread(studentId, threadId)
  return threads
}

/** Maestro / simulator test prompts — not real student conversations. */
const TEST_THREAD_TITLES = new Set([
  "Walk me through nodal analysis step by step",
  "Walk me through this circuit step by step",
  "Why does this print 3?",
  "Help me work through this imported course question",
])

/** Cora chat testing on 2026-08-08 — only delete threads created at or after this instant. */
const TEST_SESSION_START_MS = new Date("2026-08-08T20:41:00.000Z").getTime()

export function isTestChatThread(thread: AiTutorChatThread): boolean {
  const createdMs = new Date(thread.createdAt).getTime()
  if (!Number.isFinite(createdMs) || createdMs < TEST_SESSION_START_MS) return false

  const userMsgs = thread.messages.filter((m) => m.role === "user" && m.content.trim())
  const assistantMsgs = thread.messages.filter((m) => m.role === "assistant" && m.content.trim())

  if (userMsgs.length === 0) return true
  if (assistantMsgs.length === 0 && userMsgs.length <= 1) {
    const title = thread.title.trim()
    if (title === "New conversation" || TEST_THREAD_TITLES.has(title)) return true
    if (TEST_THREAD_TITLES.has(userMsgs[0]!.content.trim())) return true
  }

  return false
}

/** Remove only simulator / Maestro test threads permanently. */
export async function deleteTestThreads(
  studentId: string,
): Promise<{ deletedIds: string[]; threads: AiTutorChatThread[]; archivedThreads: AiTutorChatThread[] }> {
  const store = await readStore(studentId)
  const deletedIds: string[] = []
  const keepActive = store.threads.filter((thread) => {
    if (isTestChatThread(thread)) {
      deletedIds.push(thread.id)
      return false
    }
    return true
  })
  const keepArchived = store.archivedThreads.filter((thread) => {
    if (isTestChatThread(thread)) {
      deletedIds.push(thread.id)
      return false
    }
    return true
  })

  await writeStore(studentId, {
    ...store,
    threads: keepActive,
    archivedThreads: keepArchived,
    activeThreadId:
      store.activeThreadId != null && deletedIds.includes(store.activeThreadId)
        ? null
        : store.activeThreadId,
  })

  const sortByUpdated = (a: AiTutorChatThread, b: AiTutorChatThread) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()

  return {
    deletedIds,
    threads: keepActive.sort(sortByUpdated),
    archivedThreads: keepArchived.sort(sortByUpdated),
  }
}
