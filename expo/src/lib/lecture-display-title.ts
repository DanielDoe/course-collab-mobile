import { formatElegLectureDisplayTitle } from "./lecture-index-label"

export type LectureTitleFields = {
  title?: string | null
  week?: number | null
  description?: string | null
}

const SYLLABUS_REFERENCE =
  /Syllabus reference\s*\(([^)]+)\):\s*(.+?)(?:\.\s*See the course syllabus|\.\s*$|$)/i

/** Fall 2026 (and later) web titles are stored as a syllabus reference in the description. */
export function parseLectureSyllabusReference(
  description?: string | null,
): { term: string; label: string } | null {
  if (!description?.trim()) return null
  const match = description.match(SYLLABUS_REFERENCE)
  if (!match) return null
  const term = match[1].trim()
  const label = match[2].trim().replace(/\s+\.$/, "").trim()
  if (!term || !label) return null
  return { term, label }
}

/** Shared ELEG 130X catalog prefix — not the Fall 2026 section title. */
export function stripSharedLectureSeriesPrefix(title: string): string {
  const stripped = title.replace(/^ELEG\s*130X:\s*/i, "").trim()
  return stripped || title
}

/** Match web student lectures list — scoped catalog title with lecture prefix stripped. */
export function displayLectureTitle(
  title: string | null | undefined,
  courseCode?: string | null,
): string {
  const formatted = formatElegLectureDisplayTitle(String(title ?? ""), courseCode)
  const stripped = formatted
    .replace(/^ECE\s*2202:\s*Circuit Analysis II\s*[—–-]\s*/i, "")
    .replace(/^ELEG\s*130[14]:\s*Lecture\s+\d+\s*[—–-]\s*/i, "")
    .replace(/^ELEG\s*130X:\s*Lecture\s+\d+\s*[—–-]\s*/i, "")
    .replace(/^Lecture\s+(\d+):\s*/i, "Lecture $1 · ")
    .trim()
  if (stripped) return stripped
  return stripSharedLectureSeriesPrefix(formatted).trim() || formatted.trim()
}

function storedLectureTopic(title: string, courseCode?: string | null): string {
  const display = displayLectureTitle(title, courseCode)
  const formatted = formatElegLectureDisplayTitle(title, courseCode)
  const parts = stripSharedLectureSeriesPrefix(formatted).split(/\s+[—–]\s+/)
  const tail = parts.length > 1 ? parts.slice(1).join(" — ").trim() : parts[0]?.trim() ?? ""
  if (tail && !display.toLowerCase().includes(tail.toLowerCase())) return tail
  return ""
}

/** Title shown in lists and the slide viewer — matches web student lectures. */
export function lectureDisplayTitle(
  lecture: LectureTitleFields,
  courseCode?: string | null,
): string {
  const stored = lecture.title?.trim()
  if (stored) return displayLectureTitle(stored, courseCode)
  if (lecture.week != null) return `Week ${lecture.week}`
  return "Lecture"
}

/** Same catalog topic can appear twice — keep list rows distinguishable. */
export function lectureListDisplayTitle(
  lecture: LectureTitleFields,
  siblings: readonly LectureTitleFields[] = [],
  courseCode?: string | null,
): string {
  const display = lectureDisplayTitle(lecture, courseCode)
  const stored = lecture.title?.trim()
  if (!stored) return display

  const collisions = siblings.filter(
    (item) => lectureDisplayTitle(item, courseCode) === display,
  )
  if (collisions.length < 2) return display

  const topic = storedLectureTopic(stored, courseCode)
  if (!topic) return display
  return `${display} · ${topic}`
}
