import { useCallback, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
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
import { areaRibbon, makeScale, nearestIndex, smoothPath, type Pt } from "./charts/chart-geometry"

const CHART_HEIGHT = 216
const TARGET = 80
const GRID_TICKS = [0, 25, 50, 75, 100]
const LABEL_TICKS = [0, 50, 100]
const SERIES_ORDER: ChartSeriesId[] = ["overall", "homework", "quiz"]

/**
 * Returns null for "no reading this week" rather than 0.
 *
 * `buildGradeTrendSeries` only ever populates `overall` on the final week and
 * leaves the earlier five `undefined`. Coercing those to 0 drew a line saying
 * the student sat at 0% for five weeks and then leapt to their real grade —
 * a fabricated trend. A gap is plotted as a gap.
 */
function valueFor(point: GradeTrendPoint, id: ChartSeriesId): number | null {
  if (id === "overall") return point.overall ?? null
  if (id === "quiz") return point.quiz
  return point.homework
}

export function GradeTrendChart({ data, loading }: { data: GradeTrendPoint[]; loading: boolean }) {
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
    () => makeScale({ width: chartWidth, height: CHART_HEIGHT, count: data.length }),
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
        if (v == null) continue
        out[id].push({ x: scale.xAt(i), y: scale.yAt(v), i })
      }
    })
    return out
  }, [data, scale])

  /** A series with a single reading gets a marker, not a line to nowhere. */
  const seriesState = useMemo(() => {
    const out = {} as Record<ChartSeriesId, "line" | "point" | "none">
    for (const id of SERIES_ORDER) {
      const n = points[id].length
      out[id] = n >= 2 ? "line" : n === 1 ? "point" : "none"
    }
    return out
  }, [points])

  const hasData = data.some((w) => w.quiz > 0 || w.homework > 0 || (w.overall ?? 0) > 0)

  if (loading) {
    return (
      <DashboardCard title="Grade trend" subtitle="Your averages week over week">
        <View style={styles.state}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      </DashboardCard>
    )
  }

  if (!hasData || data.length === 0) {
    return (
      <DashboardCard title="Grade trend" subtitle="Your averages week over week">
        <View style={[styles.state, styles.empty, { backgroundColor: native.fill }]}>
          <Text style={[styles.emptyText, { color: native.secondaryLabel }]}>
            No grade data yet. Complete quizzes and homework to see your trend.
          </Text>
        </View>
      </DashboardCard>
    )
  }

  const active = activeIndex != null ? data[activeIndex] : null
  const labelStep = Math.max(1, Math.ceil(data.length / 6))

  return (
    <DashboardCard title="Grade trend" subtitle="Your averages week over week">
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
                <Stop
                  offset="0%"
                  stopColor={palette.seriesTop[id]}
                  stopOpacity={id === "overall" ? 0.42 : 0.3}
                />
                <Stop offset="70%" stopColor={palette.series[id]} stopOpacity={0.06} />
                <Stop offset="100%" stopColor={palette.series[id]} stopOpacity={0} />
              </LinearGradient>
            ))}

            <LinearGradient id="goalBand" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={palette.targetZone} stopOpacity={0} />
              <Stop offset="100%" stopColor={palette.targetZone} stopOpacity={1} />
            </LinearGradient>

            {SERIES_ORDER.map((id) => (
              <LinearGradient key={`grad-${id}`} id={`stroke-${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={palette.seriesTop[id]} stopOpacity={1} />
                <Stop offset="100%" stopColor={palette.series[id]} stopOpacity={1} />
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
            i % labelStep === 0 || i === data.length - 1 ? (
              <SvgText
                key={`x-${i}`}
                x={scale.xAt(i)}
                y={CHART_HEIGHT - 8}
                fill={native.tertiaryLabel}
                fontSize={10}
                fontWeight="500"
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            ) : null,
          )}

          <G clipPath="url(#gradePlot)">
            <Rect
              x={scale.padLeft}
              y={scale.yAt(100)}
              width={chartWidth - scale.padLeft - scale.padRight}
              height={scale.yAt(TARGET) - scale.yAt(100)}
              fill="url(#goalBand)"
            />

            {GRID_TICKS.map((tick) => (
              <Line
                key={`grid-${tick}`}
                x1={scale.padLeft}
                y1={scale.yAt(tick)}
                x2={chartWidth - scale.padRight}
                y2={scale.yAt(tick)}
                stroke={tick % 50 === 0 ? palette.grid : palette.gridFaint}
                strokeWidth={1}
              />
            ))}

            <Line
              x1={scale.padLeft}
              y1={scale.yAt(TARGET)}
              x2={chartWidth - scale.padRight}
              y2={scale.yAt(TARGET)}
              stroke={palette.target}
              strokeWidth={1.25}
              strokeDasharray="3 5"
            />

            {(["homework", "quiz", "overall"] as const)
              .filter((id) => seriesState[id] === "line")
              .slice(0, 1)
              .map((id) => (
                <Path
                  key={`area-${id}`}
                  d={areaRibbon(points[id], 28, scale.baselineY)}
                  fill={`url(#area-${id})`}
                />
              ))}

            {activeIndex != null ? (
              <Rect
                x={scale.xAt(activeIndex) - 10}
                y={scale.padTop}
                width={20}
                height={scale.baselineY - scale.padTop}
                rx={10}
                fill={palette.axis}
                fillOpacity={0.12}
              />
            ) : null}

            {SERIES_ORDER.filter((id) => seriesState[id] === "line").map((id) => (
              <Path
                key={`glow-${id}`}
                d={smoothPath(points[id])}
                stroke={palette.series[id]}
                strokeWidth={9}
                strokeOpacity={0.16}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {SERIES_ORDER.filter((id) => seriesState[id] === "line").map((id) => (
              <Path
                key={id}
                d={smoothPath(points[id])}
                stroke={`url(#stroke-${id})`}
                strokeWidth={3}
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
                const r = isActive ? 4.5 : isEnd ? 4 : 2.6
                return (
                  <G key={`pt-${id}-${p.i}`}>
                    {isActive || (isEnd && activeIndex == null) ? (
                      <Circle cx={p.x} cy={p.y} r={r + 4.5} fill={palette.series[id]} fillOpacity={0.18} />
                    ) : null}
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={r}
                      fill={isEnd || isActive ? palette.seriesTop[id] : palette.series[id]}
                      stroke={native.secondaryGrouped}
                      strokeWidth={isActive || isEnd ? 2 : 1.25}
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
            {TARGET}%
          </SvgText>
        </Svg>
      </View>

      {/* Tooltip / readout — replaces the hover card a WebView chart would show */}
      <View
        style={[
          styles.readout,
          { backgroundColor: native.fill, opacity: active ? 1 : 0 },
        ]}
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
                  return v == null ? "—" : `${Math.round(v)}%`
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
              <View style={[styles.swatch, { backgroundColor: palette.series[id] }]} />
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
  swatch: { width: 14, height: 4, borderRadius: 2 },
  legendText: { ...nativeType.footnote, fontWeight: "500" },
  targetLegend: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto" },
  targetDash: { width: 12, height: 2, borderRadius: 1 },
})
