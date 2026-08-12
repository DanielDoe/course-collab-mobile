import type { NotetakerKeyPoints, NotetakerNoteDetail } from "./notetaker-api"

function bulletSection(title: string, items: string[]): string[] {
  if (!items.length) return []
  return ["", `## ${title}`, ...items.map((item) => `- ${item}`)]
}

export function formatNotetakerNoteBody(note: NotetakerNoteDetail): string {
  const lines: string[] = []
  if (note.course_name) lines.push(`**Course:** ${note.course_name}`)
  if (note.lecture_date) lines.push(`**Date:** ${note.lecture_date}`)
  if (lines.length) lines.push("")

  if (note.summary?.trim()) {
    lines.push(note.summary.trim())
  } else if (note.key_points) {
    const kp = note.key_points as NotetakerKeyPoints
    if (kp.shortSummary) lines.push(kp.shortSummary)
    lines.push(...bulletSection("Key concepts", kp.keyConcepts ?? []))
    lines.push(...bulletSection("Important definitions", kp.importantDefinitions ?? []))
    lines.push(...bulletSection("Action items / review", kp.actionItems ?? []))
    lines.push(...bulletSection("Possible quiz questions", kp.possibleQuizQuestions ?? []))
  }

  if (note.transcript?.trim()) {
    lines.push("", "## Transcript", note.transcript.trim())
  }

  return lines.join("\n").trim() || "Note (no content yet)."
}

export function defaultNoteTitle(): string {
  const d = new Date()
  return `Note — ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
}

/** @deprecated Use defaultNoteTitle */
export const defaultLectureTitle = defaultNoteTitle
