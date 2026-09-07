import { useCallback, useEffect, useMemo, useState } from "react"
import type { StudentSession } from "../lib/session"
import {
  loadStudentCoraContext,
  resolveStudentCoraCapabilities,
  saveStudentCoraContext,
} from "../lib/student-cora-context-store"
import {
  buildStudentCoraContext,
  runStudentCoraContextSetup,
  type StudentCoraContext,
  type StudentCoraSetupStepId,
} from "../lib/student-cora-context"
import { loadCoraStudentContext } from "../lib/cora-student-context-loader"

export type StudentCoraSetupStatus = "loading" | "running" | "ready" | "error"

/** Re-fetch platform data when Cora hub opens after this interval. */
export const STUDENT_CORA_CONTEXT_STALE_MS = 20 * 60 * 1000

async function persistStudentCoraContext(context: StudentCoraContext): Promise<void> {
  try {
    await saveStudentCoraContext(context)
  } catch {
    /* SecureStore can fail on some simulators — in-memory cache still works. */
  }
}

async function buildFallbackStudentCoraContext(session: StudentSession): Promise<StudentCoraContext> {
  const payload = await loadCoraStudentContext(session)
  return buildStudentCoraContext(session, payload)
}

export function useStudentCoraContext(options: { session: StudentSession | null; enabled?: boolean }) {
  const { session, enabled = true } = options
  const [status, setStatus] = useState<StudentCoraSetupStatus>("loading")
  const [setupStep, setSetupStep] = useState<StudentCoraSetupStepId>("preparing")
  const [context, setContext] = useState<StudentCoraContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [setupToken, setSetupToken] = useState(0)

  const runSetup = useCallback(async () => {
    if (!session) return
    setStatus("running")
    setError(null)
    setSetupStep("preparing")
    try {
      const built = await runStudentCoraContextSetup(session, { onStep: setSetupStep })
      await persistStudentCoraContext(built)
      setContext(built)
      setStatus("ready")
    } catch (err) {
      try {
        const built = await buildFallbackStudentCoraContext(session)
        await persistStudentCoraContext(built)
        setContext(built)
        setStatus("ready")
        setError(null)
        return
      } catch {
        /* fall through */
      }
      setError(err instanceof Error ? err.message : "Could not prepare Cora for your course.")
      setStatus("error")
    }
  }, [session])

  useEffect(() => {
    if (!enabled || !session) {
      setStatus("loading")
      setContext(null)
      return
    }

    const studentId = session.databaseId
    const courseId = session.courseId
    setContext((current) =>
      current?.studentId === studentId && current.courseId === courseId ? current : null,
    )
    setStatus("loading")
    setError(null)

    let cancelled = false

    void (async () => {
      const stored = await loadStudentCoraContext(studentId, courseId)
      if (cancelled) return

      if (
        stored?.setupComplete &&
        stored.studentId === studentId &&
        stored.courseId === courseId &&
        setupToken === 0
      ) {
        setContext(stored)
        setStatus("ready")
        return
      }

      setStatus("running")
      setSetupStep("preparing")
      try {
        const built = await runStudentCoraContextSetup(session, {
          onStep: (step) => {
            if (!cancelled) setSetupStep(step)
          },
        })
        if (cancelled || built.studentId !== studentId || built.courseId !== courseId) return
        await persistStudentCoraContext(built)
        setContext(built)
        setStatus("ready")
      } catch (err) {
        if (cancelled) return
        try {
          const built = await buildFallbackStudentCoraContext(session)
          if (cancelled || built.studentId !== studentId || built.courseId !== courseId) return
          await persistStudentCoraContext(built)
          setContext(built)
          setStatus("ready")
          setError(null)
          return
        } catch {
          /* fall through */
        }
        setError(err instanceof Error ? err.message : "Could not prepare Cora for your course.")
        setStatus("error")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, session?.databaseId, session?.courseId, session?.section, setupToken])

  const retrySetup = useCallback(() => {
    setSetupToken((value) => value + 1)
  }, [])

  const refreshContextIfStale = useCallback(
    async (force = false) => {
      if (!session) return null

      const current = context
      const ageMs = current ? Date.now() - new Date(current.generatedAt).getTime() : Number.POSITIVE_INFINITY
      if (!force && ageMs < STUDENT_CORA_CONTEXT_STALE_MS) return current

      try {
        const payload = await loadCoraStudentContext(session)
        const built = await buildStudentCoraContext(session, payload)
        await persistStudentCoraContext(built)
        setContext(built)
        setStatus("ready")
        setError(null)
        return built
      } catch (err) {
        if (!current) {
          try {
            const built = await buildFallbackStudentCoraContext(session)
            await persistStudentCoraContext(built)
            setContext(built)
            setStatus("ready")
            setError(null)
            return built
          } catch {
            setError(err instanceof Error ? err.message : "Could not refresh Cora context.")
            setStatus("error")
          }
        }
        return current
      }
    },
    [session, context],
  )

  const capabilities = useMemo(() => resolveStudentCoraCapabilities(context), [context])

  return {
    status,
    setupStep,
    context,
    capabilities,
    error,
    retrySetup,
    runSetup,
    refreshContextIfStale,
  }
}
