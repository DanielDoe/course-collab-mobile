/** Institution id lives on the faculty session (`universityId`). Same value, both header names. */
export function instructorInstitutionHeaders(
  institutionId?: number | null,
): Record<string, string> {
  if (institutionId == null || !Number.isFinite(institutionId) || institutionId <= 0) {
    return {}
  }
  const value = String(institutionId)
  return {
    "x-university-id": value,
    "x-institution-id": value,
  }
}
