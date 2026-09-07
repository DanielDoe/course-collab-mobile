/** Clean section picker copy — never dump the raw catalog/schedule blob as the row title. */

export function shortenFacultySessionDescription(
  description: string | null | undefined,
  code: string,
): string | undefined {
  let text = (description ?? "").replace(/\s+/g, " ").trim()
  if (!text) return undefined

  const normalizedCode = code.trim()
  if (normalizedCode && text.toUpperCase() === normalizedCode.toUpperCase()) return undefined

  const dash = text.search(/\s[—–]\s/)
  if (dash >= 0) {
    text = text.slice(dash).replace(/^\s[—–]\s/, "").trim()
  } else if (text.includes("·")) {
    const after = text
      .split("·")
      .slice(1)
      .join("·")
      .trim()
    if (after) text = after
  }

  if (normalizedCode) {
    const mashed = new RegExp(`^${escapeRegExp(normalizedCode)}\\b[\\s·,/–-]*`, "i")
    text = text.replace(mashed, "").trim()
  }

  text = text.split(";")[0]?.trim() ?? ""
  if (!text || (normalizedCode && text.toUpperCase() === normalizedCode.toUpperCase())) return undefined
  if (text.length > 52) return `${text.slice(0, 49).trimEnd()}…`
  return text
}

export function facultySessionFilterDetail(session: {
  code: string
  description?: string | null
  student_count?: number
}): string | undefined {
  const count = session.student_count
  if (typeof count === "number" && Number.isFinite(count) && count >= 0) {
    return count === 1 ? "1 student" : `${count} students`
  }
  return shortenFacultySessionDescription(session.description, session.code)
}

export function facultySessionFilterLabel(code: string): string {
  const trimmed = code.trim()
  if (!trimmed) return "Section"
  return trimmed.toUpperCase().startsWith("SECTION ") ? trimmed : `Section ${trimmed}`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
