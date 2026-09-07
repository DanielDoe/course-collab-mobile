/** Forward the faculty-scoped class section; omit when the course is section-wide. */
export function playgroundCreateAllowedSessions(sessionId?: number | null): number[] | null {
  if (sessionId == null || !Number.isFinite(sessionId) || sessionId <= 0) return null
  return [Math.trunc(sessionId)]
}

/** Product rule: empty topic chips means “use every eligible topic”. */
export function resolvePlaygroundCreateTopics(selectedTopics: string[], allTopics: string[]): string[] {
  const selected = selectedTopics.map((t) => t.trim()).filter(Boolean)
  if (selected.length) return selected
  return allTopics.map((t) => t.trim()).filter(Boolean)
}

export function playgroundCreateSourceError(topics: string[], questionIds?: number[]): string | null {
  if (topics.length > 0 || (questionIds?.length ?? 0) > 0) return null
  return "Select at least one topic or question."
}

export function canCreatePlaygroundSession(topics: string[], questionIds?: number[]): boolean {
  return playgroundCreateSourceError(topics, questionIds) == null
}
