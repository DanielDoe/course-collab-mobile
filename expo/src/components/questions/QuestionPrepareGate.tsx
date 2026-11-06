import { useEffect, useRef, type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useQuestionPrepareSession } from "../../hooks/useQuestionPrepareSession"
import { shouldShowQuestionPrepareOverlay } from "../../lib/question-prepare-overlay"
import { QuestionPrepareLoadingOverlay } from "./QuestionPrepareLoadingOverlay"

type Props = {
  fetching: boolean
  texts: string[] | null | undefined
  title: string
  subtitle?: string
  enabled?: boolean
  /** When true, quiz content stays hidden until fetch + prepare finish. */
  hideUntilReady?: boolean
  /** When false with hideUntilReady, keep the overlay up until question text has painted. */
  paintReady?: boolean
  children: ReactNode | (() => ReactNode)
}

function renderGateChildren(children: Props["children"]): ReactNode {
  return typeof children === "function" ? children() : children
}

/** Shows a stepped prepare overlay while question copy is fetched and warmed, then reveals children. */
export function QuestionPrepareGate({
  fetching,
  texts,
  title,
  subtitle,
  enabled = true,
  hideUntilReady = false,
  paintReady,
  children,
}: Props) {
  const { begin, prepare, dismiss, visible, ready, steps, questionCount } = useQuestionPrepareSession()
  const tokens = useAppThemeTokens()
  const lastTextsRef = useRef<string>("")

  useEffect(() => {
    if (!enabled) return
    if (fetching) begin()
  }, [enabled, fetching, begin])

  useEffect(() => {
    if (!enabled) {
      dismiss()
      return
    }
    if (fetching) return
    const list = texts ?? []
    if (list.length === 0) {
      lastTextsRef.current = ""
      dismiss()
      return
    }
    const signature = list.join("\u0001")
    if (signature === lastTextsRef.current) {
      if (!fetching && !visible) dismiss()
      return
    }
    lastTextsRef.current = signature
    void prepare(list)
  }, [enabled, fetching, texts, prepare, dismiss])

  const showOverlay = shouldShowQuestionPrepareOverlay({
    enabled,
    ready,
    fetching,
    visible,
    hideUntilReady,
    textCount: texts?.length ?? 0,
    paintReady,
  })
  const mountChildren = !enabled || !hideUntilReady || !fetching
  const hideChildren = hideUntilReady && showOverlay

  return (
    <>
      {mountChildren ? (
        <View
          style={[styles.fill, { backgroundColor: tokens.background }]}
          pointerEvents={hideChildren ? "none" : "auto"}
          accessibilityElementsHidden={hideChildren}
          importantForAccessibility={hideChildren ? "no-hide-descendants" : "auto"}
        >
          <View style={[styles.fill, hideChildren && styles.hidden]}>{renderGateChildren(children)}</View>
        </View>
      ) : (
        <View style={[styles.fill, { backgroundColor: tokens.background }]} />
      )}
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

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { opacity: 0 },
})
