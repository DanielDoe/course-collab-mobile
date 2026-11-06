import type { InstructorSyllabus, SyllabusSection } from "./instructor-api"

export type SyllabusSavePayload = {
  id?: number
  courseId: number
  title?: string
  term?: string
  contentMode?: string
  sections: SyllabusSection[]
  action?: "publish"
}

export function persistedSyllabusId(syllabus: Pick<InstructorSyllabus, "id"> | null | undefined): number | null {
  const id = syllabus?.id
  return typeof id === "number" && Number.isFinite(id) && id > 0 ? id : null
}

export function buildSyllabusSavePayload(args: {
  courseId?: number | null
  syllabus: InstructorSyllabus
  sections: SyllabusSection[]
  action?: "publish"
}): { ok: true; payload: SyllabusSavePayload } | { ok: false; error: string } {
  const courseId = args.courseId ?? args.syllabus.courseId
  if (courseId == null || !Number.isFinite(courseId) || courseId <= 0) {
    return { ok: false, error: "Select a course before publishing this syllabus." }
  }

  const payload: SyllabusSavePayload = {
    courseId,
    title: args.syllabus.title,
    term: args.syllabus.term,
    contentMode: args.syllabus.contentMode === "pdf" ? "pdf" : "structured",
    sections: args.sections,
    action: args.action,
  }
  const id = persistedSyllabusId(args.syllabus)
  if (id != null) payload.id = id
  return { ok: true, payload }
}

export function syllabusNeedsCreateBeforePublish(syllabus: InstructorSyllabus | null): boolean {
  return persistedSyllabusId(syllabus) == null
}

export function syllabusEditorFingerprint(syllabus: InstructorSyllabus): string {
  return JSON.stringify({
    title: syllabus.title,
    term: syllabus.term,
    status: syllabus.status,
    contentMode: syllabus.contentMode,
    sections: syllabus.sections.map((section) => ({
      sectionId: section.sectionId,
      title: section.title,
      order: section.order,
      type: section.type,
      content: section.content,
      isRequired: section.isRequired,
      isVisible: section.isVisible,
      isEditable: section.isEditable,
    })),
  })
}

/** Persist lives in the search dock — hide it once the live syllabus is published and clean. */
export function shouldShowSyllabusPersistRail(args: {
  canEdit: boolean
  status?: string
  dirty: boolean
}): boolean {
  if (!args.canEdit) return false
  if (args.dirty) return true
  return (args.status ?? "").toLowerCase() !== "published"
}

/** Remote PUT matches the production audit body. Course scoping stays on instructor headers. */
export function syllabusRemoteBody(payload: SyllabusSavePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: payload.title,
    term: payload.term,
    contentMode: payload.contentMode,
    sections: payload.sections,
  }
  if (payload.action) body.action = payload.action
  if (payload.id != null) body.id = payload.id
  return body
}
