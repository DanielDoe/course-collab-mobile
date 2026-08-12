import { useCallback, useRef, useState } from "react"
import {
  createQuestionPrepareSteps,
  runQuestionPreparePipeline,
  updateQuestionPrepareStep,
  type QuestionPrepareStep,
} from "../lib/question-prepare"

export function useQuestionPrepareSession() {
  const [visible, setVisible] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [steps, setSteps] = useState<QuestionPrepareStep[]>(() => createQuestionPrepareSteps("fetch"))
  const preparingRef = useRef(false)

  const begin = useCallback(() => {
    preparingRef.current = false
    setQuestionCount(0)
    setVisible(true)
    setSteps(createQuestionPrepareSteps("fetch"))
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
  }, [])

  const prepare = useCallback(async (texts: string[]) => {
    if (preparingRef.current) return
    preparingRef.current = true
    setQuestionCount(texts.length)
    setVisible(true)
    setSteps(createQuestionPrepareSteps("parse"))

    try {
      await runQuestionPreparePipeline(texts, (id, status) => {
        setSteps((prev) => updateQuestionPrepareStep(prev, id, status))
      })
    } finally {
      preparingRef.current = false
      setVisible(false)
    }
  }, [])

  return {
    visible,
    steps,
    questionCount,
    begin,
    prepare,
    dismiss,
  }
}
