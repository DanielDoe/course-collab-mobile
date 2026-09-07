import { useMemo } from "react"
import { useSession } from "../context/SessionProvider"
import { useFacultyShell } from "../context/FacultyShellContext"
import type { FacultySession } from "../lib/session"

export function useFacultyScope() {
  const { session } = useSession()
  const { selectedCourse } = useFacultyShell()

  const facultySession = session?.portal === "faculty" ? (session as FacultySession) : null

  const scope = useMemo(() => {
    if (!facultySession || !selectedCourse) return null
    return {
      instructorId: facultySession.id,
      courseId: selectedCourse.id,
      sessionId: selectedCourse.session_id ?? null,
      sessionCode: selectedCourse.session_code ?? null,
      academicTermId: selectedCourse.academic_term_id ?? null,
      institutionId: facultySession.universityId ?? null,
    }
  }, [facultySession, selectedCourse])

  return {
    session: facultySession,
    course: selectedCourse,
    scope,
    ready: Boolean(facultySession && selectedCourse && scope),
    hasCourse: Boolean(selectedCourse?.id),
    institutionId: facultySession?.universityId ?? null,
    courseId: selectedCourse?.id ?? null,
    termId: selectedCourse?.academic_term_id ?? null,
    sectionId: selectedCourse?.session_id ?? null,
  }
}
