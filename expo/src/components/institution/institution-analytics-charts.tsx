import { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { BarChart, LineChart } from "react-native-gifted-charts"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"

export type InstitutionChartBar = { label: string; value: number }

export function InstitutionBarChart({
  data,
  valueLabel = "Count",
  height = 180,
  emptyMessage = "Insufficient data for this period.",
}: {
  data: InstitutionChartBar[]
  valueLabel?: string
  height?: number
  emptyMessage?: string
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const filtered = useMemo(() => data.filter((d) => d.value > 0), [data])
  const maxValue = Math.max(...filtered.map((d) => d.value), 1)

  if (filtered.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: native.fill }]}>
        <Text style={[styles.emptyText, { color: native.secondaryLabel }]}>{emptyMessage}</Text>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.hint, { color: native.secondaryLabel }]}>{valueLabel}</Text>
      <BarChart
        data={filtered.map((d) => ({
          value: d.value,
          label: d.label.length > 8 ? d.label.slice(0, 7) + "…" : d.label,
          frontColor: tokens.accent,
        }))}
        barWidth={22}
        spacing={12}
        roundedTop
        roundedBottom
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ color: native.secondaryLabel, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: native.secondaryLabel, fontSize: 9 }}
        noOfSections={3}
        maxValue={maxValue + 1}
        height={height}
        isAnimated
      />
    </View>
  )
}

export function InstitutionLineChart({
  data,
  height = 160,
  emptyMessage = "Insufficient data for this period.",
}: {
  data: Array<{ label: string; value: number }>
  height?: number
  emptyMessage?: string
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const filtered = useMemo(() => data.filter((d) => d.value >= 0), [data])
  const maxValue = Math.max(...filtered.map((d) => d.value), 1)

  if (filtered.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: native.fill }]}>
        <Text style={[styles.emptyText, { color: native.secondaryLabel }]}>{emptyMessage}</Text>
      </View>
    )
  }

  return (
    <LineChart
      data={filtered.map((d) => ({
        value: d.value,
        label: d.label.length > 6 ? d.label.slice(0, 5) + "…" : d.label,
      }))}
      color={tokens.accent}
      thickness={2}
      hideRules
      xAxisThickness={0}
      yAxisThickness={0}
      yAxisTextStyle={{ color: native.secondaryLabel, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: native.secondaryLabel, fontSize: 9 }}
      noOfSections={3}
      maxValue={maxValue + 1}
      height={height}
      curved
      isAnimated
      areaChart
      startFillColor={tokens.accent}
      endFillColor={tokens.accent}
      startOpacity={0.15}
      endOpacity={0.02}
    />
  )
}

export function InstitutionFunnelChart({
  steps,
}: {
  steps: Array<{ label: string; value: number }>
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const max = Math.max(...steps.map((s) => s.value), 1)

  return (
    <View style={styles.funnel}>
      {steps.map((step) => (
        <View key={step.label} style={styles.funnelRow}>
          <Text style={[styles.funnelLabel, { color: native.label }]} numberOfLines={1}>
            {step.label}
          </Text>
          <View style={[styles.funnelTrack, { backgroundColor: native.fill }]}>
            <View
              style={[
                styles.funnelFill,
                {
                  width: `${Math.max(8, (step.value / max) * 100)}%`,
                  backgroundColor: tokens.accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.funnelValue, { color: native.secondaryLabel }]}>{step.value.toLocaleString()}</Text>
        </View>
      ))}
    </View>
  )
}

export function InstitutionMixChart({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>
}) {
  const native = useThemedNative()
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) {
    return (
      <View style={[styles.empty, { backgroundColor: native.fill }]}>
        <Text style={[styles.emptyText, { color: native.secondaryLabel }]}>Insufficient data</Text>
      </View>
    )
  }
  return (
    <View style={styles.mixWrap}>
      <View style={[styles.mixTrack, { backgroundColor: native.fill }]}>
        {segments.map((seg) =>
          seg.value > 0 ? (
            <View
              key={seg.label}
              style={{ flex: seg.value, backgroundColor: seg.color, height: "100%" }}
            />
          ) : null,
        )}
      </View>
      {segments.map((seg) => (
        <Text key={seg.label} style={[styles.mixLegend, { color: native.secondaryLabel }]}>
          {seg.label}: {Math.round((seg.value / total) * 100)}% ({seg.value})
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  hint: { fontSize: 11, marginBottom: 4 },
  empty: { borderRadius: 12, padding: 16, minHeight: 72, justifyContent: "center" },
  emptyText: { textAlign: "center", fontSize: 13, lineHeight: 18 },
  funnel: { gap: 10 },
  funnelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  funnelLabel: { width: 110, fontSize: 12 },
  funnelTrack: { flex: 1, height: 10, borderRadius: 999, overflow: "hidden" },
  funnelFill: { height: "100%", borderRadius: 999 },
  funnelValue: { width: 36, textAlign: "right", fontSize: 11, fontVariant: ["tabular-nums"] },
  mixWrap: { gap: 6 },
  mixTrack: { height: 12, borderRadius: 999, overflow: "hidden", flexDirection: "row" },
  mixLegend: { fontSize: 11 },
})
