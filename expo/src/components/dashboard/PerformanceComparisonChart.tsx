import { useCallback, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import Svg, { Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg"
import type { PerformanceComparison } from "../../types/dashboard"
import { DashboardCard } from "./DashboardCard"
import { nativeType } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { dashboardChartPalette } from "../../lib/dashboard-chart-palette"
import { barPath, makeScale } from "./charts/chart-geometry"

const CHART_HEIGHT = 208
const Y_TICKS = [0, 50, 100]
const BAR_GAP = 3
const GROUP_INSET = 0.34

/** Two short lines beat one clipped line — "Homework …" told the student nothing. */
function labelLines(label: string): string[] {
  if (label.length <= 11) return [label]
  const words = label.split(/\s+/)
  if (words.length === 1) return [label.slice(0, 11)]
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")]
}

export function PerformanceComparisonChart({
  data,
  loading,
}: {
  data: PerformanceComparison[]
  loading: boolean
}) {
  const { width: screenWidth } = useWindowDimensions()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const palette = useMemo(
    () => dashboardChartPalette(tokens),
    [tokens.id, tokens.isDark, tokens.accent, tokens.warning, tokens.success, tokens.chartPalette],
  )

  const chartWidth = Math.max(260, Math.min(screenWidth - 64, 640))
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const scale = useMemo(
    () =>
      makeScale({
        width: chartWidth,
        height: CHART_HEIGHT,
        count: data.length,
        padLeft: 30,
        padBottom: 40,
        padTop: 28,
      }),
    [chartWidth, data.length],
  )

  const slot = data.length > 0 ? scale.innerW / data.length : scale.innerW
  const groupW = slot * (1 - GROUP_INSET)
  const barW = Math.max(6, (groupW - BAR_GAP) / 2)

  const toggle = useCallback((i: number) => {
    setActiveIndex((prev) => (prev === i ? null : i))
  }, [])

  if (loading) {
    return (
      <DashboardCard title="You vs class average" subtitle="Tap a group for exact scores">
        <View style={styles.state}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      </DashboardCard>
    )
  }

  if (data.length === 0) {
    return (
      <DashboardCard title="You vs class average" subtitle="Tap a group for exact scores">
        <View style={[styles.state, styles.empty, { backgroundColor: native.fill }]}>
          <Text style={[styles.emptyText, { color: native.secondaryLabel }]}>
            No performance data yet. Complete quizzes and homework to see your comparison.
          </Text>
        </View>
      </DashboardCard>
    )
  }

  const active = activeIndex != null ? data[activeIndex] : null

  return (
    <DashboardCard title="You vs class average" subtitle="Tap a group for exact scores">
      <View>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            {/* Vertical gradient per bar: lighter step of the same hue at the
                top, full chroma at the baseline. Lightness still increases
                monotonically with height, so the gradient never fights the
                magnitude the bar is encoding. */}
            <LinearGradient id="barYou" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={palette.barHighlight} />
              <Stop offset="12%" stopColor={palette.comparisonTop.you} />
              <Stop offset="100%" stopColor={palette.comparison.you} />
            </LinearGradient>
            <LinearGradient id="barAvg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={palette.barHighlight} />
              <Stop offset="14%" stopColor={palette.comparisonTop.classAvg} />
              <Stop offset="100%" stopColor={palette.comparison.classAvg} />
            </LinearGradient>
          </Defs>

          {Y_TICKS.map((tick) => {
            const y = scale.yAt(tick)
            return (
              <G key={`grid-${tick}`}>
                <Line
                  x1={scale.padLeft}
                  y1={y}
                  x2={chartWidth - scale.padRight}
                  y2={y}
                  stroke={palette.grid}
                  strokeWidth={1}
                />
                <SvgText
                  x={scale.padLeft - 7}
                  y={y + 3.5}
                  fill={native.tertiaryLabel}
                  fontSize={10}
                  fontWeight="500"
                  textAnchor="end"
                >
                  {tick}
                </SvgText>
              </G>
            )
          })}

          {data.map((d, i) => {
            const groupCenter = scale.padLeft + slot * i + slot / 2
            const youX = groupCenter - barW - BAR_GAP / 2
            const avgX = groupCenter + BAR_GAP / 2
            const isActive = activeIndex === i
            const dim = activeIndex != null && !isActive ? 0.38 : 1
            const youTop = scale.yAt(d.you)
            const avgTop = d.classAvg != null ? scale.yAt(d.classAvg) : null
            const youLabel = String(Math.round(d.you))
            const labelW = Math.max(22, youLabel.length * 7.2 + 10)
            const fitsAbove = youTop - 20 >= scale.padTop
            const pillX = youX + barW / 2 - labelW / 2
            const pillY = fitsAbove ? youTop - 20 : youTop + 5

            return (
              <G key={`bar-${i}`} opacity={dim}>
                <Path
                  d={barPath(youX, scale.padTop, barW, scale.baselineY, 8)}
                  fill={palette.barTrack}
                />
                {avgTop != null ? (
                  <>
                    <Path
                      d={barPath(avgX, scale.padTop, barW, scale.baselineY, 8)}
                      fill={palette.barTrack}
                    />
                    <Path
                      d={barPath(avgX, avgTop, barW, scale.baselineY, 8)}
                      fill="url(#barAvg)"
                    />
                  </>
                ) : null}
                <Path
                  d={barPath(youX, youTop, barW, scale.baselineY, 8)}
                  fill="url(#barYou)"
                />
                <Rect
                  x={pillX}
                  y={pillY}
                  width={labelW}
                  height={16}
                  rx={8}
                  fill={palette.comparison.you}
                />
                <SvgText
                  x={youX + barW / 2}
                  y={pillY + 12}
                  fill="#FFFFFF"
                  fontSize={10}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {youLabel}
                </SvgText>
                {labelLines(d.label).map((line, li, arr) => (
                  <SvgText
                    key={`lab-${i}-${li}`}
                    x={groupCenter}
                    y={CHART_HEIGHT - 16 + li * 11 + (arr.length === 1 ? 7 : 0)}
                    fill={native.tertiaryLabel}
                    fontSize={10}
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {line}
                  </SvgText>
                ))}
              </G>
            )
          })}

          <Line
            x1={scale.padLeft}
            y1={scale.baselineY}
            x2={chartWidth - scale.padRight}
            y2={scale.baselineY}
            stroke={palette.axis}
            strokeWidth={1}
          />
        </Svg>

        {/* Touch targets are the full group column — bigger than the marks */}
        <View style={[StyleSheet.absoluteFill, styles.hitRow, { paddingLeft: scale.padLeft, paddingRight: scale.padRight }]}>
          {data.map((d, i) => (
            <Pressable
              key={`hit-${i}`}
              style={styles.hit}
              onPress={() => toggle(i)}
              accessibilityRole="button"
              accessibilityLabel={
                d.classAvg != null
                  ? `${d.label}. You ${Math.round(d.you)} percent, class average ${Math.round(d.classAvg)} percent`
                  : `${d.label}. You ${Math.round(d.you)} percent, class average unavailable`
              }
            />
          ))}
        </View>
      </View>

      <View style={[styles.readout, { backgroundColor: native.fill, opacity: active ? 1 : 0 }]} pointerEvents="none">
        <Text style={[type.caption, styles.readoutLabel, { color: native.secondaryLabel }]}>
          {active?.label ?? "—"}
        </Text>
        <View style={styles.readoutRow}>
          <View style={styles.readoutItem}>
            <View style={[styles.swatch, { backgroundColor: palette.comparison.you }]} />
            <Text style={[type.caption, { color: native.label }]}>
              {active ? `${Math.round(active.you)}%` : "—"}
            </Text>
          </View>
          <View style={styles.readoutItem}>
            <View style={[styles.swatch, { backgroundColor: palette.comparison.classAvg }]} />
            <Text style={[type.caption, { color: native.label }]}>
              {active?.classAvg != null ? `${Math.round(active.classAvg)}%` : "Unavailable"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: palette.comparison.you }]} />
          <Text style={[styles.legendText, { color: native.secondaryLabel }]}>You</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: palette.comparison.classAvg }]} />
          <Text style={[styles.legendText, { color: native.secondaryLabel }]}>Class average</Text>
        </View>
      </View>
    </DashboardCard>
  )
}

const styles = StyleSheet.create({
  state: { height: CHART_HEIGHT, alignItems: "center", justifyContent: "center" },
  empty: { borderRadius: 14, paddingHorizontal: 16, height: 156 },
  emptyText: { ...nativeType.caption, textAlign: "center", lineHeight: 20 },
  hitRow: { flexDirection: "row" },
  hit: { flex: 1 },
  readout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  readoutLabel: { fontWeight: "600" },
  readoutRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  readoutItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legend: { flexDirection: "row", alignItems: "center", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 12, height: 8, borderRadius: 4 },
  legendText: { ...nativeType.footnote, fontWeight: "500" },
})
