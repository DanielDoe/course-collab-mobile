/** Device-local Cora learning memory — aligned with v0-coursecollabv3/lib/cora/preferences-storage.ts */
export type CoraLearningMemory = {
  "remember-gaps": boolean
  "detect-confusion": boolean
  "remember-strengths": boolean
  "use-course-progress": boolean
  "remember-preferences": boolean
}

export type CoraLocalPrivacyStorage = {
  localLearningMemory: boolean
  memory: CoraLearningMemory
  clearedMemoryIds: string[]
}

export const DEFAULT_CORA_LEARNING_MEMORY: CoraLearningMemory = {
  "remember-gaps": true,
  "detect-confusion": true,
  "remember-strengths": true,
  "use-course-progress": true,
  "remember-preferences": true,
}

export const DEFAULT_CORA_LOCAL_STORAGE: CoraLocalPrivacyStorage = {
  localLearningMemory: true,
  memory: { ...DEFAULT_CORA_LEARNING_MEMORY },
  clearedMemoryIds: [],
}

export const MEMORY_TOGGLE_META: Array<{
  id: keyof CoraLearningMemory
  label: string
  description: string
}> = [
  {
    id: "remember-gaps",
    label: "Remember learning gaps",
    description: "Remember concepts you repeatedly struggle with.",
  },
  {
    id: "detect-confusion",
    label: "Detect confusion",
    description: "Adjust explanations when Cora detects misunderstanding.",
  },
  {
    id: "remember-strengths",
    label: "Remember strengths",
    description: "Avoid over-explaining concepts you've mastered.",
  },
  {
    id: "use-course-progress",
    label: "Use my course progress",
    description: "Personalize using lectures, practice, and performance.",
  },
  {
    id: "remember-preferences",
    label: "Remember my preferences",
    description: "Keep teaching preferences across sessions on this device.",
  },
]

export function allMemoryDisabled(): CoraLearningMemory {
  return {
    "remember-gaps": false,
    "detect-confusion": false,
    "remember-strengths": false,
    "use-course-progress": false,
    "remember-preferences": false,
  }
}

export function learningMemoryForApi(storage: CoraLocalPrivacyStorage): CoraLearningMemory {
  if (!storage.localLearningMemory) return allMemoryDisabled()
  return { ...DEFAULT_CORA_LEARNING_MEMORY, ...storage.memory }
}

export function setAllMemoryToggles(
  storage: CoraLocalPrivacyStorage,
  enabled: boolean,
): CoraLocalPrivacyStorage {
  const memory = { ...DEFAULT_CORA_LEARNING_MEMORY }
  for (const key of Object.keys(memory) as Array<keyof CoraLearningMemory>) {
    memory[key] = enabled
  }
  return { ...storage, localLearningMemory: enabled, memory }
}

export function normalizeCoraLocalStorage(parsed: unknown): CoraLocalPrivacyStorage {
  if (!parsed || typeof parsed !== "object") return { ...DEFAULT_CORA_LOCAL_STORAGE, memory: { ...DEFAULT_CORA_LEARNING_MEMORY } }

  const raw = parsed as Record<string, unknown>
  const clearedMemoryIds = Array.isArray(raw.clearedMemoryIds)
    ? raw.clearedMemoryIds.filter((id): id is string => typeof id === "string")
    : []

  if (raw.memory && typeof raw.memory === "object") {
    const memoryRaw = raw.memory as Partial<CoraLearningMemory>
    const memory: CoraLearningMemory = {
      "remember-gaps": memoryRaw["remember-gaps"] !== false,
      "detect-confusion": memoryRaw["detect-confusion"] !== false,
      "remember-strengths": memoryRaw["remember-strengths"] !== false,
      "use-course-progress": memoryRaw["use-course-progress"] !== false,
      "remember-preferences": memoryRaw["remember-preferences"] !== false,
    }
    const localLearningMemory = raw.localLearningMemory !== false
    return {
      localLearningMemory,
      memory: localLearningMemory ? memory : allMemoryDisabled(),
      clearedMemoryIds,
    }
  }

  // Legacy camelCase format
  const legacyEnabled = raw.localLearningMemory !== false
  return {
    localLearningMemory: legacyEnabled,
    memory: {
      "remember-gaps": legacyEnabled && raw.rememberGaps !== false,
      "detect-confusion": legacyEnabled && raw.detectConfusion !== false,
      "remember-strengths": legacyEnabled,
      "use-course-progress": legacyEnabled,
      "remember-preferences": legacyEnabled,
    },
    clearedMemoryIds,
  }
}
