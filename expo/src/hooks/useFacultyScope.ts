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
    return { instructorId: facultySession.id, courseId: selectedCourse.id }
  }, [facultySession, selectedCourse])

  return {
    session: facultySession,
    course: selectedCourse,
    scope,
    ready: Boolean(facultySession && selectedCourse && scope)}
}
