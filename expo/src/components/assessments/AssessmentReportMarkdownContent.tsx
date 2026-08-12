import { useMemo } from "react"
import { prepareAssessmentReportMarkdown, needsMarkdownRichRender } from "../../lib/assessment-report-markdown"
import { useThemedNative } from "../../context/AppearanceProvider"
import { MarkdownContentWebView } from "../course-info/MarkdownContentWebView"
import { StyleSheet, Text } from "react-native"

type Props = {
  markdown: string
}

/** Markdown + KaTeX body for assessment result reports (AI feedback, answers, hints). */
export function AssessmentReportMarkdownContent({ markdown }: Props) {
  const native = useThemedNative()
  const rich = useMemo(() => needsMarkdownRichRender(markdown), [markdown])
  const prepared = useMemo(
    () => (rich ? prepareAssessmentReportMarkdown(markdown) : markdown.trim()),
    [markdown, rich],
  )

  if (!prepared.trim()) return null

  if (!rich) {
    return <Text style={[styles.plain, { color: native.label }]}>{prepared}</Text>
  }

  return <MarkdownContentWebView markdown={prepared} embedded />
}

const styles = StyleSheet.create({
  plain: { fontSize: 14, lineHeight: 21, fontWeight: "500" },
})
