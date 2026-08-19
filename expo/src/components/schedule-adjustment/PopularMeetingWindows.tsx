import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { formatPollColumnLabel, formatTime12h } from "../../lib/schedule-adjustment/time-slots"
import type { TopMeetingWindow } from "../../lib/schedule-adjustment-api"

export function PopularMeetingWindows({
  windows,
  totalEnrolled,
  meetingDurationMinutes,
}: {
  windows: TopMeetingWindow[]
  totalEnrolled: number
  meetingDurationMinutes?: number
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  if (!windows.length) return null
  const maxAgreement = Math.max(...windows.map((w) => w.agreementPercentage), 0)

  return (
    <View style={styles.wrap}>
      <Text style={type.sectionHeader}>Popular meeting times</Text>
      <Text style={[type.caption, { color: native.secondaryLabel }]}>
        Full {meetingDurationMinutes ?? 60}-minute blocks ranked by attendance.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {windows.slice(0, 6).map((w) => {
          const intensity = maxAgreement > 0 ? w.agreementPercentage / maxAgreement : 0
          return (
            <View
              key={`${w.dayOfWeek}-${w.startTime}`}
              style={[
                styles.card,
                {
                  borderColor: tokens.border,
                  backgroundColor: `rgba(124,58,237,${0.08 + intensity * 0.22})`,
                },
              ]}
            >
              <Text style={type.bodyEmphasis}>
                {formatPollColumnLabel(w.dayOfWeek)} {formatTime12h(w.startTime)} – {formatTime12h(w.endTime)}
              </Text>
              <Text style={[type.caption, { marginTop: 4 }]}>
                {w.availableCount} of {totalEnrolled} · {w.agreementPercentage}%
              </Text>
              <Text style={[type.caption, { textTransform: "capitalize", marginTop: 2 }]}>
                {w.consensusCategory.replace(/_/g, " ")}
              </Text>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { gap: 10, paddingVertical: 4 },
  card: {
    width: 220,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
  },
})
