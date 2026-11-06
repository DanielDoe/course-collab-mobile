import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import type { FacultyAiInsightsSummary } from "../../lib/instructor-api"
import { FACULTY_STUDENT_PROGRESS_COLOR } from "../../lib/faculty-student-progress-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { MarkdownContentWebView } from "../course-info/MarkdownContentWebView"

function titleCaseInsight(value?: string) {
  return String(value ?? "Insight")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function insightItems(preview?: string): Array<{ title: string; body: string }> {
  if (!preview) return []
  const trimmed = preview.trim()
  const tryParse = (raw: string) => {
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }
  const data = trimmed.startsWith("{") || trimmed.startsWith("[") ? tryParse(trimmed) : null
  if (data && typeof data === "object") {
    const row = data as Record<string, unknown>
    const gaps = Array.isArray(row.gaps) ? row.gaps : null
    if (gaps?.length) {
      return gaps.slice(0, 6).map((gap) => {
        const item = gap as Record<string, unknown>
        return {
          title: String(item.topic ?? "Topic"),
          body: String(item.impact ?? item.note ?? item.summary ?? "").trim(),
        }
      })
    }
    const summary = row.summary ?? row.message ?? row.preview ?? row.insight
    if (summary) return [{ title: "Insight", body: String(summary) }]
  }
  const topics = [...trimmed.matchAll(/"topic"\s*:\s*"([^"]+)"/g)].map((m) => m[1])
  const impacts = [...trimmed.matchAll(/"impact"\s*:\s*"([^"]+)/g)].map((m) => m[1].replace(/\\n/g, " ").replace(/["}]+$/, "").trim())
  if (topics.length) {
    return topics.slice(0, 6).map((title, index) => ({ title, body: impacts[index] ?? "" }))
  }
  return trimmed
    .split(/\s·\s|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [title, ...rest] = part.split(" — ")
      return { title: title.trim(), body: rest.join(" — ").trim() }
    })
}

type Props = {
  loading: boolean
  error: string
  summary: FacultyAiInsightsSummary | null
}

export function FacultyAiInsightsPanel({ loading, error, summary }: Props) {
  const { styles: moduleStyles, native, type } = useModuleTheme()

  if (error) {
    return (
      <View style={moduleStyles.errorBox}>
        <Text style={moduleStyles.errorText}>{error}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={FACULTY_STUDENT_PROGRESS_COLOR.link} />
      </View>
    )
  }

  if (!summary) {
    return <Text style={[type.body, { color: native.secondaryLabel }]}>No stored insights yet.</Text>
  }

  const cards = (summary.recentInsights ?? []).flatMap((row) => {
    const items = insightItems(row.preview)
    if (!items.length) {
      return [{ heading: titleCaseInsight(row.type), title: "", body: "No summary yet." }]
    }
    return items.map((item) => ({
      heading: titleCaseInsight(row.type),
      title: item.title,
      body: item.body,
    }))
  })

  return (
    <View style={styles.sectionGap}>
      <View style={[styles.listCard, { backgroundColor: native.secondaryGrouped }]}>
        <View style={styles.listRow}>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>Last 14 days</Text>
          <Text style={[type.body, { color: native.secondaryLabel }]}>
            {summary.tutor.conversations14d} turns · {summary.tutor.uniqueStudents14d} students ·{" "}
            {summary.tutor.uniqueTopics14d} topics
          </Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            Avg mastery {summary.mastery.avgMastery}% · {summary.earlyWarningCount} early warnings
          </Text>
        </View>
      </View>
      {cards.length === 0 ? (
        <Text style={[type.body, { color: native.secondaryLabel }]}>No stored insight notes yet.</Text>
      ) : (
        cards.map((card, index) => (
          <View key={`${card.heading}-${card.title}-${index}`} style={[styles.listCard, { backgroundColor: native.secondaryGrouped }]}>
            <View style={styles.listRow}>
              <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>{card.heading}</Text>
              {card.title ? (
                <Text style={[type.bodyEmphasis, { color: native.label }]}>{card.title}</Text>
              ) : null}
              {card.body ? <MarkdownContentWebView markdown={card.body} variant="embedded" /> : null}
            </View>
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionGap: { gap: 12 },
  loadingBox: { paddingVertical: 32, alignItems: "center" },
  listCard: { borderRadius: 16, overflow: "hidden" },
  listRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
})
