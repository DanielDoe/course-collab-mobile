import { useMemo, type ReactNode } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { DashboardChartWebView } from "../dashboard/DashboardChartWebView"
import { FACULTY_CHART_HEIGHT } from "./faculty-chart-html"
import { useModuleTheme } from "../../lib/themed-module-shell"

type Props = {
  title: string
  html: string
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  height?: number
  legend?: ReactNode
}

export function FacultyChartCard({
  title,
  html,
  loading,
  empty,
  emptyMessage = "No data yet",
  height = FACULTY_CHART_HEIGHT,
  legend,
}: Props) {
  const { native, tokens, type } = useModuleTheme()
  const chartHtml = useMemo(() => {
    if (!html || empty) return ""
    return html
  }, [html, empty])

  return (
    <View style={[styles.card, { backgroundColor: native.secondaryGrouped }]}>
      <Text style={[type.bodyEmphasis, { color: native.label }]}>{title}</Text>
      {loading ? (
        <View style={[styles.loading, { height }]}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      ) : empty ? (
        <Text style={[type.caption, { color: native.secondaryLabel }]}>{emptyMessage}</Text>
      ) : chartHtml ? (
        <>
          <DashboardChartWebView html={chartHtml} height={height} />
          {legend}
        </>
      ) : (
        <Text style={[type.caption, { color: native.secondaryLabel }]}>{emptyMessage}</Text>
      )}
    </View>
  )
}

export function ChartLegendItem({ color, label }: { color: string; label: string }) {
  const { native, type } = useModuleTheme()

  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[type.caption, styles.legendText, { color: native.secondaryLabel }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  loading: { alignItems: "center", justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontWeight: "500" },
})
