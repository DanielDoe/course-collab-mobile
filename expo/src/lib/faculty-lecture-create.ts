export type LectureCreateFields = {
  title: string
  week: string | number
  description?: string
  objectives?: string[]
  is_published?: boolean
}

export type LectureCreatePayload = {
  title: string
  week: number
  description?: string
  objectives: string[]
  is_published: boolean
}

export function validateLectureCreateFields(
  fields: LectureCreateFields,
  courseId?: number | null,
): { ok: true; payload: LectureCreatePayload } | { ok: false; error: string } {
  if (courseId == null || !Number.isFinite(courseId) || courseId <= 0) {
    return { ok: false, error: "Select a course before creating a lecture." }
  }
  const title = fields.title.trim()
  if (!title) return { ok: false, error: "Title is required." }
  const week = typeof fields.week === "number" ? fields.week : Number.parseInt(String(fields.week), 10)
  if (!Number.isFinite(week) || week < 1) return { ok: false, error: "Week must be a number of 1 or greater." }
  return {
    ok: true,
    payload: {
      title,
      week,
      description: fields.description?.trim() || undefined,
      objectives: (fields.objectives ?? []).map((item) => item.trim()).filter(Boolean),
      is_published: fields.is_published ?? false,
    },
  }
}

/** Wire body matches the production create contract; course lives on instructor headers. */
export function lectureCreateRequestBody(payload: LectureCreatePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: payload.title,
    week: payload.week,
    is_published: payload.is_published,
  }
  if (payload.description) body.description = payload.description
  if (payload.objectives.length > 0) body.objectives = payload.objectives
  return body
}
