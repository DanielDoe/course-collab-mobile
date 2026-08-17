import type { StudentSession } from "./session"
import {
  loadChatSession,
  persistRecoveredThreads,
  upsertActiveThreads,
  type AiTutorChatThread,
} from "./ai-tutor-chat-storage"
import { getWorkspaceConversations } from "./cora-api"
import { restoreImportedQuestionsInThreads } from "./cora-import-recovery"
import {
  mergeConversationThreads,
  workspaceConversationToThread,
  type WorkspaceConversation,
} from "./cora-workspace-conversations"

export type CoraChatLocalSession = Awaited<ReturnType<typeof loadChatSession>>

export type CoraChatHydrationResult = {
  threads: AiTutorChatThread[]
  archivedThreads: AiTutorChatThread[]
  activeThreadId: string | null
  activeMessages: AiTutorChatThread["messages"] | null
}

function splitRecoveredThreads(
  local: CoraChatLocalSession,
  recovered: AiTutorChatThread[],
): { threads: AiTutorChatThread[]; archivedThreads: AiTutorChatThread[] } {
  const byId = new Map(recovered.map((thread) => [thread.id, thread]))
  return {
    threads: local.threads.map((thread) => byId.get(thread.id) ?? thread),
    archivedThreads: local.archivedThreads.map((thread) => byId.get(thread.id) ?? thread),
  }
}

function resolveActiveMessages(
  threads: AiTutorChatThread[],
  archivedThreads: AiTutorChatThread[],
  activeThreadId: string | null,
): AiTutorChatThread["messages"] | null {
  if (!activeThreadId) return null
  const thread =
    threads.find((entry) => entry.id === activeThreadId) ??
    archivedThreads.find((entry) => entry.id === activeThreadId)
  return thread?.messages ?? null
}

/** Disk cache — should paint the UI immediately. */
export async function loadLocalCoraChatSession(studentId: string): Promise<CoraChatLocalSession> {
  return loadChatSession(studentId)
}

/** Remote merge + import recovery — safe to run after local paint. */
export async function syncCoraChatHistory(
  session: StudentSession,
  local: CoraChatLocalSession,
  preferredActiveThreadId?: string | null,
): Promise<CoraChatHydrationResult> {
  let threads = local.threads
  let archivedThreads = local.archivedThreads

  try {
    const remoteRaw = await getWorkspaceConversations(session)
    const remote = (remoteRaw as WorkspaceConversation[]).map(workspaceConversationToThread)
    const remoteActive = remote.filter((thread) => !thread.archivedAt)
    const remoteArchived = remote.filter((thread) => Boolean(thread.archivedAt))
    const archivedIds = new Set([
      ...archivedThreads.map((thread) => thread.id),
      ...remoteArchived.map((thread) => thread.id),
    ])
    threads = mergeConversationThreads(remoteActive, threads, archivedIds)
    // Merge archived lists (server + local) so web/mobile stay aligned
    const archivedById = new Map<string, AiTutorChatThread>()
    for (const thread of archivedThreads) archivedById.set(thread.id, thread)
    for (const thread of remoteArchived) {
      const existing = archivedById.get(thread.id)
      if (!existing) {
        archivedById.set(thread.id, thread)
        continue
      }
      const remoteTime = new Date(thread.updatedAt).getTime()
      const localTime = new Date(existing.updatedAt).getTime()
      archivedById.set(thread.id, remoteTime >= localTime ? thread : existing)
    }
    archivedThreads = [...archivedById.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  } catch {
    /* keep local cache when remote history is unavailable */
  }

  const combined = [...threads, ...archivedThreads]
  const recovery = await restoreImportedQuestionsInThreads(session, combined)
  if (recovery.changed) {
    const split = splitRecoveredThreads({ ...local, threads, archivedThreads }, recovery.threads)
    threads = split.threads
    archivedThreads = split.archivedThreads

    await persistRecoveredThreads(session.databaseId, [...threads, ...archivedThreads])
  }

  await upsertActiveThreads(session.databaseId, threads)

  const activeThreadId = preferredActiveThreadId ?? local.activeThreadId
  const activeMessages = resolveActiveMessages(threads, archivedThreads, activeThreadId)

  return {
    threads,
    archivedThreads,
    activeThreadId,
    activeMessages,
  }
}
