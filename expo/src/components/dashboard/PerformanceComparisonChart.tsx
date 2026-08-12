import { useMemo } from "react"
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import type { PerformanceComparison } from "../../types/dashboard"
import { buildPerformanceComparisonChartHtml } from "./dashboard-chart-html"
import { DashboardCard } from "./DashboardCard"
import { DashboardChartWebView } from "./DashboardChartWebView"
import { nativeType } from "../../constants/faculty-native-theme"
import { useChartThemeColors } from "../../lib/themed-module-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"

const CHART_HEIGHT = 200

export function PerformanceComparisonChart({
  data,
  loading,
}: {
  data: PerformanceComparison[]
  loading: boolean
}) {
  const { width: screenWidth } = useWindowDimensions()
  const chartWidth = Math.max(280, screenWidth - 64)
  const chartColors = useChartThemeColors()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()

  const html = useMemo(
    () =>
      data.length > 0 && chartWidth > 0
        ? buildPerformanceComparisonChartHtml(data, chartWidth, chartColors)
        : "",
    [data, chartWidth, chartColors],
  )

  if (loading || chartWidth <= 0) {
    return (
      <DashboardCard title="Performance vs Class Average">
        <View style={styles.loading}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      </DashboardCard>
    )
  }

  if (data.length === 0) {
    return (
      <DashboardCard title="Performance vs Class Average">
        <View style={[styles.empty, { backgroundColor: native.fill }]}>
          <Text style={[styles.emptyText, { color: native.secondaryLabel }]}>
            No performance data yet. Complete quizzes and homework to see your comparison.
          </Text>
        </View>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard title="Performance vs Class Average">
      <DashboardChartWebView html={html} height={CHART_HEIGHT} />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: tokens.accent }]} />
          <Text style={[styles.legendText, { color: native.secondaryLabel }]}>You</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: "rgba(148,163,184,0.5)" }]} />
          <Text style={[styles.legendText, { color: native.secondaryLabel }]}>Class Avg</Text>
        </View>
      </View>
    </DashboardCard>
  )
}

const styles = StyleSheet.create({
  loading: { height: CHART_HEIGHT, alignItems: "center", justifyContent: "center" },
  empty: {
    height: 168,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  emptyText: { ...nativeType.caption, textAlign: "center", lineHeight: 20 },
  legend: { flexDirection: "row", gap: 16, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 16, height: 10, borderRadius: 3 },
  legendText: { ...nativeType.footnote, fontWeight: "500" },
})
