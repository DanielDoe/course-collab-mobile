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

export const FACULTY_MEMORY_TOGGLE_META: Array<{
  id: keyof CoraLearningMemory
  label: string
  description: string
}> = [
  {
    id: "remember-gaps",
    label: "Remember teaching gaps",
    description: "Remember topics your students miss most often.",
  },
  {
    id: "detect-confusion",
    label: "Detect repeated confusion",
    description: "Adjust explanations when Cora spots recurring misunderstandings.",
  },
  {
    id: "remember-strengths",
    label: "Remember course strengths",
    description: "Highlight areas where your class is performing well.",
  },
  {
    id: "use-course-progress",
    label: "Use course analytics",
    description: "Personalize using assessment trends, attendance, and practice data.",
  },
  {
    id: "remember-preferences",
    label: "Remember my teaching preferences",
    description: "Keep grading and explanation preferences on this device.",
  },
]

export const ADMIN_MEMORY_TOGGLE_META: Array<{
  id: keyof CoraLearningMemory
  label: string
  description: string
}> = [
  {
    id: "remember-gaps",
    label: "Remember operational gaps",
    description: "Remember recurring issues Cora surfaces across modules.",
  },
  {
    id: "detect-confusion",
    label: "Detect repeated questions",
    description: "Adjust guidance when you ask similar admin questions again.",
  },
  {
    id: "remember-strengths",
    label: "Remember resolved patterns",
    description: "Avoid re-explaining workflows you've already completed.",
  },
  {
    id: "use-course-progress",
    label: "Use institutional context",
    description: "Include aggregated enrollment, revenue, and support trends when authorized.",
  },
  {
    id: "remember-preferences",
    label: "Remember my admin preferences",
    description: "Keep reporting and workflow preferences on this device.",
  },
]

export const LEARNER_CONTEXT_CATEGORIES = [
  "Course enrollment and section",
  "Grades and assessment scores",
  "Upcoming deadlines and calendar events",
  "Topics you struggle with or excel at",
  "Note and flashcard titles (not full content unless attached)",
] as const

export const FACULTY_CONTEXT_CATEGORIES = [
  "Course code and section (never student names in external AI payloads)",
  "Assessment and quiz analytics (aggregated counts and trends)",
  "Question bank topics and difficulty patterns",
  "Attendance and practice hub summaries",
  "Office hours and support queue counts",
] as const

export const ADMIN_CONTEXT_CATEGORIES = [
  "Institution-wide enrollment and revenue aggregates",
  "Pseudonymized directory search matches (no names or emails in model payloads)",
  "Support ticket and submission-issue counts",
  "System health and audit log summaries",
  "Authorized admin module context for the task at hand",
] as const

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
