import { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { BarChart } from "react-native-gifted-charts"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import type { GuestStatusBarItem } from "../../../lib/guest-dashboard-utils"

type Props = {
  items: GuestStatusBarItem[]
}

export function GuestDashboardStatusChart({ items }: Props) {
  const native = useThemedNative()
  const type = useNativeType()

  const chartData = useMemo(
    () =>
      items.map((item) => ({
        value: item.value,
        label: item.label.split(" ")[0] ?? item.label,
        frontColor: item.color,
        topLabelComponent: () => (
          <Text style={[type.footnote, styles.barTop, { color: native.secondaryLabel }]}>{item.value}</Text>
        ),
      })),
    [items, native.secondaryLabel, type.footnote],
  )

  const maxValue = Math.max(...items.map((item) => item.value), 1)

  if (items.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: native.fill }]}>
        <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center", lineHeight: 20 }]}>
          Status breakdown appears after your first recommendation request.
        </Text>
      </View>
    )
  }

  return (
    <BarChart
      data={chartData}
      barWidth={28}
      spacing={22}
      roundedTop
      roundedBottom
      hideRules
      xAxisThickness={0}
      yAxisThickness={0}
      yAxisTextStyle={{ color: native.secondaryLabel, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: native.secondaryLabel, fontSize: 10 }}
      noOfSections={Math.min(maxValue, 4)}
      maxValue={maxValue}
      height={156}
      isAnimated
      barBorderRadius={8}
      initialSpacing={12}
      endSpacing={12}
    />
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
  barTop: { fontSize: 10, marginBottom: 4, fontVariant: ["tabular-nums"], fontWeight: "600" },
})
