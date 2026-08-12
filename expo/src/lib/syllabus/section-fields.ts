import type { SyllabusSection } from "./types"

/** Preferred field order per section id — unknown fields fall back to alphabetical. */
const FIELD_ORDERS: Record<string, string[]> = {
  "course-header": [
    "Course Code",
    "Course Title",
    "Term",
    "Section",
    "Delivery Mode",
    "Credit Hours",
    "Prerequisites / Corequisites",
  ],
  "instructor-info": [
    "Instructor Name",
    "Department",
    "Email",
    "Phone",
    "Office Location",
    "Office Hours",
  ],
  "general-course-info": [
    "Course Meeting Days / Time",
    "Course Meeting Location",
    "Course Modality",
    "Course Platform / Links",
  ]}

function sortFieldEntries(entries: Array<[string, string]>, order: string[]): Array<[string, string]> {
  const rank = new Map(order.map((key, index) => [key, index]))
  return [...entries].sort(([a], [b]) => {
    const ai = rank.get(a) ?? 999
    const bi = rank.get(b) ?? 999
    if (ai !== bi) return ai - bi
    return a.localeCompare(b)
  })
}

export function getSyllabusFieldEntries(section: SyllabusSection): Array<[string, string]> {
  const fields = section.content?.fields
  if (!fields) return []

  const entries = Object.entries(fields).filter(([, value]) => value?.trim())
  const sectionId = section.sectionId ?? section.id ?? ""
  const order = FIELD_ORDERS[sectionId]
  return order ? sortFieldEntries(entries, order) : sortFieldEntries(entries, [])
}

/** All field keys for editing, including empty values. */
export function getSyllabusFieldEntriesForEdit(section: SyllabusSection): Array<[string, string]> {
  const fields = section.content?.fields
  if (!fields) return []

  const entries = Object.entries(fields)
  const sectionId = section.sectionId ?? section.id ?? ""
  const order = FIELD_ORDERS[sectionId]
  return order ? sortFieldEntries(entries, order) : sortFieldEntries(entries, [])
}

export function isPolicySyllabusSection(section: SyllabusSection): boolean {
  const sectionId = section.sectionId ?? section.id ?? ""
  return sectionId === "course-policies" || sectionId === "university-policies" || section.type === "policy"
}

export function isContactSyllabusSection(section: SyllabusSection): boolean {
  const sectionId = section.sectionId ?? section.id ?? ""
  return sectionId === "instructor-info" || sectionId === "general-course-info" || sectionId === "course-header"
}
