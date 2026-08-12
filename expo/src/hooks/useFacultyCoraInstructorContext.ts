import { useCallback, useEffect, useMemo, useState } from "react"
import type { InstructorCourse } from "../lib/instructor-api"
import type { InstructorScope } from "../lib/instructor-content-api"
import {
  loadFacultyCoraInstructorContext,
  resolveFacultyCoraCapabilities,
  saveFacultyCoraInstructorContext,
} from "../lib/faculty-cora-context-store"
import {
  runFacultyCoraContextSetup,
  type FacultyCoraInstructorContext,
  type FacultyCoraSetupStepId,
} from "../lib/faculty-cora-instructor-context"

export type FacultyCoraSetupStatus = "loading" | "running" | "ready" | "error"

export function useFacultyCoraInstructorContext(options: {
  scope: InstructorScope | null
  course: InstructorCourse | null
  courses: InstructorCourse[]
  instructorName?: string
  enabled?: boolean
}) {
  const { scope, course, courses, instructorName, enabled = true } = options
  const [status, setStatus] = useState<FacultyCoraSetupStatus>("loading")
  const [setupStep, setSetupStep] = useState<FacultyCoraSetupStepId>("preparing")
  const [context, setContext] = useState<FacultyCoraInstructorContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [setupToken, setSetupToken] = useState(0)

  const runSetup = useCallback(async () => {
    if (!scope?.courseId || !course) return
    setStatus("running")
    setError(null)
    setSetupStep("preparing")
    try {
      const built = await runFacultyCoraContextSetup(scope, {
        instructorName,
        courses,
        activeCourse: course,
        onStep: setSetupStep,
      })
      await saveFacultyCoraInstructorContext(built)
      setContext(built)
      setStatus("ready")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare Cora for this course.")
      setStatus("error")
    }
  }, [scope, course, courses, instructorName])

  useEffect(() => {
    if (!enabled || !scope?.courseId || !course) {
      setStatus("loading")
      setContext(null)
      return
    }

    const courseId = course.id
    setContext((current) => (current?.activeCourseId === courseId ? current : null))
    setStatus("loading")
    setError(null)

    let cancelled = false

    void (async () => {
      const stored = await loadFacultyCoraInstructorContext(scope)
      if (cancelled) return

      if (stored?.setupComplete && stored.activeCourseId === courseId && setupToken === 0) {
        setContext(stored)
        setStatus("ready")
        return
      }

      setStatus("running")
      setSetupStep("preparing")
      try {
        const built = await runFacultyCoraContextSetup(scope, {
          instructorName,
          courses,
          activeCourse: course,
          onStep: (step) => {
            if (!cancelled) setSetupStep(step)
          },
        })
        if (cancelled || built.activeCourseId !== courseId) return
        await saveFacultyCoraInstructorContext(built)
        setContext(built)
        setStatus("ready")
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Could not prepare Cora for this course.")
        setStatus("error")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, scope?.instructorId, scope?.courseId, course?.id, courses, instructorName, setupToken])

  const retrySetup = useCallback(() => {
    setSetupToken((value) => value + 1)
  }, [])

  const capabilities = useMemo(() => resolveFacultyCoraCapabilities(context), [context])

  return {
    status,
    setupStep,
    context,
    capabilities,
    error,
    retrySetup,
    runSetup,
  }
}
