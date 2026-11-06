import type { StudentSession } from "./session"
import { normalizedStudentDatabaseId, studentContentPath } from "./student-content-context"
import { getStoredStudentCourse, getStoredStudentSection } from "./student-course-storage"
import { peekStashedStudentEnrollments } from "./student-enrollments-cache"
import { findEnrolledCourse } from "./student-enrollment"

/** Fill missing section/course fields from SecureStore or login stash before content API calls. */
export async function enrichStudentContentSession(session: StudentSession): Promise<StudentSession> {
  if (session.section?.trim()) return session

  const databaseId = normalizedStudentDatabaseId(session)
  if (!databaseId) return session

  if (session.courseId != null && Number.isFinite(session.courseId)) {
    const stored = await getStoredStudentCourse(databaseId)
    if (stored?.section?.trim()) {
      return { ...session, section: stored.section.trim(), courseId: stored.courseId ?? session.courseId }
    }
    const sectionForCourse = await getStoredStudentSection(databaseId, session.courseId)
    if (sectionForCourse) {
      return { ...session, section: sectionForCourse }
    }
  }

  const cached = peekStashedStudentEnrollments() ?? []
  if (session.courseId != null) {
    const match = findEnrolledCourse(cached, session.courseId, session.section)
    if (match?.section.trim()) {
      return {
        ...session,
        section: match.section.trim(),
        courseCode: session.courseCode ?? match.courseCode,
        courseTitle: session.courseTitle ?? match.courseTitle,
        academicTermId: session.academicTermId ?? match.academicTermId,
      }
    }
  }

  const sole = cached.length === 1 ? cached[0] : null
  if (sole?.section.trim()) {
    return {
      ...session,
      section: sole.section.trim(),
      courseId: session.courseId ?? sole.courseId,
      courseCode: session.courseCode ?? sole.courseCode,
      courseTitle: session.courseTitle ?? sole.courseTitle,
      academicTermId: session.academicTermId ?? sole.academicTermId,
    }
  }

  return session
}

/** Build a content-scoped API path after restoring section/course from SecureStore. */
export async function studentEnrichedContentPath(
  session: StudentSession,
  path: string,
  extra?: Record<string, string | number | undefined>,
): Promise<string> {
  const contentSession = await enrichStudentContentSession(session)
  return studentContentPath(contentSession, path, extra)
}
