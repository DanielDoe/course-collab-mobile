import { useCallback, useEffect, useMemo, useState } from "react"
import { ApiError } from "../lib/api"
import { startCoraSession } from "../lib/cora-api"
import { isCoraAccessDeniedError, prepareCoraRequest } from "../lib/cora-rbac"
import type {
  CoraHintLevel,
  CoraMode,
  CoraProblem,
  CoraSession,
  CoraStep,
} from "../lib/cora-types"
import type { StudentSession } from "../lib/session"

function hintKey(stepId: string, level: CoraHintLevel) {
  return `${stepId}:${level}`
}

export function useCoraStepEngine(
  session: StudentSession | null,
  problem: CoraProblem | null,
  visible: boolean,
) {
  const [mode, setMode] = useState<CoraMode>("guided")
  const [coraSession, setCoraSession] = useState<CoraSession | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [finished, setFinished] = useState(false)
  const [reflections, setReflections] = useState<Record<string, string>>({})
  const [checkpointSelections, setCheckpointSelections] = useState<Record<string, string>>({})
  const [confidence, setConfidence] = useState<number | null>(null)
  const [revealedHints, setRevealedHints] = useState<Set<string>>(new Set())

  const steps = coraSession?.steps ?? []
  const currentStep: CoraStep | null = steps[stepIndex] ?? null

  const resetLocal = useCallback(() => {
    setStepIndex(0)
    setFinished(false)
    setReflections({})
    setCheckpointSelections({})
    setConfidence(null)
    setRevealedHints(new Set())
    setError("")
  }, [])

  const loadSession = useCallback(
    async (nextMode: CoraMode) => {
      if (!session || !problem) return
      setLoading(true)
      setError("")
      try {
        const prepared = prepareCoraRequest({
          session,
          tool: "step_by_step_solver",
          prompt: problem.questionText ?? problem.title ?? "",
        })
        const response = await startCoraSession(session, problem, nextMode, prepared)
        setCoraSession(response.session)
        setStepIndex(0)
        setFinished(false)
        setReflections({})
        setCheckpointSelections({})
        setConfidence(null)
        setRevealedHints(new Set())
      } catch (err) {
        setCoraSession(null)
        setError(
          isCoraAccessDeniedError(err)
            ? err.message
            : err instanceof ApiError
              ? err.message
              : "Could not start Cora session.",
        )
      } finally {
        setLoading(false)
      }
    },
    [session, problem],
  )

  useEffect(() => {
    if (!visible || !problem || !session) {
      setCoraSession(null)
      resetLocal()
      return
    }
    setMode("guided")
    void loadSession("guided")
  }, [visible, problem, session, loadSession, resetLocal])

  const changeMode = useCallback(
    (nextMode: CoraMode) => {
      setMode(nextMode)
      void loadSession(nextMode)
    },
    [loadSession],
  )

  const canAdvance = useMemo(() => {
    if (!currentStep || finished) return false
    if (mode !== "guided") return true
    const interaction = currentStep.interaction
    if (!interaction) return true
    if (interaction.type === "reflect") {
      return Boolean(reflections[currentStep.id]?.trim())
    }
    if (interaction.type === "checkpoint") {
      const selectedId = checkpointSelections[interaction.checkpoint.id]
      if (!selectedId) return false
      const option = interaction.checkpoint.options.find((item) => item.id === selectedId)
      return option?.correct === true
    }
    if (interaction.type === "confidence") {
      return confidence != null
    }
    return true
  }, [checkpointSelections, confidence, currentStep, finished, mode, reflections])

  const goTo = useCallback(
    (index: number) => {
      if (!steps.length) return
      setStepIndex(Math.max(0, Math.min(steps.length - 1, index)))
      setConfidence(null)
    },
    [steps.length],
  )

  const prev = useCallback(() => {
    goTo(stepIndex - 1)
  }, [goTo, stepIndex])

  const next = useCallback(() => {
    if (!steps.length) return
    if (stepIndex >= steps.length - 1) {
      setFinished(true)
      return
    }
    goTo(stepIndex + 1)
  }, [goTo, stepIndex, steps.length])

  const useHint = useCallback((level: CoraHintLevel) => {
    if (!currentStep) return
    setRevealedHints((current) => {
      const nextSet = new Set(current)
      nextSet.add(hintKey(currentStep.id, level))
      return nextSet
    })
  }, [currentStep])

  const submitCheckpoint = useCallback((checkpointId: string, optionId: string) => {
    setCheckpointSelections((current) => ({ ...current, [checkpointId]: optionId }))
  }, [])

  const reset = useCallback(() => {
    resetLocal()
    void loadSession(mode)
  }, [loadSession, mode, resetLocal])

  const isHintRevealed = useCallback(
    (level: CoraHintLevel) => {
      if (!currentStep) return false
      return revealedHints.has(hintKey(currentStep.id, level))
    },
    [currentStep, revealedHints],
  )

  return {
    mode,
    changeMode,
    coraSession,
    currentStep,
    stepIndex,
    steps,
    loading,
    error,
    finished,
    reflections,
    setReflection: (stepId: string, value: string) =>
      setReflections((current) => ({ ...current, [stepId]: value })),
    checkpointSelections,
    submitCheckpoint,
    confidence,
    setConfidence,
    canAdvance,
    goTo,
    prev,
    next,
    useHint,
    isHintRevealed,
    reset,
  }
}
