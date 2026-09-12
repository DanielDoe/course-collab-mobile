export type CodebenchClassroomAssignment = {
  id: number
  title: string
  attempted?: boolean
  pending?: boolean
  expires_at?: string | null
  submission_kind?: string
}

export function isCodeClassroomAssignment(submission: { submission_kind?: string }): boolean {
  return String(submission.submission_kind ?? "code").toLowerCase() !== "solution"
}

export function filterOpenCodeClassroomAssignments<T extends CodebenchClassroomAssignment>(
  rows: T[],
  options?: { now?: number; excludeIds?: Iterable<string | number> },
): T[] {
  const now = options?.now ?? Date.now()
  const exclude = new Set(
    [...(options?.excludeIds ?? [])].map((id) => String(id)).filter((id) => id.length > 0),
  )
  return rows.filter((row) => {
    if (!Number.isFinite(row.id)) return false
    if (exclude.has(String(row.id))) return false
    if (!isCodeClassroomAssignment(row)) return false
    if (row.attempted || row.pending) return false
    if (!row.expires_at) return true
    const exp = new Date(row.expires_at).getTime()
    return !Number.isFinite(exp) || exp > now
  })
}
