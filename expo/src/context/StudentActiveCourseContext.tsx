import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useSession } from "./SessionProvider"
import { useStudentShell } from "./StudentShellContext"
import { bindStudentActiveEnrollment, fetchStudentEnrollments } from "../lib/student-enrollments-api"
import { peekStashedStudentEnrollments } from "../lib/student-enrollments-cache"
import {
  enrollmentFromStudentSession,
  findEnrolledCourse,
  mergeStudentEnrollments,
  resolveStoredStudentEnrollment,
  studentEnrollmentScopeKey,
  studentEnrollmentSessionPatch,
  type StudentEnrollment,
} from "../lib/student-enrollment"
import { getStoredStudentCourse, persistStudentCourse } from "../lib/student-course-storage"
import { setStudentQueryCourse } from "../lib/query/student-course"
import { getQueryClient } from "../lib/query/client"
import { queryKeys } from "../lib/query/keys"
import { studentQueryScope } from "../lib/query/scope"
import type { StudentSession } from "../lib/session"

type StudentActiveCourseContextValue = {
  activeCourse: StudentEnrollment | null
  activeCourseId: number | null
  activeSectionId: number | null
  enrolledCourses: StudentEnrollment[]
  setActiveCourse: (course: StudentEnrollment) => Promise<boolean>
  reloadEnrollments: () => Promise<void>
  isLoading: boolean
}

const StudentActiveCourseContext = createContext<StudentActiveCourseContextValue | null>(null)

export { StudentActiveCourseContext }

function applyQueryCourse(course: StudentEnrollment | null) {
  setStudentQueryCourse(
    course
      ? { courseId: course.courseId, section: course.section }
      : { courseId: null, section: null },
  )
}

export function StudentActiveCourseProvider({ children }: { children: ReactNode }) {
  const { session, updateSession } = useSession()
  const { refreshStudentData } = useStudentShell()
  const studentSession = session?.portal === "student" ? (session as StudentSession) : null

  const [enrolledCourses, setEnrolledCourses] = useState<StudentEnrollment[]>([])
  const [activeCourse, setActiveCourseState] = useState<StudentEnrollment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const applyingRef = useRef(false)
  const syncedEnrollmentScopeRef = useRef<string | null>(null)

  const applyEnrollment = useCallback(
    async (enrollment: StudentEnrollment, options?: { persist?: boolean; refresh?: boolean }) => {
      if (!studentSession) return false
      applyQueryCourse(enrollment)
      setActiveCourseState(enrollment)
      if (options?.persist !== false) {
        await persistStudentCourse(studentSession.databaseId, enrollment.courseId, enrollment.section)
      }
      await updateSession(studentEnrollmentSessionPatch(enrollment, studentSession))
      if (options?.refresh !== false) {
        const nextSession = {
          ...studentSession,
          ...studentEnrollmentSessionPatch(enrollment, studentSession),
        }
        try {
          getQueryClient().invalidateQueries({
            queryKey: queryKeys.student.dashboard.root(studentQueryScope(nextSession)),
          })
        } catch {
          /* query client may not be mounted yet */
        }
        await refreshStudentData?.({ force: true })
      }
      return true
    },
    [refreshStudentData, studentSession, updateSession],
  )

  const reloadEnrollments = useCallback(async () => {
    if (!studentSession) return
    const [enrollments, stored] = await Promise.all([
      fetchStudentEnrollments(studentSession),
      getStoredStudentCourse(studentSession.databaseId),
    ])
    setEnrolledCourses(enrollments)
    const resolved = resolveStoredStudentEnrollment(
      enrollments,
      stored?.courseId ?? activeCourse?.courseId ?? studentSession.courseId,
      stored?.section ?? activeCourse?.section ?? studentSession.section,
      studentSession,
    )
    setActiveCourseState(resolved)
    applyQueryCourse(resolved)
    if (resolved && studentEnrollmentScopeKey(resolved) !== studentEnrollmentScopeKey({
      courseId: studentSession.courseId ?? 0,
      section: studentSession.section,
    })) {
      await persistStudentCourse(studentSession.databaseId, resolved.courseId, resolved.section)
      await updateSession(studentEnrollmentSessionPatch(resolved, studentSession))
    }
  }, [activeCourse, studentSession, updateSession])

  const setActiveCourse = useCallback(
    async (course: StudentEnrollment) => {
      if (!studentSession || applyingRef.current) return false
      const enrolled = findEnrolledCourse(enrolledCourses, course.courseId, course.section)
      if (!enrolled) return false

      applyingRef.current = true
      const previous = activeCourse
      try {
        await persistStudentCourse(studentSession.databaseId, enrolled.courseId, enrolled.section)
        applyQueryCourse(enrolled)
        setActiveCourseState(enrolled)
        await updateSession(studentEnrollmentSessionPatch(enrolled, studentSession))
        let boundStudentRowId: string | undefined
        try {
          const bound = await bindStudentActiveEnrollment(
            { ...studentSession, ...studentEnrollmentSessionPatch(enrolled, studentSession) },
            enrolled,
          )
          boundStudentRowId = bound.studentRowId
          if (boundStudentRowId && boundStudentRowId !== studentSession.databaseId) {
            await persistStudentCourse(boundStudentRowId, enrolled.courseId, enrolled.section)
            await updateSession({ databaseId: boundStudentRowId })
          }
        } catch {
          if (previous) {
            await applyEnrollment(previous, { persist: true, refresh: false })
          }
          return false
        }
        const nextSession = {
          ...studentSession,
          ...studentEnrollmentSessionPatch(enrolled, studentSession),
          ...(boundStudentRowId ? { databaseId: boundStudentRowId } : {}),
        }
        try {
          getQueryClient().invalidateQueries({
            queryKey: queryKeys.student.dashboard.root(studentQueryScope(nextSession)),
          })
        } catch {
          /* ignore */
        }
        await refreshStudentData?.({ force: true })
        return true
      } finally {
        applyingRef.current = false
      }
    },
    [activeCourse, applyEnrollment, enrolledCourses, refreshStudentData, studentSession, updateSession],
  )

  useEffect(() => {
    if (!studentSession) {
      setEnrolledCourses([])
      setActiveCourseState(null)
      applyQueryCourse(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    void (async () => {
      try {
        const [enrollments, stored] = await Promise.all([
          fetchStudentEnrollments(studentSession),
          getStoredStudentCourse(studentSession.databaseId),
        ])
        if (cancelled) return
        setEnrolledCourses(enrollments)
        const resolved = resolveStoredStudentEnrollment(
          enrollments,
          stored?.courseId ?? studentSession.courseId,
          stored?.section ?? studentSession.section,
          studentSession,
        )
        setActiveCourseState(resolved)
        applyQueryCourse(resolved)
        if (resolved) {
          const sessionKey = studentEnrollmentScopeKey({
            courseId: studentSession.courseId ?? 0,
            section: studentSession.section,
          })
          const resolvedKey = studentEnrollmentScopeKey(resolved)
          if (resolvedKey !== sessionKey && syncedEnrollmentScopeRef.current !== resolvedKey) {
            syncedEnrollmentScopeRef.current = resolvedKey
            await persistStudentCourse(studentSession.databaseId, resolved.courseId, resolved.section)
            await updateSession(studentEnrollmentSessionPatch(resolved, studentSession))
          } else {
            syncedEnrollmentScopeRef.current = resolvedKey
            await persistStudentCourse(studentSession.databaseId, resolved.courseId, resolved.section)
          }
        }
      } catch {
        if (cancelled) return
        const fallback = enrollmentFromStudentSession(studentSession)
        const cached = peekStashedStudentEnrollments() ?? []
        const merged = mergeStudentEnrollments(cached, fallback ? [fallback] : [])
        setEnrolledCourses(merged)
        setActiveCourseState(fallback)
        applyQueryCourse(fallback)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [studentSession?.databaseId, updateSession])

  const value = useMemo<StudentActiveCourseContextValue>(
    () => ({
      activeCourse,
      activeCourseId: activeCourse?.courseId ?? null,
      activeSectionId: activeCourse?.sectionId ?? null,
      enrolledCourses,
      setActiveCourse,
      reloadEnrollments,
      isLoading,
    }),
    [activeCourse, enrolledCourses, isLoading, reloadEnrollments, setActiveCourse],
  )

  return (
    <StudentActiveCourseContext.Provider value={value}>{children}</StudentActiveCourseContext.Provider>
  )
}

export function useStudentActiveCourse() {
  const ctx = useContext(StudentActiveCourseContext)
  if (!ctx) {
    throw new Error("useStudentActiveCourse must be used within StudentActiveCourseProvider")
  }
  return ctx
}

export function useOptionalStudentActiveCourse() {
  return useContext(StudentActiveCourseContext)
}
