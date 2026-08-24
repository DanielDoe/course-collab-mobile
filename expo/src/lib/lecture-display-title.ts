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

function storedLectureTopic(title: string): string {
  const stripped = stripSharedLectureSeriesPrefix(title)
  const parts = stripped.split(/\s+[—–]\s+/)
  return parts.length > 1 ? parts.slice(1).join(" — ").trim() : stripped
}

/** Title shown in lists and the slide viewer — prefers the term syllabus name from production. */
export function lectureDisplayTitle(lecture: LectureTitleFields): string {
  const stored = lecture.title?.trim() || (lecture.week != null ? `Week ${lecture.week}` : "Lecture")
  const syllabus = parseLectureSyllabusReference(lecture.description)
  if (syllabus?.label) return syllabus.label
  return stripSharedLectureSeriesPrefix(stored)
}

/** Same syllabus week can cover two decks — keep list rows distinguishable. */
export function lectureListDisplayTitle(
  lecture: LectureTitleFields,
  siblings: readonly LectureTitleFields[] = [],
): string {
  const display = lectureDisplayTitle(lecture)
  const stored = lecture.title?.trim()
  if (!stored) return display
  const collisions = siblings.filter((item) => lectureDisplayTitle(item) === display)
  if (collisions.length < 2) return display
  const topic = storedLectureTopic(stored)
  if (!topic || display.toLowerCase().includes(topic.toLowerCase())) return display
  return `${display} · ${topic}`
}
