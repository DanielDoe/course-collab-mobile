import type { StudentSession } from "./session"
import { ApiError, studentAuthenticatedRequest } from "./student-api"

export type StudentDigitalNote = {
  id: number
  title: string
  bodyText: string
  inkWorkspace: unknown | null
  createdAt: string
  updatedAt: string
  isOwner?: boolean
  ownerName?: string | null
  sharedAt?: string | null
}

export type CourseDigitalNote = {
  id: number
  courseId: number
  instructorId: number | null
  topic: string | null
  title: string
  bodyText: string
  inkWorkspace: unknown | null
  session: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export type DigitalNoteShare = {
  studentDatabaseId: number
  fullName: string
}

export type RosterStudent = {
  id: number
  full_name: string
  student_id?: string
}

async function studentRequest<T>(
  session: StudentSession,
  path: string,
  init?: RequestInit,
): Promise<T> {
  return studentAuthenticatedRequest<T>(session, path, init)
}

export const digitalNotesApi = {
  listMyNotes(session: StudentSession) {
    return studentRequest<{ notes: StudentDigitalNote[] }>(
      session,
      `/api/student/digital-notes?studentDatabaseId=${encodeURIComponent(session.databaseId)}`,
    )
  },

  getNote(session: StudentSession, noteId: number) {
    return studentRequest<{ note: StudentDigitalNote }>(session, `/api/student/digital-notes/${noteId}`)
  },

  createNote(
    session: StudentSession,
    payload: { title?: string; bodyText?: string; inkWorkspace?: unknown },
  ) {
    return studentRequest<{ note: StudentDigitalNote }>(session, "/api/student/digital-notes", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  updateNote(
    session: StudentSession,
    noteId: number,
    payload: { title?: string; bodyText?: string; inkWorkspace?: unknown },
  ) {
    return studentRequest<{ note: StudentDigitalNote }>(session, `/api/student/digital-notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  },

  deleteNote(session: StudentSession, noteId: number) {
    return studentRequest<{ success: boolean }>(session, `/api/student/digital-notes/${noteId}`, {
      method: "DELETE",
    })
  },

  getShares(session: StudentSession, noteId: number) {
    return studentRequest<{ shares: DigitalNoteShare[] }>(
      session,
      `/api/student/digital-notes/${noteId}/share`,
    )
  },

  updateShares(session: StudentSession, noteId: number, studentDatabaseIds: number[]) {
    return studentRequest<{ shares: DigitalNoteShare[] }>(
      session,
      `/api/student/digital-notes/${noteId}/share`,
      {
        method: "PUT",
        body: JSON.stringify({ studentDatabaseIds }),
      },
    )
  },

  listCourseNotes(session: StudentSession) {
    const params = new URLSearchParams({ studentDatabaseId: session.databaseId })
    if (session.courseId) params.set("courseId", String(session.courseId))
    if (session.section) params.set("session", session.section)
    return studentRequest<{ notes: CourseDigitalNote[]; courseId: number | null; session: string | null }>(
      session,
      `/api/student/course-notes?${params.toString()}`,
    )
  },

  listClassmates(session: StudentSession) {
    const section = session.section?.trim()
    if (!section) {
      return Promise.reject(new ApiError("Section is required to load classmates.", 400))
    }
    const params = new URLSearchParams({
      section,
      studentDatabaseId: session.databaseId,
    })
    if (session.courseId) params.set("courseId", String(session.courseId))
    return studentRequest<{ students: RosterStudent[] }>(session, `/api/student/roster?${params.toString()}`)
  },
}

let cachedCourseNotes: CourseDigitalNote[] = []

export function setCachedCourseNotes(notes: CourseDigitalNote[]) {
  cachedCourseNotes = notes
}

export function getCachedCourseNote(noteId: number): CourseDigitalNote | null {
  return cachedCourseNotes.find((note) => note.id === noteId) ?? null
}
