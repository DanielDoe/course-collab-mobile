import type { InstructorCourse } from "./instructor-api"

export type FacultyCourseOfferingRow = InstructorCourse & {
  course_id: number
  academic_term_id?: number | null
  term_label?: string | null
  is_active_term?: boolean
  description?: string | null
}

export function normalizeFacultyCourseOfferings(
  raw: Array<Record<string, unknown>>,
): FacultyCourseOfferingRow[] {
  const rows: FacultyCourseOfferingRow[] = []
  for (const row of raw) {
    const courseId = Number(row.course_id ?? row.id ?? 0)
    if (!Number.isFinite(courseId) || courseId <= 0) continue
    const sessionId =
      row.session_id != null && Number.isFinite(Number(row.session_id))
        ? Number(row.session_id)
        : null
    rows.push({
      id: courseId,
      course_id: courseId,
      course_code: String(row.course_code ?? ""),
      course_title: String(row.course_title ?? ""),
      university: row.university != null ? String(row.university) : null,
      semester: row.semester != null ? String(row.semester) : null,
      staff_role: row.staff_role != null ? String(row.staff_role) : undefined,
      academic_term_id:
        row.academic_term_id != null && Number.isFinite(Number(row.academic_term_id))
          ? Number(row.academic_term_id)
          : null,
      term_label:
        row.term_label != null
          ? String(row.term_label)
          : row.semester != null
            ? String(row.semester)
            : null,
      is_active_term: row.is_active_term === true,
      description: row.description != null ? String(row.description) : null,
      session_id: sessionId,
      session_code: row.session_code != null && String(row.session_code).trim()
        ? String(row.session_code)
        : null,
      picker_key: row.picker_key != null ? String(row.picker_key) : undefined,
    })
  }
  return rows
}

/** One row per course + term + section. Identical API duplicates collapse. */
export function flattenFacultyCourseOfferings(offerings: FacultyCourseOfferingRow[]): FacultyCourseOfferingRow[] {
  const unique = new Map<string, FacultyCourseOfferingRow>()
  for (const offering of offerings) {
    const key = facultyOfferingKey(offering)
    const existing = unique.get(key)
    if (!existing || (offering.is_active_term && !existing.is_active_term)) {
      unique.set(key, offering)
    }
  }
  return [...unique.values()].sort((a, b) => {
    const title = a.course_title.localeCompare(b.course_title)
    if (title !== 0) return title
    const term = (a.term_label ?? "").localeCompare(b.term_label ?? "")
    if (term !== 0) return term
    return (a.session_code ?? "").localeCompare(b.session_code ?? "")
  })
}

/** Legacy list: one row per course id, prefer active-term offering. */
export function dedupeFacultyCourseOfferings(offerings: FacultyCourseOfferingRow[]): FacultyCourseOfferingRow[] {
  const byCourse = new Map<number, FacultyCourseOfferingRow>()
  for (const offering of offerings) {
    const existing = byCourse.get(offering.course_id)
    if (!existing || (offering.is_active_term && !existing.is_active_term)) {
      byCourse.set(offering.course_id, offering)
    }
  }
  return [...byCourse.values()].sort((a, b) => a.course_title.localeCompare(b.course_title))
}

export function facultyOfferingKey(
  row: Pick<
    FacultyCourseOfferingRow,
    "course_id" | "academic_term_id" | "session_id" | "session_code" | "picker_key"
  >,
): string {
  if (row.picker_key) return row.picker_key
  const sessionPart =
    row.session_id != null && Number.isFinite(row.session_id)
      ? `s${row.session_id}`
      : row.session_code
        ? `c${row.session_code}`
        : ""
  return `${row.course_id}:${row.academic_term_id ?? 0}:${sessionPart}`
}
