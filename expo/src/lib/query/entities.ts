export type OptimisticFlag = { optimistic?: boolean }

export function createTempId(): string {
  return `temp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** Negative numeric ids stay typed as number for existing note/deck routes. */
export function createTempNumericId(): number {
  return -Math.floor(Date.now() + Math.random() * 1000)
}

export function isTempId(id: string | number): boolean {
  if (typeof id === "string") return id.startsWith("temp_")
  return Number.isFinite(id) && id < 0
}

export function replaceById<T extends { id: string | number }>(
  items: T[],
  id: string | number,
  next: T,
): T[] {
  return items.map((item) => (String(item.id) === String(id) ? next : item))
}

export function removeById<T extends { id: string | number }>(items: T[], id: string | number): T[] {
  return items.filter((item) => String(item.id) !== String(id))
}

export function upsertById<T extends { id: string | number }>(items: T[], item: T): T[] {
  const idx = items.findIndex((row) => String(row.id) === String(item.id))
  if (idx === -1) return [item, ...items]
  const next = items.slice()
  next[idx] = { ...next[idx], ...item }
  return next
}

export function replaceTempWithAuthoritative<T extends { id: string | number }>(
  items: T[],
  tempId: string | number,
  authoritative: T,
): T[] {
  const withoutDup = items.filter(
    (item) =>
      String(item.id) !== String(tempId) && String(item.id) !== String(authoritative.id),
  )
  return [authoritative, ...withoutDup]
}
