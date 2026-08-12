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
