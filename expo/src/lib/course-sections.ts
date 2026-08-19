/** Normalize catalog course codes (e.g. "ECE 2202" → ECE2202). */
export function normalizeCatalogCourseCode(courseCode: string | null | undefined): string {
  return String(courseCode ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
}

/** ELEG courses use lecture/lab section codes; ECE 2202 is a single roster. */
export function courseUsesLabSections(courseCode: string | null | undefined): boolean {
  return normalizeCatalogCourseCode(courseCode) !== "ECE2202"
}

function tokenMatchesCourseOrSession(
  token: string,
  courseCode: string,
  sessionCodes: string[],
): boolean {
  if (!token) return false
  if (token === courseCode || (courseCode && token.startsWith(courseCode))) return true
  return sessionCodes.some((code) => {
    const allowed = normalizeCatalogCourseCode(code)
    return Boolean(allowed) && (token === allowed || token.startsWith(allowed))
  })
}

/** True when a denormalized section/session belongs to the selected catalog course. */
export function evaluationRowBelongsToCourse(
  row: { section?: string | null; session?: string | null },
  courseCode: string | null | undefined,
  sessionCodes: string[] = [],
): boolean {
  const course = normalizeCatalogCourseCode(courseCode)
  if (!course && sessionCodes.length === 0) return true
  const tokens = [row.section, row.session].map((value) => normalizeCatalogCourseCode(value)).filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.some((token) => tokenMatchesCourseOrSession(token, course, sessionCodes))
}

/** Section query values that match ECE 2202 / ELEG catalog codes on production results APIs. */
export function assessmentResultSectionHints(input: {
  sessionCode?: string
  courseCode?: string | null
  sessionCodes?: string[]
}): string[] {
  const hints = new Set<string>()
  const add = (raw?: string | null) => {
    const trimmed = String(raw ?? "").trim()
    if (!trimmed) return
    hints.add(trimmed)
    const compact = normalizeCatalogCourseCode(trimmed)
    if (compact) hints.add(compact)
    if (compact === "ECE2202") {
      hints.add("ECE 2202")
      hints.add("ECE2202P01")
    }
  }
  add(input.sessionCode)
  add(input.courseCode)
  for (const code of input.sessionCodes ?? []) add(code)
  return [...hints]
}
