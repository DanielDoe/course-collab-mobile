import { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { BarChart } from "react-native-gifted-charts"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  ATTENDANCE_STATUS_COLORS,
  attendanceProgressTrack,
  attendanceWeeklyBarColor,
} from "../../lib/attendance-overview-theme"
import type { AttendanceWeeklyBar } from "../../lib/attendance-overview-utils"

export function AttendanceWeeklyChart({ weeks }: { weeks: AttendanceWeeklyBar[] }) {
  const native = useThemedNative()
  const type = useNativeType()
  const hasData = weeks.some((w) => w.total > 0)
  const chartData = useMemo(
    () =>
      weeks.map((week) => ({
        value: week.total > 0 ? week.rate : 0,
        label: week.label,
        frontColor: attendanceWeeklyBarColor(week.rate, week.total),
        topLabelComponent: () =>
          week.total > 0 ? (
            <Text style={[type.footnote, styles.barTop, { color: native.secondaryLabel }]}>
              {week.attended}/{week.total}
            </Text>
          ) : (
            <Text style={[type.footnote, styles.barTop, { color: native.tertiaryLabel }]}>—</Text>
          ),
      })),
    [weeks, native.secondaryLabel, native.tertiaryLabel, type.footnote],
  )

  if (!hasData) {
    return (
      <View style={[styles.empty, { backgroundColor: native.fill }]}>
        <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center" }]}>
          Your weekly pattern will appear after a few class check-ins.
        </Text>
      </View>
    )
  }

  return (
    <BarChart
      data={chartData}
      barWidth={22}
      spacing={18}
      roundedTop
      roundedBottom
      hideRules
      xAxisThickness={0}
      yAxisThickness={0}
      yAxisTextStyle={{ color: native.secondaryLabel, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: native.secondaryLabel, fontSize: 10 }}
      noOfSections={4}
      maxValue={100}
      height={148}
      isAnimated
      barBorderRadius={6}
    />
  )
}

export function AttendanceStatusMix({
  present,
  late,
  absent,
  other,
}: {
  present: number
  late: number
  absent: number
  other: number
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const total = present + late + absent + other

  if (total === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: native.fill }]}>
        <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center" }]}>
          Session breakdown fills in as you check in throughout the term.
        </Text>
      </View>
    )
  }

  const segments = [
    { key: "present", count: present, color: ATTENDANCE_STATUS_COLORS.present, label: "Present" },
    { key: "late", count: late, color: ATTENDANCE_STATUS_COLORS.late, label: "Late" },
    { key: "absent", count: absent, color: ATTENDANCE_STATUS_COLORS.absent, label: "Missed" },
    ...(other > 0
      ? [{ key: "other", count: other, color: ATTENDANCE_STATUS_COLORS.other, label: "Other" }]
      : []),
  ].filter((s) => s.count > 0)

  return (
    <View style={styles.mixWrap}>
      <View style={[styles.mixTrack, { backgroundColor: attendanceProgressTrack(tokens.isDark) }]}>
        {segments.map((segment) => (
          <View
            key={segment.key}
            style={[styles.mixSegment, { flex: segment.count, backgroundColor: segment.color }]}
          />
        ))}
      </View>
      <View style={styles.legendRow}>
        {segments.map((segment) => (
          <LegendChip
            key={segment.key}
            color={segment.color}
            label={`${segment.label} ${segment.count}`}
          />
        ))}
      </View>
    </View>
  )
}

function LegendChip({ color, label }: { color: string; label: string }) {
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
  barTop: { fontSize: 9, marginBottom: 4, fontVariant: ["tabular-nums"] },
  mixWrap: { gap: 10 },
  mixTrack: {
    height: 14,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
  },
  mixSegment: { height: "100%", minWidth: 4 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
})
