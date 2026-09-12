import type { InstructorCourse, InstructorSession } from "./instructor-api"
import { courseUsesLabSections } from "./course-sections"
import { facultySectionDisplayLabel } from "./faculty-section-label"

/** Shell / picker row — may represent a whole course or one section in the active term. */
export type FacultyCoursePickerItem = InstructorCourse & {
  picker_key: string
  picker_display_title: string
  picker_display_subtitle: string
  picker_is_section_row: boolean
  session_id?: number | null
  session_code?: string | null
}

export type FacultyTermOffering = InstructorCourse & {
  course_id?: number
  session_id?: number | null
  session_code?: string | null
  catalog_course_code?: string | null
}

export function coursePickerKey(courseId: number, sessionId?: number | null): string {
  return sessionId != null ? `course-${courseId}-session-${sessionId}` : `course-${courseId}`
}

export function offeringToBaseCourse(offering: FacultyTermOffering): InstructorCourse {
  const courseId = Number(offering.course_id ?? offering.id)
  const catalogCode = offering.catalog_course_code?.trim()
  return {
    ...offering,
    id: courseId,
    course_code: catalogCode || offering.course_code,
    course_title: offering.course_title,
  }
}

export function offeringToSession(offering: FacultyTermOffering): InstructorSession | null {
  const sessionId = offering.session_id != null ? Number(offering.session_id) : 0
  const sessionCode = offering.session_code?.trim() || offering.course_code?.trim()
  if (!Number.isFinite(sessionId) || sessionId <= 0 || !sessionCode) return null
  return {
    id: sessionId,
    code: sessionCode,
    academic_term_id: offering.academic_term_id ?? null,
  }
}

export function asCoursePickerItem(
  course: InstructorCourse,
  opts?: {
    session?: InstructorSession | null
    isSectionRow?: boolean
  },
): FacultyCoursePickerItem {
  const session = opts?.session ?? null
  const isSectionRow = opts?.isSectionRow === true && session != null
  const sectionLabel =
    session != null ? facultySectionDisplayLabel(course.course_code, session.code) : null

  return {
    ...course,
    // Prefer the selected section's term so APIs can distinguish reused codes (e.g. ELEG1301P01 Fall vs Spring).
    academic_term_id: session?.academic_term_id ?? course.academic_term_id ?? null,
    picker_key: coursePickerKey(course.id, session?.id),
    picker_display_title: isSectionRow ? (sectionLabel ?? session!.code) : course.course_title,
    picker_display_subtitle: course.course_code,
    picker_is_section_row: isSectionRow,
    session_id: session?.id ?? null,
    session_code: session?.code ?? null,
  }
}

function sessionsForCourse(
  course: InstructorCourse,
  sessions: InstructorSession[],
): InstructorSession[] {
  const forTerm = sessions.filter((session) => {
    if (course.academic_term_id == null || session.academic_term_id == null) return true
    return session.academic_term_id === course.academic_term_id
  })
  return forTerm.length > 0 ? forTerm : sessions
}

/** Active term offerings from GET /courses — one row per section when 2+ offerings share a course_id. */
export function expandFacultyOfferingsForActiveTerm(
  offerings: FacultyTermOffering[],
): FacultyCoursePickerItem[] {
  const byCourseId = new Map<number, FacultyTermOffering[]>()

  for (const offering of offerings) {
    const courseId = Number(offering.course_id ?? offering.id)
    if (!Number.isFinite(courseId) || courseId <= 0) continue
    const rows = byCourseId.get(courseId) ?? []
    rows.push(offering)
    byCourseId.set(courseId, rows)
  }

  const items: FacultyCoursePickerItem[] = []
  const groups = [...byCourseId.values()].sort((a, b) =>
    (a[0]?.course_title ?? "").localeCompare(b[0]?.course_title ?? ""),
  )

  for (const rows of groups) {
    const base = offeringToBaseCourse(rows[0]!)
    const sessions = rows
      .map(offeringToSession)
      .filter((session): session is InstructorSession => session != null)
      .sort((a, b) => a.code.localeCompare(b.code))

    if (sessions.length <= 1) {
      const session = sessions[0] ?? null
      const showSection =
        session != null &&
        courseUsesLabSections(base.course_code) &&
        session.code.trim().toUpperCase() !== base.course_code.trim().toUpperCase()
      items.push(asCoursePickerItem(base, { session, isSectionRow: showSection }))
      continue
    }

    for (const session of sessions) {
      items.push(asCoursePickerItem(base, { session, isSectionRow: true }))
    }
  }

  return items
}

/** Fallback when offerings are unavailable — uses GET /sessions per course. */
export function expandFacultyCoursesForActiveTerm(
  courses: InstructorCourse[],
  sessionsByCourseId: ReadonlyMap<number, InstructorSession[]>,
): FacultyCoursePickerItem[] {
  const items: FacultyCoursePickerItem[] = []

  for (const course of courses) {
    const sessions = sessionsForCourse(course, sessionsByCourseId.get(course.id) ?? [])
    if (sessions.length <= 1) {
      const session = sessions[0] ?? null
      const showSection =
        session != null &&
        courseUsesLabSections(course.course_code) &&
        session.code.trim().toUpperCase() !== course.course_code.trim().toUpperCase()
      items.push(asCoursePickerItem(course, { session, isSectionRow: showSection }))
      continue
    }

    for (const session of sessions.sort((a, b) => a.code.localeCompare(b.code))) {
      items.push(asCoursePickerItem(course, { session, isSectionRow: true }))
    }
  }

  return items
}

export function facultyPickerItemMatchesSelection(
  selected: InstructorCourse | null | undefined,
  item: InstructorCourse,
): boolean {
  if (!selected || selected.id !== item.id) return false
  const selectedKey =
    "picker_key" in selected && typeof selected.picker_key === "string"
      ? selected.picker_key
      : coursePickerKey(selected.id, selected.session_id)
  const itemKey =
    "picker_key" in item && typeof item.picker_key === "string"
      ? item.picker_key
      : coursePickerKey(item.id, item.session_id)
  return selectedKey === itemKey
}
