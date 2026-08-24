/** Fall 2026 ELEG offerings — own groups/projects, no copied attendance. */
export const FALL_2026_ELEG_SESSION_CODES = [
  "ELEG1301P01",
  "ELEG1301P02",
  "ELEG1304P03",
] as const

export type Fall2026ElegSessionCode = (typeof FALL_2026_ELEG_SESSION_CODES)[number]

export function isFall2026ElegSession(sessionCode: string | null | undefined): boolean {
  const normalized = String(sessionCode ?? "").trim().toUpperCase()
  if (!normalized) return false
  return FALL_2026_ELEG_SESSION_CODES.some((code) => code.toUpperCase() === normalized)
}

/** True when the faculty filter is one Fall 2026 ELEG section, or ALL across only those sections. */
export function isFall2026ElegOffering(
  sectionCode: string | null | undefined,
  courseSessionCodes: readonly string[] = [],
): boolean {
  if (isFall2026ElegSession(sectionCode)) return true
  const normalized = String(sectionCode ?? "").trim().toUpperCase()
  if (normalized && normalized !== "ALL") return false
  const codes = courseSessionCodes.map((code) => code.trim()).filter(Boolean)
  return codes.length > 0 && codes.every(isFall2026ElegSession)
}
