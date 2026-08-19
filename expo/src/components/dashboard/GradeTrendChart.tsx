import { useCallback, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg"
import type { GradeTrendPoint } from "../../types/dashboard"
import { DashboardCard } from "./DashboardCard"
import { nativeType } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  CHART_SERIES_LABEL,
  dashboardChartPalette,
  type ChartSeriesId,
} from "../../lib/dashboard-chart-palette"
import { useChartContentWidth } from "../../lib/responsive-layout"
import { areaFromLine, makeScale, nearestIndex, smoothPath, type Pt } from "./charts/chart-geometry"

const CHART_HEIGHT = 232
const TARGET = 80
const GRID_TICKS = [0, 25, 50, 75, 100]
const LABEL_TICKS = [0, 50, 100]
const SERIES_ORDER: ChartSeriesId[] = ["overall", "homework", "quiz"]
const AREA_SERIES: ChartSeriesId[] = ["quiz", "homework"]

function valueFor(point: GradeTrendPoint, id: ChartSeriesId): number | null {
  if (id === "overall") return point.overall ?? null
  if (id === "quiz") return point.quiz
  return point.homework
}

function labelStep(count: number): number {
  if (count <= 8) return 1
  const maxLabels = 6
  return Math.max(1, Math.ceil(count / maxLabels))
}

export function GradeTrendChart({ data, loading }: { data: GradeTrendPoint[]; loading: boolean }) {
  const chartWidth = useChartContentWidth()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const palette = useMemo(
    () => dashboardChartPalette(tokens),
    [tokens.id, tokens.isDark, tokens.accent, tokens.warning, tokens.success, tokens.chartPalette],
  )

  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const scale = useMemo(
    () =>
      makeScale({
        width: chartWidth,
        height: CHART_HEIGHT,
        count: data.length,
        padLeft: 36,
        padBottom: 28,
      }),
    [chartWidth, data.length],
  )
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const countRef = useRef(data.length)
  countRef.current = data.length

  const handleTouch = useCallback((x: number) => {
    if (countRef.current === 0) return
    setActiveIndex(nearestIndex(x, countRef.current, scaleRef.current))
  }, [])

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => handleTouch(e.nativeEvent.locationX),
        onPanResponderMove: (e) => handleTouch(e.nativeEvent.locationX),
        onPanResponderRelease: () => setActiveIndex(null),
        onPanResponderTerminate: () => setActiveIndex(null),
      }),
    [handleTouch],
  )

  const points = useMemo(() => {
    const out: Record<ChartSeriesId, (Pt & { i: number })[]> = { overall: [], homework: [], quiz: [] }
    data.forEach((d, i) => {
      for (const id of SERIES_ORDER) {
        const v = valueFor(d, id)
        if (v == null || v <= 0) continue
        out[id].push({ x: scale.xAt(i), y: scale.yAt(v), i })
      }
    })
    return out
  }, [data, scale])

  const seriesState = useMemo(() => {
    const out = {} as Record<ChartSeriesId, "line" | "point" | "none">
    for (const id of SERIES_ORDER) {
      const n = points[id].length
      out[id] = n >= 2 ? "line" : n === 1 ? "point" : "none"
    }
    return out
  }, [points])

  const hasData = data.some((w) => w.quiz > 0 || w.homework > 0 || (w.overall ?? 0) > 0)
  const xLabelStep = labelStep(data.length)

  if (loading) {
    return (
      <DashboardCard title="Grade trend" subtitle="Semester progress — drag to inspect a week">
        <View style={styles.state}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      </DashboardCard>
    )
  }

  if (!hasData || data.length === 0) {
    return (
      <DashboardCard title="Grade trend" subtitle="Semester progress — drag to inspect a week">
        <View style={[styles.state, styles.empty, { backgroundColor: native.fill }]}>
          <Text style={[styles.emptyText, { color: native.secondaryLabel }]}>
            No grade data yet. Complete quizzes and homework to see your trend.
          </Text>
        </View>
      </DashboardCard>
    )
  }

  const active = activeIndex != null ? data[activeIndex] : null

  return (
    <DashboardCard title="Grade trend" subtitle="Semester progress — drag to inspect a week">
      <View {...responder.panHandlers}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            <ClipPath id="gradePlot">
              <Rect
                x={scale.padLeft}
                y={scale.padTop}
                width={chartWidth - scale.padLeft - scale.padRight}
                height={scale.baselineY - scale.padTop}
                rx={12}
              />
            </ClipPath>

            {SERIES_ORDER.map((id) => (
              <LinearGradient key={`area-${id}`} id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={palette.seriesTop[id]} stopOpacity={id === "overall" ? 0.38 : 0.24} />
                <Stop offset="100%" stopColor={palette.series[id]} stopOpacity={0} />
              </LinearGradient>
            ))}

            {SERIES_ORDER.map((id) => (
              <LinearGradient key={`stroke-${id}`} id={`stroke-${id}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={palette.seriesDark[id]} />
                <Stop offset="100%" stopColor={palette.seriesTop[id]} />
              </LinearGradient>
            ))}
          </Defs>

          {LABEL_TICKS.map((tick) => (
            <SvgText
              key={`ylab-${tick}`}
              x={scale.padLeft - 8}
              y={scale.yAt(tick) + 3.5}
              fill={native.tertiaryLabel}
              fontSize={10}
              fontWeight="600"
              textAnchor="end"
            >
              {tick === 100 ? "100%" : String(tick)}
            </SvgText>
          ))}

          {data.map((d, i) =>
            i % xLabelStep === 0 || i === data.length - 1 ? (
              <SvgText
                key={`x-${i}`}
                x={scale.xAt(i)}
                y={CHART_HEIGHT - 6}
                fill={native.tertiaryLabel}
                fontSize={10}
                fontWeight="500"
                textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              >
                {d.label}
              </SvgText>
            ) : null,
          )}

          <G clipPath="url(#gradePlot)">
            {GRID_TICKS.map((tick) => (
              <Line
                key={`grid-${tick}`}
                x1={scale.padLeft}
                y1={scale.yAt(tick)}
                x2={chartWidth - scale.padRight}
                y2={scale.yAt(tick)}
                stroke={tick % 50 === 0 ? palette.grid : palette.gridFaint}
                strokeWidth={1}
                strokeDasharray={tick % 50 === 0 ? "3 3" : undefined}
              />
            ))}

            <Line
              x1={scale.padLeft}
              y1={scale.yAt(TARGET)}
              x2={chartWidth - scale.padRight}
              y2={scale.yAt(TARGET)}
              stroke={palette.target}
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />

            {AREA_SERIES.filter((id) => seriesState[id] === "line").map((id) => (
              <Path
                key={`area-${id}`}
                d={areaFromLine(points[id], scale.baselineY)}
                fill={`url(#area-${id})`}
              />
            ))}

            {seriesState.overall === "line" ? (
              <Path
                d={areaFromLine(points.overall, scale.baselineY)}
                fill="url(#area-overall)"
              />
            ) : null}

            {activeIndex != null ? (
              <Rect
                x={scale.xAt(activeIndex) - 10}
                y={scale.padTop}
                width={20}
                height={scale.baselineY - scale.padTop}
                rx={10}
                fill={palette.axis}
                fillOpacity={0.14}
              />
            ) : null}

            {SERIES_ORDER.filter((id) => seriesState[id] === "line").map((id) => (
              <Path
                key={id}
                d={smoothPath(points[id])}
                stroke={`url(#stroke-${id})`}
                strokeWidth={id === "overall" ? 2.75 : 2.25}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {SERIES_ORDER.filter((id) => seriesState[id] !== "none").map((id) =>
              points[id].map((p) => {
                const last = points[id][points[id].length - 1]
                const isEnd = last != null && p.i === last.i
                const isActive = activeIndex === p.i
                const r = isActive ? 4.5 : isEnd ? 4 : 2.8
                return (
                  <G key={`pt-${id}-${p.i}`}>
                    {isActive || (isEnd && activeIndex == null) ? (
                      <Circle cx={p.x} cy={p.y} r={r + 4} fill={palette.series[id]} fillOpacity={0.16} />
                    ) : null}
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={r}
                      fill={palette.seriesTop[id]}
                      stroke={native.secondaryGrouped}
                      strokeWidth={isActive || isEnd ? 2 : 1.5}
                    />
                  </G>
                )
              }),
            )}
          </G>

          <SvgText
            x={scale.padLeft + 6}
            y={scale.yAt(TARGET) - 5}
            fill={palette.targetLabel}
            fontSize={9}
            fontWeight="700"
            textAnchor="start"
          >
            {TARGET}% target
          </SvgText>
        </Svg>
      </View>

      <View
        style={[styles.readout, { backgroundColor: native.fill, opacity: active ? 1 : 0 }]}
        pointerEvents="none"
      >
        <Text style={[type.caption, styles.readoutLabel, { color: native.secondaryLabel }]}>
          {active?.label ?? "—"}
        </Text>
        <View style={styles.readoutRow}>
          {SERIES_ORDER.map((id) => (
            <View key={`ro-${id}`} style={styles.readoutItem}>
              <View style={[styles.dot, { backgroundColor: palette.series[id] }]} />
              <Text style={[type.caption, { color: native.label }]}>
                {(() => {
                  const v = active ? valueFor(active, id) : null
                  return v == null || v <= 0 ? "—" : `${Math.round(v)}%`
                })()}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.legend}>
        {SERIES_ORDER.map((id) => {
          const missing = seriesState[id] === "none"
          return (
            <View key={`lg-${id}`} style={[styles.legendItem, missing && styles.legendMuted]}>
              <View style={[styles.dot, { backgroundColor: palette.series[id] }]} />
              <Text style={[styles.legendText, { color: native.secondaryLabel }]}>
                {CHART_SERIES_LABEL[id]}
                {missing ? " · no data" : ""}
              </Text>
            </View>
          )
        })}
        <View style={styles.targetLegend}>
          <View style={[styles.targetDash, { backgroundColor: palette.target }]} />
          <Text style={[styles.legendText, { color: native.secondaryLabel }]}>{TARGET}% target</Text>
        </View>
      </View>
    </DashboardCard>
  )
}

const styles = StyleSheet.create({
  state: { height: CHART_HEIGHT, alignItems: "center", justifyContent: "center" },
  empty: { borderRadius: 14, paddingHorizontal: 16, height: 168 },
  emptyText: { ...nativeType.caption, textAlign: "center", lineHeight: 20 },
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
  legend: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendMuted: { opacity: 0.45 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...nativeType.footnote, fontWeight: "500" },
  targetLegend: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto" },
  targetDash: { width: 12, height: 2, borderRadius: 1 },
})
