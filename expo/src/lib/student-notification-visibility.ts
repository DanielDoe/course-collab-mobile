const INTERNAL_AUDIT_PATTERN = /AUDIT-DELETE|Production audit probe|do not keep/i
const FACULTY_INBOX_PATTERN =
  /\/instructor\/|\/faculty\/|faculty dashboard|instructor dashboard|instructor notification/i

export function isStudentVisibleNotification(item: {
  title?: string | null
  message?: string | null
  link?: string | null
  type?: string | null
}): boolean {
  const blob = `${item.title ?? ""}\n${item.message ?? ""}\n${item.link ?? ""}`
  if (INTERNAL_AUDIT_PATTERN.test(blob)) return false
  if (FACULTY_INBOX_PATTERN.test(blob)) return false

  const normalizedType = typeof item.type === "string" ? item.type.toLowerCase() : ""
  if (normalizedType === "instructor" || normalizedType === "faculty") return false

  return true
}
