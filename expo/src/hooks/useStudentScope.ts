import { useMemo } from "react"
import { useSession } from "../context/SessionProvider"
import { useOptionalStudentActiveCourse } from "../context/StudentActiveCourseContext"
import type { StudentSession } from "../lib/session"

/** Module-facing student scope — always the shell-selected enrollment, never a page-local guess. */
export function useStudentScope() {
  const { session } = useSession()
  const active = useOptionalStudentActiveCourse()
  const studentSession = session?.portal === "student" ? (session as StudentSession) : null
  const course = active?.activeCourse ?? null

  const scope = useMemo(() => {
    if (!studentSession || studentSession.courseId == null) return null
    return {
      studentId: studentSession.databaseId,
      courseId: studentSession.courseId,
      section: studentSession.section,
      academicTermId: studentSession.academicTermId ?? null,
    }
  }, [studentSession])

  return {
    session: studentSession,
    course,
    scope,
    enrolledCourses: active?.enrolledCourses ?? [],
    ready: Boolean(studentSession && studentSession.courseId && !active?.isLoading),
    isLoading: active?.isLoading ?? false,
  }
}
