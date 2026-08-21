import { useEffect, useRef, type ReactNode } from "react"
import { useQuestionPrepareSession } from "../../hooks/useQuestionPrepareSession"
import { QuestionPrepareLoadingOverlay } from "./QuestionPrepareLoadingOverlay"

type Props = {
  fetching: boolean
  texts: string[] | null | undefined
  title: string
  subtitle?: string
  enabled?: boolean
  children: ReactNode
}

/** Shows a stepped prepare overlay while question copy is fetched and warmed, then reveals children. */
export function QuestionPrepareGate({
  fetching,
  texts,
  title,
  subtitle,
  enabled = true,
  children,
}: Props) {
  const { begin, prepare, dismiss, visible, steps, questionCount } = useQuestionPrepareSession()
  const lastTextsRef = useRef<string>("")

  useEffect(() => {
    if (!enabled) return
    if (fetching) begin()
  }, [enabled, fetching, begin])

  useEffect(() => {
    if (!enabled || fetching) return
    const list = texts ?? []
    if (list.length === 0) {
      lastTextsRef.current = ""
      dismiss()
      return
    }
    const signature = list.join("\u0001")
    if (signature === lastTextsRef.current) return
    lastTextsRef.current = signature
    void prepare(list)
  }, [enabled, fetching, texts, prepare, dismiss])

  const showOverlay = enabled && (fetching || visible) && (fetching || (texts?.length ?? 0) > 0)

  return (
    <>
      {children}
      <QuestionPrepareLoadingOverlay
        visible={showOverlay}
        title={title}
        subtitle={subtitle}
        steps={steps}
        questionCount={questionCount || texts?.length || 0}
      />
    </>
  )
}
