import { useCallback, useEffect, useRef, useState } from "react"
import {
  QUESTION_PAINT_FALLBACK_MS,
  questionPaintReadyAfterMark,
} from "../lib/question-paint-ready"

/** Holds a question card hidden until every prompt/option WebView reports painted. */
export function useQuestionPaintReady(questionId: number | string | undefined, expected: number) {
  const [ready, setReady] = useState(expected <= 0)
  const receivedRef = useRef(0)
  const expectedRef = useRef(expected)

  const seenRef = useRef(new Set<string>())

  useEffect(() => {
    receivedRef.current = 0
    expectedRef.current = expected
    seenRef.current = new Set()
    setReady(expected <= 0)
    if (expected <= 0) return
    const timeout = setTimeout(() => setReady(true), QUESTION_PAINT_FALLBACK_MS)
    return () => clearTimeout(timeout)
  }, [questionId, expected])

  const markReady = useCallback((slot?: string) => {
    const key = slot ?? `__${receivedRef.current}`
    if (seenRef.current.has(key)) return
    seenRef.current.add(key)
    receivedRef.current += 1
    if (questionPaintReadyAfterMark(receivedRef.current, expectedRef.current)) {
      setReady(true)
    }
  }, [])

  return { ready, markReady }
}
