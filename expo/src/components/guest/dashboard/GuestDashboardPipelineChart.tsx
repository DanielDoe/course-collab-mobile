import { StyleSheet, Text, View } from "react-native"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import type { GuestPipelineSegment } from "../../../lib/guest-dashboard-utils"

type Props = {
  segments: GuestPipelineSegment[]
  total: number
}

export function GuestDashboardPipelineChart({ segments, total }: Props) {
  const native = useThemedNative()
  const type = useNativeType()

  if (total === 0 || segments.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: native.fill }]}>
        <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center", lineHeight: 20 }]}>
          Your letter pipeline will appear once you create a recommendation request.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.track, { backgroundColor: native.fill }]}>
        {segments.map((segment) => (
          <View
            key={segment.key}
            accessibilityLabel={`${segment.label}: ${segment.count}`}
            style={[styles.segment, { flex: segment.count, backgroundColor: segment.color }]}
          />
        ))}
      </View>
      <View style={styles.legendRow}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: segment.color }]} />
            <Text style={[type.footnote, { color: native.secondaryLabel }]}>
              {segment.label} {segment.count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  track: {
    height: 16,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
  },
  segment: { height: "100%", minWidth: 6 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 18,
    minHeight: 72,
    justifyContent: "center",
  },
})
