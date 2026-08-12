import { documentDirectory, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy"
import type { ChatMessage } from "./ai-tutor-api"
import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import type { FacultyCoraChatAction } from "./faculty-cora-api"
import type { InstructorScope } from "./instructor-content-api"
import { facultyCoraChatApi, isFacultyCoraChatHistoryUnavailable } from "./faculty-cora-chat-api"

export type FacultyCoraStoredMessage = ChatMessage & {
  actions?: FacultyCoraChatAction[]
}

export type FacultyCoraChatThread = {
  id: string
  title: string
  preview: string
  capabilityId?: FacultyCoraCapabilityId
  messages: FacultyCoraStoredMessage[]
  createdAt: string
  updatedAt: string
  titleIsCustom?: boolean
  archivedAt?: string
}

type ThreadStore = {
  version: 1
  threads: FacultyCoraChatThread[]
  archivedThreads: FacultyCoraChatThread[]
  activeThreadId: string | null
}

const STORE_VERSION = 1 as const
const MAX_THREADS = 24
const MAX_ARCHIVED_THREADS = 48

function storagePath(instructorId: number, courseId: number): string {
  return `faculty-cora-chat-${instructorId}-${courseId}.json`
}

function emptyStore(): ThreadStore {
  return { version: STORE_VERSION, threads: [], archivedThreads: [], activeThreadId: null }
}

async function readStore(instructorId: number, courseId: number): Promise<ThreadStore> {
  try {
    if (!documentDirectory) return emptyStore()
    const uri = `${documentDirectory}${storagePath(instructorId, courseId)}`
    const raw = await readAsStringAsync(uri)
    const parsed = JSON.parse(raw) as Partial<ThreadStore>
    if (!Array.isArray(parsed.threads)) return emptyStore()
    return {
      version: STORE_VERSION,
      threads: parsed.threads,
      archivedThreads: Array.isArray(parsed.archivedThreads) ? parsed.archivedThreads : [],
      activeThreadId: parsed.activeThreadId ?? null,
    }
  } catch {
    return emptyStore()
  }
}

async function writeStore(instructorId: number, courseId: number, store: ThreadStore): Promise<void> {
  try {
    if (!documentDirectory) return
    const uri = `${documentDirectory}${storagePath(instructorId, courseId)}`
    await writeAsStringAsync(uri, JSON.stringify(store))
  } catch {
    /* best-effort local persistence */
  }
}

function sortThreadsByUpdatedDesc(threads: FacultyCoraChatThread[]): FacultyCoraChatThread[] {
  return [...threads].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

/** Most recent thread for a capability — active list first, then archived. */
export function findFacultyCoraThreadForCapability(
  threads: FacultyCoraChatThread[],
  archivedThreads: FacultyCoraChatThread[],
  capabilityId: FacultyCoraCapabilityId,
): FacultyCoraChatThread | null {
  const activeMatches = sortThreadsByUpdatedDesc(
    threads.filter((thread) => thread.capabilityId === capabilityId),
  )
  if (activeMatches[0]) return activeMatches[0]

  const archivedMatches = sortThreadsByUpdatedDesc(
    archivedThreads.filter((thread) => thread.capabilityId === capabilityId),
  )
  return archivedMatches[0] ?? null
}

export function createFacultyCoraThreadId(): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `fcora-${uuid}`
}

function sessionFromStore(store: ThreadStore) {
  const sortByUpdated = (a: FacultyCoraChatThread, b: FacultyCoraChatThread) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  const threads = [...store.threads].sort(sortByUpdated)
  const archivedThreads = [...store.archivedThreads].sort(sortByUpdated)
  const activeThread =
    store.activeThreadId != null
      ? (threads.find((thread) => thread.id === store.activeThreadId) ??
          archivedThreads.find((thread) => thread.id === store.activeThreadId) ??
          threads[0] ??
          null)
      : (threads[0] ?? null)

  return {
    threads,
    archivedThreads,
    activeThreadId: activeThread?.id ?? null,
    activeThread,
  }
}

async function cacheRemoteSession(
  instructorId: number,
  courseId: number,
  remote: { threads: FacultyCoraChatThread[]; activeThreadId: string | null },
): Promise<ThreadStore> {
  const local = await readStore(instructorId, courseId)
  const merged = mergeFacultyCoraSession(local, remote)
  await writeStore(instructorId, courseId, merged)
  return merged
}

function mergeFacultyChatMessages(
  primary: FacultyCoraStoredMessage[],
  secondary: FacultyCoraStoredMessage[],
): FacultyCoraStoredMessage[] {
  const secondaryById = new Map(secondary.map((message) => [message.id, message]))
  const merged = primary.map((message) => {
    const other = secondaryById.get(message.id)
    if (!other) return message
    return {
      ...message,
      content: message.content.trim() ? message.content : other.content,
      importedQuestion: message.importedQuestion ?? other.importedQuestion,
      importedQuestionLabel: message.importedQuestionLabel ?? other.importedQuestionLabel,
      actions: message.actions?.length ? message.actions : other.actions,
    }
  })
  for (const message of secondary) {
    if (!merged.some((entry) => entry.id === message.id)) merged.push(message)
  }
  return merged
}

function mergeFacultyThreadsPreferRicher(
  local: FacultyCoraChatThread,
  remote: FacultyCoraChatThread,
): FacultyCoraChatThread {
  const remoteTime = new Date(remote.updatedAt).getTime()
  const localTime = new Date(local.updatedAt).getTime()
  const primary = remoteTime >= localTime ? remote : local
  const secondary = primary === remote ? local : remote
  const messages = mergeFacultyChatMessages(primary.messages, secondary.messages)
  return {
    ...primary,
    messages,
    preview: deriveThreadPreview(messages),
    title: primary.titleIsCustom ? primary.title : deriveThreadTitle(messages),
    capabilityId: primary.capabilityId ?? secondary.capabilityId,
    archivedAt: primary.archivedAt ?? secondary.archivedAt,
  }
}

function mergeFacultyThreadLists(
  remote: FacultyCoraChatThread[],
  local: FacultyCoraChatThread[],
): FacultyCoraChatThread[] {
  const byId = new Map<string, FacultyCoraChatThread>()
  for (const thread of local) byId.set(thread.id, thread)
  for (const thread of remote) {
    const existing = byId.get(thread.id)
    byId.set(thread.id, existing ? mergeFacultyThreadsPreferRicher(existing, thread) : thread)
  }
  return sortThreadsByUpdatedDesc([...byId.values()])
}

function partitionFacultyThreads(threads: FacultyCoraChatThread[]) {
  const active: FacultyCoraChatThread[] = []
  const archived: FacultyCoraChatThread[] = []
  for (const thread of threads) {
    if (thread.archivedAt) archived.push(thread)
    else active.push(thread)
  }
  return { active, archived }
}

function mergeFacultyCoraSession(
  local: ThreadStore,
  remote: { threads: FacultyCoraChatThread[]; activeThreadId: string | null },
): ThreadStore {
  const remotePartition = partitionFacultyThreads(remote.threads)
  const mergedActive = mergeFacultyThreadLists(remotePartition.active, local.threads)
  const mergedArchived = mergeFacultyThreadLists(remotePartition.archived, local.archivedThreads)
  const archivedIds = new Set(mergedArchived.map((thread) => thread.id))
  const threads = mergedActive.filter((thread) => !archivedIds.has(thread.id)).slice(0, MAX_THREADS)
  const archivedThreads = mergedArchived.slice(0, MAX_ARCHIVED_THREADS)
  const activeThreadId =
    remote.activeThreadId ??
    (local.activeThreadId && [...threads, ...archivedThreads].some((thread) => thread.id === local.activeThreadId)
      ? local.activeThreadId
      : null)

  return {
    version: STORE_VERSION,
    threads,
    archivedThreads,
    activeThreadId,
  }
}

export async function loadLocalFacultyCoraChatSession(
  instructorId: number,
  courseId: number,
): Promise<{
  threads: FacultyCoraChatThread[]
  archivedThreads: FacultyCoraChatThread[]
  activeThreadId: string | null
  activeThread: FacultyCoraChatThread | null
}> {
  return sessionFromStore(await readStore(instructorId, courseId))
}

export async function syncFacultyCoraChatSession(
  instructorId: number,
  courseId: number,
  scope: InstructorScope,
  local: Awaited<ReturnType<typeof loadLocalFacultyCoraChatSession>>,
): Promise<{
  threads: FacultyCoraChatThread[]
  archivedThreads: FacultyCoraChatThread[]
  activeThreadId: string | null
  activeThread: FacultyCoraChatThread | null
  syncedFromServer: boolean
}> {
  try {
    const remote = await facultyCoraChatApi.listThreads(scope)
    const store = await cacheRemoteSession(instructorId, courseId, remote)
    return { ...sessionFromStore(store), syncedFromServer: true }
  } catch (err) {
    if (!isFacultyCoraChatHistoryUnavailable(err)) {
      console.warn("[FacultyCoraChat] Server history unavailable, using local cache.", err)
    }
    return { ...local, syncedFromServer: false }
  }
}

function deriveThreadTitle(messages: FacultyCoraStoredMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim())
  if (!firstUser) return "Cora conversation"
  const text = firstUser.content.trim().replace(/\s+/g, " ")
  return text.length > 56 ? `${text.slice(0, 53)}…` : text
}

function deriveThreadPreview(messages: FacultyCoraStoredMessage[]): string {
  const last = [...messages].reverse().find((m) => m.content.trim())
  if (!last) return "No messages yet"
  const prefix = last.role === "user" ? "You: " : "Cora: "
  const text = last.content.trim().replace(/\s+/g, " ")
  const combined = prefix + text
  return combined.length > 96 ? `${combined.slice(0, 93)}…` : combined
}

export function buildFacultyCoraThread(
  id: string,
  messages: FacultyCoraStoredMessage[],
  capabilityId?: FacultyCoraCapabilityId,
  existing?: Pick<FacultyCoraChatThread, "createdAt" | "capabilityId" | "title" | "titleIsCustom"> | null,
): FacultyCoraChatThread {
  const now = new Date().toISOString()
  const meaningful = messages.filter((m) => m.content.trim() || m.importedQuestion)
  const autoTitle = deriveThreadTitle(meaningful)
  return {
    id,
    title: existing?.titleIsCustom && existing.title ? existing.title : autoTitle,
    preview: deriveThreadPreview(meaningful),
    capabilityId: capabilityId ?? existing?.capabilityId,
    messages: meaningful,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    titleIsCustom: existing?.titleIsCustom,
  }
}

export async function loadFacultyCoraChatSession(
  instructorId: number,
  courseId: number,
  scope?: InstructorScope,
): Promise<{
  threads: FacultyCoraChatThread[]
  archivedThreads: FacultyCoraChatThread[]
  activeThreadId: string | null
  activeThread: FacultyCoraChatThread | null
  syncedFromServer: boolean
}> {
  const local = await loadLocalFacultyCoraChatSession(instructorId, courseId)
  if (!scope) {
    return { ...local, syncedFromServer: false }
  }
  return syncFacultyCoraChatSession(instructorId, courseId, scope, local)
}

export async function saveFacultyCoraThread(
  instructorId: number,
  courseId: number,
  thread: FacultyCoraChatThread,
  scope?: InstructorScope,
): Promise<void> {
  const store = await readStore(instructorId, courseId)
  const without = store.threads.filter((item) => item.id !== thread.id)
  const next = [thread, ...without]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_THREADS)

  await writeStore(instructorId, courseId, {
    ...store,
    threads: next,
    activeThreadId: thread.id,
  })

  if (!scope) return

  try {
    await facultyCoraChatApi.upsertThread(scope, thread)
  } catch (err) {
    if (!isFacultyCoraChatHistoryUnavailable(err)) {
      console.warn("[FacultyCoraChat] Could not sync thread to server.", err)
    }
  }
}

export async function activateFacultyCoraThread(
  instructorId: number,
  courseId: number,
  threadId: string | null,
): Promise<void> {
  const store = await readStore(instructorId, courseId)
  await writeStore(instructorId, courseId, { ...store, activeThreadId: threadId })
}

export async function deleteFacultyCoraThread(
  instructorId: number,
  courseId: number,
  threadId: string,
  scope?: InstructorScope,
): Promise<{ threads: FacultyCoraChatThread[]; archivedThreads: FacultyCoraChatThread[] }> {
  const store = await readStore(instructorId, courseId)
  const threads = store.threads.filter((thread) => thread.id !== threadId)
  const archivedThreads = store.archivedThreads.filter((thread) => thread.id !== threadId)
  const activeThreadId = store.activeThreadId === threadId ? null : store.activeThreadId

  await writeStore(instructorId, courseId, { ...store, threads, archivedThreads, activeThreadId })

  if (scope) {
    try {
      await facultyCoraChatApi.deleteThread(scope, threadId)
    } catch (err) {
      if (!isFacultyCoraChatHistoryUnavailable(err)) {
        console.warn("[FacultyCoraChat] Could not delete thread on server.", err)
      }
    }
  }

  return { threads, archivedThreads }
}

export async function renameFacultyCoraThread(
  instructorId: number,
  courseId: number,
  threadId: string,
  title: string,
  scope?: InstructorScope,
): Promise<{ threads: FacultyCoraChatThread[]; archivedThreads: FacultyCoraChatThread[] }> {
  const trimmed = title.trim()
  const store = await readStore(instructorId, courseId)
  if (!trimmed) {
    return { threads: store.threads, archivedThreads: store.archivedThreads }
  }

  const now = new Date().toISOString()
  const applyRename = (list: FacultyCoraChatThread[]) =>
    list.map((thread) =>
      thread.id === threadId ? { ...thread, title: trimmed, titleIsCustom: true, updatedAt: now } : thread,
    )

  const threads = applyRename(store.threads)
  const archivedThreads = applyRename(store.archivedThreads)
  await writeStore(instructorId, courseId, { ...store, threads, archivedThreads })

  const renamed = [...threads, ...archivedThreads].find((thread) => thread.id === threadId)
  if (scope && renamed) {
    try {
      await facultyCoraChatApi.upsertThread(scope, renamed)
    } catch (err) {
      if (!isFacultyCoraChatHistoryUnavailable(err)) {
        console.warn("[FacultyCoraChat] Could not sync renamed thread.", err)
      }
    }
  }

  return { threads, archivedThreads }
}

export async function archiveFacultyCoraThread(
  instructorId: number,
  courseId: number,
  threadId: string,
  scope?: InstructorScope,
): Promise<{ threads: FacultyCoraChatThread[]; archivedThreads: FacultyCoraChatThread[] }> {
  const store = await readStore(instructorId, courseId)
  const thread = store.threads.find((item) => item.id === threadId)
  if (!thread) {
    return { threads: store.threads, archivedThreads: store.archivedThreads }
  }

  const now = new Date().toISOString()
  const archivedThread: FacultyCoraChatThread = { ...thread, archivedAt: now, updatedAt: now }
  const threads = store.threads.filter((item) => item.id !== threadId)
  const archivedThreads = [archivedThread, ...store.archivedThreads.filter((item) => item.id !== threadId)]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_ARCHIVED_THREADS)
  const activeThreadId = store.activeThreadId === threadId ? null : store.activeThreadId

  await writeStore(instructorId, courseId, { ...store, threads, archivedThreads, activeThreadId })

  if (scope) {
    try {
      await facultyCoraChatApi.deleteThread(scope, threadId)
    } catch (err) {
      if (!isFacultyCoraChatHistoryUnavailable(err)) {
        console.warn("[FacultyCoraChat] Could not archive thread on server.", err)
      }
    }
  }

  return { threads, archivedThreads }
}

export async function restoreFacultyCoraThread(
  instructorId: number,
  courseId: number,
  threadId: string,
  scope?: InstructorScope,
): Promise<{ threads: FacultyCoraChatThread[]; archivedThreads: FacultyCoraChatThread[] }> {
  const store = await readStore(instructorId, courseId)
  const thread = store.archivedThreads.find((item) => item.id === threadId)
  if (!thread) {
    return { threads: store.threads, archivedThreads: store.archivedThreads }
  }

  const now = new Date().toISOString()
  const { archivedAt: _, ...rest } = thread
  const restored: FacultyCoraChatThread = { ...rest, updatedAt: now }
  const archivedThreads = store.archivedThreads.filter((item) => item.id !== threadId)
  const threads = [restored, ...store.threads.filter((item) => item.id !== threadId)]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_THREADS)

  await writeStore(instructorId, courseId, { ...store, threads, archivedThreads })

  if (scope) {
    try {
      await facultyCoraChatApi.upsertThread(scope, restored)
    } catch (err) {
      if (!isFacultyCoraChatHistoryUnavailable(err)) {
        console.warn("[FacultyCoraChat] Could not sync restored thread.", err)
      }
    }
  }

  return { threads, archivedThreads }
}

export async function clearFacultyCoraActiveThread(
  instructorId: number,
  courseId: number,
): Promise<void> {
  const store = await readStore(instructorId, courseId)
  await writeStore(instructorId, courseId, { ...store, activeThreadId: null })
}
