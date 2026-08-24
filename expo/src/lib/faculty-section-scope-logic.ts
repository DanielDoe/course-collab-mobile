import { filterRowsToCourseSessions } from "./faculty-projects-module-utils"
import { normalizeScheduleSectionCode } from "./schedule-adjustment/section-scope"

export type FacultySectionFilterSentinel = "all" | "ALL"

type ScopedRow = { session_code?: string | null; session?: string | null }

/** Offerings / picker rows for the instructor's active term only. */
export function facultyActiveTermCourses<T extends { is_active_term?: boolean }>(courses: T[]): T[] {
  return courses.filter((course) => course.is_active_term !== false)
}

/**
 * Resolve a stored course + section to a picker row, preferring the active term.
 * Avoids restoring Spring ELEG1304P01 when Fall ELEG1304P03 is the current offering.
 */
export function resolveFacultyStoredCourse<
  T extends { id: number; session_code?: string | null; is_active_term?: boolean },
>(courses: T[], courseId: number, sessionCode?: string | null): T | null {
  const matches = courses.filter((course) => course.id === courseId)
  if (matches.length === 0) return null

  const active = facultyActiveTermCourses(matches)
  const pool = active.length > 0 ? active : matches
  const normalized = sessionCode?.trim()
  if (normalized) {
    return pool.find((course) => course.session_code === normalized) ?? pool[0] ?? null
  }
  return pool.length === 1 ? pool[0]! : null
}

export function facultySessionCodesForScope(
  scope: { sessionCode?: string | null } | null,
  sessions: Array<{ code: string }>,
): string[] {
  const fromApi = sessions.map((session) => session.code).filter(Boolean)
  if (fromApi.length > 0) return fromApi
  const scoped = scope?.sessionCode?.trim()
  return scoped ? [scoped] : []
}

/** When a section row is selected in the shell, always scope module data to that section. */
export function effectiveFacultySectionCode(
  scope: { sessionCode?: string | null } | null,
  sessionFilter: string,
  sentinel: FacultySectionFilterSentinel = "all",
): string | undefined {
  const scoped = scope?.sessionCode?.trim()
  if (scoped) return scoped
  if (sessionFilter === sentinel || !sessionFilter.trim()) return undefined
  return sessionFilter.trim()
}

export function filterRowsToFacultySection<T>(
  rows: T[],
  sessionOf: (row: T) => string | undefined,
  scope: { sessionCode?: string | null } | null,
  sessionCodes: Iterable<string>,
): T[] {
  const active = scope?.sessionCode?.trim()
  if (active) {
    return filterRowsToCourseSessions(rows, sessionOf, [active])
  }
  return filterRowsToCourseSessions(rows, sessionOf, sessionCodes)
}

export function rowMatchesFacultySection(
  row: ScopedRow,
  scope: { sessionCode?: string | null } | null,
  sessionFilter: string,
  sentinel: FacultySectionFilterSentinel = "all",
): boolean {
  const active = effectiveFacultySectionCode(scope, sessionFilter, sentinel)
  if (!active) return true
  const rowCode = normalizeScheduleSectionCode(row.session_code ?? row.session)
  return rowCode === normalizeScheduleSectionCode(active)
}
