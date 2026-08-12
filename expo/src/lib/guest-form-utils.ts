export type GuestCourseOption = {
  id: number
  code?: string
  description?: string
}

export type GuestInstructorOption = {
  id: number
  name?: string
  username?: string
}

function courseKey(session: GuestCourseOption): string {
  return (session.code ?? session.description ?? `id-${session.id}`).trim().toUpperCase()
}

/** Collapse duplicate course codes from meta API (e.g. multiple BETA rows). */
export function dedupeGuestCourseOptions(sessions: GuestCourseOption[]): GuestCourseOption[] {
  const byCode = new Map<string, GuestCourseOption>()
  for (const session of sessions) {
    const key = courseKey(session)
    const existing = byCode.get(key)
    if (!existing) {
      byCode.set(key, session)
      continue
    }
    if (session.code?.trim().toUpperCase() === "GUEST") {
      byCode.set(key, session)
    }
  }

  return Array.from(byCode.values()).sort((a, b) => {
    if (a.code?.toUpperCase() === "GUEST") return -1
    if (b.code?.toUpperCase() === "GUEST") return 1
    return (a.code ?? a.description ?? "").localeCompare(b.code ?? b.description ?? "")
  })
}

export function pickDefaultGuestCourseId(sessions: GuestCourseOption[]): number | null {
  const deduped = dedupeGuestCourseOptions(sessions)
  const guest = deduped.find((s) => s.code?.trim().toUpperCase() === "GUEST")
  return guest?.id ?? deduped[0]?.id ?? null
}

export function guestCourseLabel(session: GuestCourseOption): string {
  if (session.code && session.description && session.code !== session.description) {
    return `${session.code} · ${session.description}`
  }
  return session.code ?? session.description ?? `Course ${session.id}`
}

export function guestInstructorLabel(instructor: GuestInstructorOption): string {
  return instructor.name ?? instructor.username ?? `Instructor ${instructor.id}`
}

export function dedupeGuestInstructors(instructors: GuestInstructorOption[]): GuestInstructorOption[] {
  const seen = new Set<number>()
  return instructors.filter((i) => {
    if (seen.has(i.id)) return false
    seen.add(i.id)
    return true
  })
}
