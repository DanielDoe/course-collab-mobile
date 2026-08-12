type Listener = () => void

const listeners = new Set<Listener>()

export function emitPresenceUpdated(): void {
  for (const listener of listeners) listener()
}

export function subscribePresenceUpdated(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
