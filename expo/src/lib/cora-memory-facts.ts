import type { CoraLearningMemory, CoraLocalPrivacyStorage } from "./cora-learning-memory"
import type { StudentContextPayload } from "./student-context-api"

export type CoraMemoryFact = {
  id: string
  label: string
}

/** Derive visible memory facts — aligned with web deriveVisibleMemoryFacts (memory-focused subset). */
export function deriveVisibleMemoryFacts(
  storage: CoraLocalPrivacyStorage,
  ctx: StudentContextPayload | null | undefined,
): CoraMemoryFact[] {
  const facts: CoraMemoryFact[] = []
  const memory = storage.memory

  const focus = ctx?.strugglingTopics?.[0]
  if (focus && memory["remember-gaps"]) {
    facts.push({ id: `gap-${focus}`, label: `${focus} has been difficult recently` })
  }

  const strength = ctx?.strengths?.[0]
  if (strength && memory["remember-strengths"]) {
    facts.push({ id: `str-${strength}`, label: `You're stronger at ${strength}` })
  }

  const course = ctx?.account?.courseCode
  if (course && memory["use-course-progress"]) {
    facts.push({ id: "course", label: `You're working in ${course}` })
  }

  if (memory["detect-confusion"]) {
    facts.push({ id: "confusion", label: "Cora adapts when confusion is detected" })
  }

  if (memory["remember-preferences"]) {
    facts.push({ id: "preferences", label: "Your Cora preferences are remembered on this device" })
  }

  return facts.filter((f) => !storage.clearedMemoryIds.includes(f.id))
}

export function clearVisibleMemoryFacts(storage: CoraLocalPrivacyStorage, facts: CoraMemoryFact[]): CoraLocalPrivacyStorage {
  const ids = facts.map((fact) => fact.id)
  return {
    ...storage,
    clearedMemoryIds: [...new Set([...storage.clearedMemoryIds, ...ids])],
  }
}

export function restoreClearedMemoryFacts(storage: CoraLocalPrivacyStorage): CoraLocalPrivacyStorage {
  return { ...storage, clearedMemoryIds: [] }
}
