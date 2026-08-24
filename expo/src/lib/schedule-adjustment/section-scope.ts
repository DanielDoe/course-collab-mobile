export function normalizeScheduleSectionCode(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase()
}

export function scheduleAdjustmentMatchesSection(
  sectionCode: string | null | undefined,
  activeSectionCode: string | null | undefined,
): boolean {
  const active = normalizeScheduleSectionCode(activeSectionCode)
  if (!active) return true
  const row = normalizeScheduleSectionCode(sectionCode)
  return row === active
}

/** Course-level schedule-adjustment APIs return all sections; scope to the active section in UI. */
export function filterScheduleAdjustmentsToSection<T extends { section_code?: string | null }>(
  requests: T[],
  activeSectionCode: string | null | undefined,
): T[] {
  const active = normalizeScheduleSectionCode(activeSectionCode)
  if (!active) return requests
  return requests.filter((row) => scheduleAdjustmentMatchesSection(row.section_code, active))
}
