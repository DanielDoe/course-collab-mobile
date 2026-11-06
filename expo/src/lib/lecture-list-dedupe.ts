import type { LectureItem } from "./student-api"
import {
  isElegSharedLectureCourseCode,
  normalizeLectureDedupeKey,
} from "./lecture-index-label"

type DedupeRow = LectureItem & { course_id?: number | null }

/**
 * ELEG1301 / ELEG1304 share one content pool — production may return duplicate rows per catalog course.
 * Keep one row per (week, logical title), preferring the student's course and any saved progress.
 */
export function dedupeElegSharedLectureRows(
  rows: DedupeRow[],
  scopeCourseId: number,
  scopeSessionCode?: string | null,
): DedupeRow[] {
  const byKey = new Map<string, DedupeRow>()
  const sessionNeedle = String(scopeSessionCode ?? "")
    .trim()
    .toUpperCase()

  const score = (row: DedupeRow) => {
    let s = 0
    if (Number(row.course_id) === scopeCourseId) s += 4
    if (
      sessionNeedle &&
      String(row.session ?? "")
        .trim()
        .toUpperCase() === sessionNeedle
    ) {
      s += 2
    }
    if (Number(row.progress_percentage ?? 0) > 0) s += 1
    return s
  }

  for (const row of rows) {
    const week = Number(row.week)
    const key = `${week}:${normalizeLectureDedupeKey(String(row.title ?? ""))}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, row)
      continue
    }

    const rowScore = score(row)
    const existingScore = score(existing)
    if (rowScore > existingScore) {
      byKey.set(key, row)
    } else if (rowScore === existingScore && Number(row.id) < Number(existing.id)) {
      byKey.set(key, row)
    }
  }

  return [...byKey.values()].sort(
    (a, b) => Number(a.week) - Number(b.week) || Number(a.id) - Number(b.id),
  )
}

export function dedupeStudentLectureList(
  lectures: LectureItem[],
  opts: { courseId: number; courseCode?: string | null; section?: string | null },
): LectureItem[] {
  if (!isElegSharedLectureCourseCode(opts.courseCode)) return lectures
  return dedupeElegSharedLectureRows(lectures as DedupeRow[], opts.courseId, opts.section)
}

export { isElegSharedLectureCourseCode } from "./lecture-index-label"
