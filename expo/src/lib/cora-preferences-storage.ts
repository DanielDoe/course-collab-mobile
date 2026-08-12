import { documentDirectory, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy"

export type CoraLearningMemory = {
  rememberGaps: boolean
  detectConfusion: boolean
}

const DEFAULT_MEMORY: CoraLearningMemory = {
  rememberGaps: true,
  detectConfusion: true,
}

function storagePath(studentId: string): string {
  return `cora-preferences-${studentId}.json`
}

export async function loadCoraPreferences(studentId: string): Promise<CoraLearningMemory> {
  try {
    if (!documentDirectory) return DEFAULT_MEMORY
    const raw = await readAsStringAsync(`${documentDirectory}${storagePath(studentId)}`)
    const parsed = JSON.parse(raw) as Partial<CoraLearningMemory>
    return {
      rememberGaps: parsed.rememberGaps ?? DEFAULT_MEMORY.rememberGaps,
      detectConfusion: parsed.detectConfusion ?? DEFAULT_MEMORY.detectConfusion,
    }
  } catch {
    return DEFAULT_MEMORY
  }
}

export async function saveCoraPreferences(
  studentId: string,
  prefs: CoraLearningMemory,
): Promise<void> {
  try {
    if (!documentDirectory) return
    await writeAsStringAsync(`${documentDirectory}${storagePath(studentId)}`, JSON.stringify(prefs))
  } catch {
    /* non-fatal */
  }
}
