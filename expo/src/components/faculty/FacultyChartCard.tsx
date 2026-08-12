import { useMemo } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { DashboardChartWebView } from "../dashboard/DashboardChartWebView"
import { DashboardCard } from "../dashboard/DashboardCard"
import { FACULTY_CHART_HEIGHT } from "./faculty-chart-html"
import { useModuleTheme } from "../../lib/themed-module-shell"

type Props = {
  title: string
  html: string
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  height?: number
  legend?: React.ReactNode
}

export function FacultyChartCard({
  title,
  html,
  loading,
  empty,
  emptyMessage = "No data yet",
  height = FACULTY_CHART_HEIGHT,
  legend}: Props) {
  const { native, tokens, type } = useModuleTheme()
  const chartHtml = useMemo(() => {
    if (!html || empty) return ""
    return html
  }, [html, empty])

  return (
    <DashboardCard title={title}>
      {loading ? (
        <View style={[styles.loading, { height }]}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      ) : empty ? (
        <View
          style={[
            styles.empty,
            {
              height,
              borderColor: native.separator,
              backgroundColor: native.fill,
            },
          ]}
        >
          <Text style={[type.secondary, styles.emptyText, { color: native.secondaryLabel }]}>{emptyMessage}</Text>
        </View>
      ) : chartHtml ? (
        <>
          <DashboardChartWebView html={chartHtml} height={height} />
          {legend}
        </>
      ) : (
        <View
          style={[
            styles.empty,
            {
              height,
              borderColor: native.separator,
              backgroundColor: native.fill,
            },
          ]}
        >
          <Text style={[type.secondary, styles.emptyText, { color: native.secondaryLabel }]}>{emptyMessage}</Text>
        </View>
      )}
    </DashboardCard>
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
  loading: { alignItems: "center", justifyContent: "center" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingHorizontal: 16},
  emptyText: { textAlign: "center", lineHeight: 20 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontWeight: "500" }})
