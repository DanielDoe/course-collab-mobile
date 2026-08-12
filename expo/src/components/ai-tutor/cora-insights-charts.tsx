import { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { BarChart } from "react-native-gifted-charts"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  masteryColor,
  normalizeMasteryPercent,
  weeklyPatternToChartData,
  type CoraConceptMastery,
} from "../../lib/cora-insights-types"

export function WeeklyActivityChart({
  weeklyPattern,
  height = 160,
}: {
  weeklyPattern?: Record<number, number>
  height?: number
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const data = useMemo(() => weeklyPatternToChartData(weeklyPattern), [weeklyPattern])
  const hasData = data.some((d) => d.value > 0)
  const maxValue = Math.max(...data.map((d) => d.value), 1)

  if (!hasData) {
    return (
      <View style={[styles.empty, { backgroundColor: native.fill }]}>
        <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center" }]}>
          Chat or Solve with Cora this week to see your activity pattern.
        </Text>
      </View>
    )
  }

  return (
    <BarChart
      data={data.map((d) => ({
        value: d.value,
        label: d.label,
        frontColor: tokens.accent,
      }))}
      barWidth={28}
      spacing={14}
      roundedTop
      roundedBottom
      hideRules
      xAxisThickness={0}
      yAxisThickness={0}
      yAxisTextStyle={{ color: native.secondaryLabel, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: native.secondaryLabel, fontSize: 10 }}
      noOfSections={3}
      maxValue={maxValue + 1}
      height={height}
      isAnimated
    />
  )
}

export function InteractionMixChart({
  conceptQuestions = 0,
  debugQuestions = 0,
}: {
  conceptQuestions?: number
  debugQuestions?: number
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const total = conceptQuestions + debugQuestions

  if (total === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: native.fill }]}>
        <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center" }]}>
          Cora will show how you split Chat vs Solve-style questions here.
        </Text>
      </View>
    )
  }

  const conceptPct = Math.round((conceptQuestions / total) * 100)
  const debugPct = 100 - conceptPct

  return (
    <View style={styles.mixWrap}>
      <View style={[styles.mixTrack, { backgroundColor: native.fill }]}>
        <View style={[styles.mixSegment, { width: `${conceptPct}%`, backgroundColor: "#8b5cf6" }]} />
        <View style={[styles.mixSegment, { width: `${debugPct}%`, backgroundColor: "#10b981" }]} />
      </View>
      <View style={styles.legendRow}>
        <LegendDot color="#8b5cf6" label={`Chat / concepts ${conceptPct}%`} />
        <LegendDot color="#10b981" label={`Solve / debug ${debugPct}%`} />
      </View>
      <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 6 }]}>
        {total} tracked interaction{total === 1 ? "" : "s"} in the last 30 days
      </Text>
    </View>
  )
}

export function TopicMasteryBars({ topics }: { topics: CoraConceptMastery[] }) {
  const native = useThemedNative()
  const type = useNativeType()
  const SN = useThemedStudentNative()
  const rows = topics.slice(0, 8)

  if (rows.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: native.fill }]}>
        <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center" }]}>
          Topics appear here as you use Solve and Chat — Cora maps mastery from your sessions.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.masteryList}>
      {rows.map((item) => {
        const pct = normalizeMasteryPercent(item.mastery)
        const color = masteryColor(pct)
        return (
          <View key={item.topic} style={styles.masteryRow}>
            <View style={styles.masteryTop}>
              <Text style={[type.bodyEmphasis, styles.masteryTopic]} numberOfLines={1}>
                {item.topic}
              </Text>
              <Text style={[type.caption, { color: SN.secondaryLabel, fontVariant: ["tabular-nums"] }]}>
                {pct}%
              </Text>
            </View>
            <View style={[styles.masteryTrack, { backgroundColor: native.fill }]}>
              <View style={[styles.masteryFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            {item.questionsAsked != null && item.questionsAsked > 0 ? (
              <Text style={[type.footnote, { color: SN.secondaryLabel, marginTop: 4 }]}>
                {item.questionsAsked} question{item.questionsAsked === 1 ? "" : "s"}
                {item.accuracy != null ? ` · ${Math.round(item.accuracy)}% accuracy` : ""}
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[type.footnote, { color: native.secondaryLabel }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  empty: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 18,
    minHeight: 72,
    justifyContent: "center",
  },
  mixWrap: { gap: 8 },
  mixTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
  },
  mixSegment: { height: "100%" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  masteryList: { gap: 14 },
  masteryRow: {},
  masteryTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  masteryTopic: { flex: 1 },
  masteryTrack: { height: 8, borderRadius: 999, overflow: "hidden", marginTop: 6 },
  masteryFill: { height: "100%", borderRadius: 999 },
})
