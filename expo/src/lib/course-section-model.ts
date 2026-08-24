/** Mirrors v0-coursecollabv3/lib/course-section-model.ts (signup section picker). */
export function normalizeCatalogCourseCode(courseCode: string | null | undefined): string {
  return String(courseCode ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
}

export function courseUsesLabSections(courseCode: string | null | undefined): boolean {
  return normalizeCatalogCourseCode(courseCode) !== "ECE2202"
}
