import { useMemo } from "react"
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import type { GradeTrendPoint } from "../../types/dashboard"
import { buildGradeTrendChartHtml, type ChartThemeColors } from "./dashboard-chart-html"
import { DashboardCard } from "./DashboardCard"
import { DashboardChartWebView } from "./DashboardChartWebView"
import { nativeType } from "../../constants/faculty-native-theme"
import { useChartThemeColors } from "../../lib/themed-module-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"

const CHART_HEIGHT = 240

export function GradeTrendChart({ data, loading }: { data: GradeTrendPoint[]; loading: boolean }) {
  const { width: screenWidth } = useWindowDimensions()
  const chartWidth = Math.max(280, screenWidth - 64)
  const chartColors = useChartThemeColors()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()

  const html = useMemo(
    () =>
      data.length > 0 && chartWidth > 0
        ? buildGradeTrendChartHtml(data, chartWidth, chartColors)
        : "",
    [data, chartWidth, chartColors],
  )

  if (loading || chartWidth <= 0) {
    return (
      <DashboardCard title="Grade Trend Over Time">
        <View style={styles.loading}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      </DashboardCard>
    )
  }

  const hasData = data.some(
    (w) => w.quiz > 0 || w.homework > 0 || (w.overall != null && w.overall > 0),
  )

  if (!hasData || data.length === 0) {
    return (
      <DashboardCard title="Grade Trend Over Time">
        <View style={[styles.empty, { backgroundColor: native.fill }]}>
          <Text style={[styles.emptyText, { color: native.secondaryLabel }]}>
            No grade data yet. Complete quizzes and homework to see your trend.
          </Text>
        </View>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard title="Grade Trend Over Time">
      <DashboardChartWebView html={html} height={CHART_HEIGHT} />

      <View style={styles.legend}>
        <LegendDot color={chartColors.success} label="Overall Grade" />
        <LegendDot color={chartColors.accent} label="Quiz Avg" />
        <LegendDot color={chartColors.warning} label="Homework Avg" />
        <View style={styles.targetLegend}>
          <View style={[styles.targetDot, { borderColor: chartColors.warning }]} />
          <Text style={[styles.legendText, { color: native.secondaryLabel }]}>80% target</Text>
        </View>
      </View>
    </DashboardCard>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const native = useThemedNative()
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: native.secondaryLabel }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: { height: CHART_HEIGHT, alignItems: "center", justifyContent: "center" },
  empty: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  emptyText: { ...nativeType.caption, textAlign: "center", lineHeight: 20 },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...nativeType.footnote, fontWeight: "500" },
  targetLegend: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto" },
  targetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderStyle: "dashed",
  },
})
