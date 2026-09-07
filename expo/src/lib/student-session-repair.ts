import type { SignInPayload, StudentSession } from "./session"
import { saveSession } from "./session"
import { studentAuthenticatedRequest } from "./student-api"
import {
  normalizedStudentDatabaseId,
  studentDatabaseIdFromLoginRecord,
} from "./student-content-context"

/** Resolve `students.id` from roster id when the local session row id was lost or corrupted. */
export async function repairStudentDatabaseIdFromServer(
  session: Pick<StudentSession, "id" | "databaseId" | "section" | "courseId" | "academicTermId">,
): Promise<string | null> {
  const existing = normalizedStudentDatabaseId(session)
  if (existing) return existing
  const rosterId = session.id?.trim()
  if (!rosterId) return null
  try {
    const payload = await studentAuthenticatedRequest<{ student?: { id?: number | string } }>(
      session,
      `/api/student/info?student_id=${encodeURIComponent(rosterId)}`,
    )
    const repaired = studentDatabaseIdFromLoginRecord({ id: payload.student?.id })
    return repaired ?? null
  } catch {
    return null
  }
}

/** Normalize or repair `students.id` before persisting a student session. */
export async function resolveStudentDatabaseIdForSignIn(
  data: Extract<SignInPayload, { portal: "student" }>,
): Promise<string> {
  const fromPayload =
    normalizedStudentDatabaseId({ databaseId: data.databaseId }) ??
    studentDatabaseIdFromLoginRecord({ id: data.databaseId })
  if (fromPayload) return fromPayload

  const repaired = await repairStudentDatabaseIdFromServer({
    id: data.id,
    databaseId: data.databaseId,
    section: data.section,
    courseId: data.courseId,
    academicTermId: data.academicTermId,
  })
  return repaired ?? ""
}

export async function saveStudentSession(
  data: Extract<SignInPayload, { portal: "student" }>,
): Promise<StudentSession> {
  const databaseId = await resolveStudentDatabaseIdForSignIn(data)
  return (await saveSession({ ...data, databaseId })) as StudentSession
}
