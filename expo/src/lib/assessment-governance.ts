export const ASSESSMENT_PRIVILEGE_SOURCES = [
  "instructor_only",
  "membership_enabled",
  "hybrid",
] as const

export type AssessmentPrivilegeSource = (typeof ASSESSMENT_PRIVILEGE_SOURCES)[number]

export function parseAssessmentPrivilegeSource(raw: unknown): AssessmentPrivilegeSource {
  const v = String(raw ?? "").trim().toLowerCase()
  if (v === "membership_enabled" || v === "hybrid") return v
  return "instructor_only"
}
