import type { StudentSession } from "./session"
import type { AttendanceLeaderboardEntry } from "./rewards-api"

type OfferingSession = Pick<StudentSession, "section" | "courseId" | "academicTermId">

function numeric(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function entrySection(entry: AttendanceLeaderboardEntry): string {
  return String(entry.section ?? entry.session ?? "").trim().toUpperCase()
}

/** Drop rows from another section / course / term when the API includes those fields. */
export function attendanceEntryMatchesOffering(
  entry: AttendanceLeaderboardEntry,
  session: OfferingSession,
): boolean {
  const code = entrySection(entry)
  if (code && session.section?.trim() && code !== session.section.trim().toUpperCase()) {
    return false
  }
  if (entry.course_id != null && session.courseId != null && Number(entry.course_id) !== Number(session.courseId)) {
    return false
  }
  if (
    entry.academic_term_id != null &&
    session.academicTermId != null &&
    Number(entry.academic_term_id) !== Number(session.academicTermId)
  ) {
    return false
  }
  return true
}

/**
 * A real term board has points or a streak. `classes_attended` alone is not enough —
 * production still copies that count from another ELEG offering while pts/streak stay 0.
 */
export function attendanceLeaderboardHasTermCheckIns(entries: AttendanceLeaderboardEntry[]): boolean {
  return entries.some((entry) => numeric(entry.total_points) > 0 || numeric(entry.current_streak) > 0)
}

/**
 * Fall 2026 ELEG sections have no attendance sessions yet. Production still returns
 * the roster (0 pts / 0% / 0 streak, sometimes with a leaked attended count).
 */
export function attendanceLeaderboardForCurrentOffering(
  entries: AttendanceLeaderboardEntry[],
  session: OfferingSession,
): AttendanceLeaderboardEntry[] {
  const scoped = entries.filter((entry) => attendanceEntryMatchesOffering(entry, session))
  if (!attendanceLeaderboardHasTermCheckIns(scoped)) return []
  return scoped
}

/** Clamp API placeholders (200%) and 0–1 ratios for display. */
export function attendanceDisplayPercent(value: unknown): number {
  const n = numeric(value)
  if (n > 0 && n <= 1) return Math.round(n * 100)
  if (n < 0 || n > 100) return 0
  return Math.round(n)
}
