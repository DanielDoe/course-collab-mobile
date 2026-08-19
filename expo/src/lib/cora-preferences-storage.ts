import { documentDirectory, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy"
import {
  DEFAULT_CORA_LOCAL_STORAGE,
  DEFAULT_CORA_LEARNING_MEMORY,
  normalizeCoraLocalStorage,
  type CoraLearningMemory,
  type CoraLocalPrivacyStorage,
} from "./cora-learning-memory"
import {
  clearVisibleMemoryFacts,
  deriveVisibleMemoryFacts,
  type CoraMemoryFact,
} from "./cora-memory-facts"
import {
  DEFAULT_CORA_SERVER_PRIVACY,
  type CoraServerPrivacySettings,
} from "./cora-privacy-api"
import type { StudentContextPayload } from "./student-context-api"

export type { CoraLearningMemory, CoraLocalPrivacyStorage } from "./cora-learning-memory"

/** Combined view for chat — server fields from API, local from device file. */
export type CoraPreferences = CoraServerPrivacySettings & CoraLocalPrivacyStorage

function storagePath(studentId: string): string {
  return `cora-preferences-${studentId}.json`
}

export async function loadCoraLocalPreferences(studentId: string): Promise<CoraLocalPrivacyStorage> {
  try {
    if (!documentDirectory) {
      return { ...DEFAULT_CORA_LOCAL_STORAGE, memory: { ...DEFAULT_CORA_LEARNING_MEMORY } }
    }
    const raw = await readAsStringAsync(`${documentDirectory}${storagePath(studentId)}`)
    return normalizeCoraLocalStorage(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_CORA_LOCAL_STORAGE, memory: { ...DEFAULT_CORA_LEARNING_MEMORY } }
  }
}

export async function saveCoraLocalPreferences(
  studentId: string,
  prefs: CoraLocalPrivacyStorage,
): Promise<void> {
  try {
    if (!documentDirectory) return
    await writeAsStringAsync(`${documentDirectory}${storagePath(studentId)}`, JSON.stringify(prefs))
  } catch {
    /* non-fatal */
  }
}

/** @deprecated Prefer loadCoraLocalPreferences + fetchCoraServerPrivacy */
export async function loadCoraPreferences(studentId: string): Promise<CoraPreferences> {
  const local = await loadCoraLocalPreferences(studentId)
  return { ...DEFAULT_CORA_SERVER_PRIVACY, ...local }
}

/** Clear visible derived memory facts (matches web clearLocalLearningMemory). */
export async function clearCoraLearningMemory(
  studentId: string,
  ctx?: StudentContextPayload | null,
): Promise<CoraLocalPrivacyStorage> {
  const current = await loadCoraLocalPreferences(studentId)
  const facts = deriveVisibleMemoryFacts(current, ctx)
  const next = clearVisibleMemoryFacts(current, facts)
  await saveCoraLocalPreferences(studentId, next)
  return next
}

export async function removeCoraMemoryFact(
  studentId: string,
  factId: string,
  current?: CoraLocalPrivacyStorage,
): Promise<CoraLocalPrivacyStorage> {
  const base = current ?? (await loadCoraLocalPreferences(studentId))
  const next = {
    ...base,
    clearedMemoryIds: [...new Set([...base.clearedMemoryIds, factId])],
  }
  await saveCoraLocalPreferences(studentId, next)
  return next
}

export async function restoreCoraMemoryFacts(studentId: string): Promise<CoraLocalPrivacyStorage> {
  const current = await loadCoraLocalPreferences(studentId)
  const next = { ...current, clearedMemoryIds: [] }
  await saveCoraLocalPreferences(studentId, next)
  return next
}

export { deriveVisibleMemoryFacts, type CoraMemoryFact }
