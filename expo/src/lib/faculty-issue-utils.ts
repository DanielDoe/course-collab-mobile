export type IssueDescriptionSource = "system" | "student" | "instructor" | "unknown"

export type ParsedIssueDescription = {
  source: IssueDescriptionSource
  headline?: string
  errorCode?: string
  technicalDetail?: string
  studentNote?: string
  attemptId?: string
  actionHint?: string
  paragraphs: string[]
  raw: string
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseIssueDescription(description: string): ParsedIssueDescription {
  const raw = description.trim()
  if (!raw) {
    return { source: "unknown", paragraphs: [], raw }
  }

  let text = raw
  let source: IssueDescriptionSource = "unknown"

  const sourceMatch = text.match(/^\[(System|Student|Instructor)\]\s*/i)
  if (sourceMatch) {
    source = sourceMatch[1].toLowerCase() as IssueDescriptionSource
    text = text.slice(sourceMatch[0].length).trim()
  }

  const attemptMatch = text.match(/Attempt ID:\s*(\d+)/i)
  const attemptId = attemptMatch?.[1]
  if (attemptMatch) {
    text = text.replace(attemptMatch[0], "").trim()
  }

  const pleaseMatch = text.match(/(Please[\s\S]*?)(?:\.|$)/i)
  const actionHint = pleaseMatch?.[1]?.trim().replace(/\.$/, "")
  if (pleaseMatch) {
    text = text.replace(pleaseMatch[0], "").trim()
  }

  const studentNoteMatch = text.match(/(Student[\s\S]*?)(?:\.|$)/i)
  const studentNote = studentNoteMatch?.[1]?.trim()
  if (studentNoteMatch && studentNoteMatch[0].toLowerCase().includes("student")) {
    text = text.replace(studentNoteMatch[0], " ").replace(/\s+\./g, ".").trim()
  }

  let headline: string | undefined
  let errorCode: string | undefined
  let technicalDetail: string | undefined

  const failedMatch = text.match(/^(.+?\bfailed:\s*)([a-z0-9_]+)\.\s*(.*)$/i)
  if (failedMatch) {
    headline = failedMatch[1].replace(/:\s*$/, "").trim()
    errorCode = failedMatch[2]
    technicalDetail = failedMatch[3]?.replace(/\s+\.$/, "").trim() || undefined
    text = ""
  } else {
    const errorCodeInline = text.match(/\b([a-z][a-z0-9_]{2})\b/i)
    if (source === "system" && errorCodeInline && text.includes(":")) {
      const parts = splitSentences(text)
      headline = parts[0]
      if (parts.length > 1) {
        technicalDetail = parts.slice(1).join(" ")
      }
      text = ""
    }
  }

  const remaining = text.replace(/\s+/g, " ").trim()
  const paragraphs = [
    ...(headline && !technicalDetail ? [headline] : []),
    ...(technicalDetail ? [technicalDetail] : []),
    ...(remaining ? splitSentences(remaining) : []),
  ].filter(Boolean)

  if (paragraphs.length === 0 && raw) {
    paragraphs.push(raw)
  }

  return {
    source,
    headline,
    errorCode,
    technicalDetail,
    studentNote: studentNote ? `${studentNote}.` : undefined,
    attemptId,
    actionHint: actionHint ? `${actionHint}.` : undefined,
    paragraphs,
    raw}
}

export function issueSourceLabel(source: IssueDescriptionSource): string {
  switch (source) {
    case "system":
      return "System report"
    case "student":
      return "Student report"
    case "instructor":
      return "Instructor note"
    default:
      return "Issue report"
  }
}

export function formatIssueDate(iso?: string): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}
