import { useCallback, useRef, useState } from "react"
import {
  createQuestionPrepareSteps,
  runQuestionPreparePipeline,
  updateQuestionPrepareStep,
  type QuestionPrepareStep,
} from "../lib/question-prepare"

const PREPARE_SETTLE_MS = 220

export function useQuestionPrepareSession() {
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [steps, setSteps] = useState<QuestionPrepareStep[]>(() => createQuestionPrepareSteps("fetch"))
  const preparingRef = useRef(false)
  const inflightRef = useRef<Promise<void> | null>(null)

  const begin = useCallback(() => {
    inflightRef.current = null
    preparingRef.current = false
    setReady(false)
    setQuestionCount(0)
    setVisible(true)
    setSteps(createQuestionPrepareSteps("fetch"))
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    setReady(true)
  }, [])

  const prepare = useCallback(async (texts: string[]) => {
    if (inflightRef.current) {
      await inflightRef.current
      return
    }

    const run = (async () => {
      preparingRef.current = true
      setReady(false)
      setQuestionCount(texts.length)
      setVisible(true)
      setSteps(createQuestionPrepareSteps("parse"))

      try {
        await runQuestionPreparePipeline(texts, (id, status) => {
          setSteps((prev) => updateQuestionPrepareStep(prev, id, status))
        })
        await new Promise((resolve) => setTimeout(resolve, PREPARE_SETTLE_MS))
      } finally {
        preparingRef.current = false
        setReady(true)
        setVisible(false)
        inflightRef.current = null
      }
    })()

    inflightRef.current = run
    await run
  }, [])

  return {
    visible,
    ready,
    steps,
    questionCount,
    begin,
    prepare,
    dismiss,
  }
}
