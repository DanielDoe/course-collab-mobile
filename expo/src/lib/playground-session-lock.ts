import * as SecureStore from "./secure-store-client"

const LOCK_KEY = "course-collab.playground-session-lock"
const LAST_CLASSROOM_SESSION_KEY = "course-collab.playground-last-classroom-session"

export type PlaygroundSessionLock = {
  sessionId: number
  resultId: number
  mode: "CLASSROOM" | "PERSONAL"
  startedAt: number
  answeredQuestionIds: number[]
  /** Highest question index the student may view (forward-only). */
  lockedIndex: number
  completed?: boolean
}

export async function getPlaygroundSessionLock(): Promise<PlaygroundSessionLock | null> {
  try {
    const raw = await SecureStore.getItemAsync(LOCK_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PlaygroundSessionLock
  } catch {
    return null
  }
}

export async function setPlaygroundSessionLock(lock: PlaygroundSessionLock): Promise<void> {
  await SecureStore.setItemAsync(LOCK_KEY, JSON.stringify(lock))
}

export async function clearPlaygroundSessionLock(): Promise<void> {
  await SecureStore.deleteItemAsync(LOCK_KEY)
}

export async function upsertPlaygroundSessionLock(
  partial: Pick<PlaygroundSessionLock, "sessionId" | "resultId" | "mode"> &
    Partial<PlaygroundSessionLock>,
): Promise<PlaygroundSessionLock> {
  const existing = await getPlaygroundSessionLock()
  const resultChanged = existing != null && existing.resultId !== partial.resultId
  const next: PlaygroundSessionLock = {
    sessionId: partial.sessionId,
    resultId: partial.resultId,
    mode: partial.mode,
    startedAt: partial.startedAt ?? existing?.startedAt ?? Date.now(),
    answeredQuestionIds:
      partial.answeredQuestionIds ??
      (resultChanged ? [] : existing?.answeredQuestionIds ?? []),
    lockedIndex: partial.lockedIndex ?? (resultChanged ? 0 : existing?.lockedIndex ?? 0),
    completed: partial.completed ?? (resultChanged ? false : existing?.completed ?? false),
  }
  await setPlaygroundSessionLock(next)
  return next
}

export async function recordPlaygroundAnswerLock(
  questionId: number,
  nextIndex: number,
): Promise<void> {
  const lock = await getPlaygroundSessionLock()
  if (!lock) return
  const answered = lock.answeredQuestionIds.includes(questionId)
    ? lock.answeredQuestionIds
    : [...lock.answeredQuestionIds, questionId]
  await setPlaygroundSessionLock({
    ...lock,
    answeredQuestionIds: answered,
    lockedIndex: Math.max(lock.lockedIndex, nextIndex),
  })
}

export async function completePlaygroundSessionLock(): Promise<void> {
  const lock = await getPlaygroundSessionLock()
  if (!lock) return
  await setPlaygroundSessionLock({ ...lock, completed: true })
  await clearPlaygroundSessionLock()
}

export function playgroundLockRoute(lock: PlaygroundSessionLock): string {
  const params = `sessionId=${lock.sessionId}&resultId=${lock.resultId}`
  return lock.completed
    ? "/module/playground"
    : `/collaboration/playground/game?${params}`
}

/** Remember the latest live classroom session for hub → leaderboard navigation. */
export async function setLastPlaygroundClassroomSession(sessionId: number): Promise<void> {
  if (!Number.isFinite(sessionId) || sessionId <= 0) return
  await SecureStore.setItemAsync(LAST_CLASSROOM_SESSION_KEY, String(sessionId))
}

export async function getLastPlaygroundClassroomSession(): Promise<number | null> {
  try {
    const raw = await SecureStore.getItemAsync(LAST_CLASSROOM_SESSION_KEY)
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  } catch {
    return null
  }
}

export async function clearLastPlaygroundClassroomSession(sessionId?: number): Promise<void> {
  if (sessionId != null && Number.isFinite(sessionId)) {
    const current = await getLastPlaygroundClassroomSession()
    if (current !== sessionId) return
  }
  await SecureStore.deleteItemAsync(LAST_CLASSROOM_SESSION_KEY)
}
