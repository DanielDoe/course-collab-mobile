/** Stable short diagnostic id for startup failures (no user data). */
export function startupBootDiagnosticId(message: string): string {
  let hash = 0
  for (let i = 0; i < message.length; i += 1) {
    hash = (hash * 31 + message.charCodeAt(i)) >>> 0
  }
  return `CC-BOOT-${hash.toString(16).toUpperCase().padStart(4, "0").slice(-4)}`
}
