const epochs = new Map<string, number>()

export function resourceVersionKey(kind: string, id: string | number): string {
  return `${kind}:${id}`
}

export function nextMutationVersion(resourceKey: string): number {
  const next = (epochs.get(resourceKey) ?? 0) + 1
  epochs.set(resourceKey, next)
  return next
}

export function isStaleMutation(resourceKey: string, version: number): boolean {
  return (epochs.get(resourceKey) ?? 0) !== version
}

export function resetMutationVersions(): void {
  epochs.clear()
}
