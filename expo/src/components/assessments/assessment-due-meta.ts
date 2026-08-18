export function dueMeta(until?: string): { label: string; urgent: boolean; past: boolean } {
  if (!until) return { label: "No due date", urgent: false, past: false }
  const d = new Date(until)
  if (Number.isNaN(d.getTime())) return { label: until, urgent: false, past: false }
  const now = Date.now()
  const diff = d.getTime() - now
  const past = diff < 0
  const urgent = !past && diff < 1000 * 60 * 60 * 48
  const label = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
  return { label: past ? `Ended ${label}` : `Due ${label}`, urgent, past }
}
