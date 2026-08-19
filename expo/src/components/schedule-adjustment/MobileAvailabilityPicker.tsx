import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  formatPollColumnLabel,
  formatTime12h,
  slotKey,
  type AvailabilitySlotState,
} from "../../lib/schedule-adjustment/time-slots"
import type { SlotHeatmapCell } from "../../lib/schedule-adjustment-api"
import { PopularMeetingWindows } from "./PopularMeetingWindows"
import type { TopMeetingWindow } from "../../lib/schedule-adjustment-api"

type Props = {
  candidateDays: string[]
  timeSlots: string[]
  mode: "binary" | "ternary"
  value: Record<string, AvailabilitySlotState>
  onChange: (next: Record<string, AvailabilitySlotState>) => void
  readOnly?: boolean
  slotHeatmap?: Record<string, SlotHeatmapCell> | null
  totalEnrolled?: number
  topWindows?: TopMeetingWindow[] | null
  meetingDurationMinutes?: number
  showPeerInsights?: boolean
}

function peerFreeCount(cell?: SlotHeatmapCell | null) {
  if (!cell) return 0
  return (cell.available ?? 0) + (cell.preferred ?? 0)
}

export function MobileAvailabilityPicker({
  candidateDays,
  timeSlots,
  mode,
  value,
  onChange,
  readOnly,
  slotHeatmap,
  totalEnrolled = 0,
  topWindows,
  meetingDurationMinutes,
  showPeerInsights = true,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const [activeDay, setActiveDay] = useState(candidateDays[0] ?? "MO")
  const hasPeerData = showPeerInsights && !!slotHeatmap && totalEnrolled > 0

  const cycle = (current?: AvailabilitySlotState): AvailabilitySlotState => {
    if (mode === "ternary") {
      if (!current || current === "unavailable") return "available"
      if (current === "available") return "preferred"
      return "unavailable"
    }
    return current === "available" ? "unavailable" : "available"
  }

  const setSlot = (day: string, time: string) => {
    if (readOnly) return
    const key = slotKey(day, time)
    onChange({ ...value, [key]: cycle(value[key]) })
  }

  const cellStyle = (state?: AvailabilitySlotState, peerCount = 0) => {
    if (state === "available") return { bg: "rgba(16,185,129,0.18)", text: "#047857" }
    if (state === "preferred") return { bg: "rgba(245,158,11,0.18)", text: "#B45309" }
    if (state === "unavailable") return { bg: native.fill, text: tokens.textMuted }
    if (hasPeerData && peerCount > 0) {
      const intensity = Math.min(1, peerCount / totalEnrolled)
      return { bg: `rgba(124,58,237,${0.08 + intensity * 0.24})`, text: tokens.text }
    }
    return { bg: native.secondaryGrouped, text: tokens.textMuted }
  }

  return (
    <View style={styles.wrap}>
      {hasPeerData ? (
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          Numbers show classmates free at each slot (of {totalEnrolled} enrolled).
        </Text>
      ) : null}

      {topWindows?.length && totalEnrolled > 0 ? (
        <PopularMeetingWindows
          windows={topWindows}
          totalEnrolled={totalEnrolled}
          meetingDurationMinutes={meetingDurationMinutes}
        />
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
        {candidateDays.map((day) => {
          const selected = day === activeDay
          return (
            <Pressable
              key={day}
              disabled={readOnly}
              onPress={() => setActiveDay(day)}
              style={[
                styles.dayChip,
                {
                  backgroundColor: selected ? tokens.accent : native.secondaryGrouped,
                  borderColor: tokens.border,
                },
              ]}
            >
              <Text style={[type.caption, { color: selected ? "#fff" : native.label }]}>
                {formatPollColumnLabel(day)}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <View style={styles.slots}>
        {timeSlots.map((time) => {
          const key = slotKey(activeDay, time)
          const state = value[key]
          const peerCount = peerFreeCount(slotHeatmap?.[key])
          const colors = cellStyle(state, peerCount)
          return (
            <Pressable
              key={key}
              disabled={readOnly}
              onPress={() => setSlot(activeDay, time)}
              style={[styles.slot, { backgroundColor: colors.bg, borderColor: tokens.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyEmphasis, { color: colors.text }]}>{formatTime12h(time)}</Text>
                <Text style={[type.caption, { color: colors.text }]}>
                  {state === "preferred"
                    ? "Preferred"
                    : state === "available"
                      ? "Available"
                      : state === "unavailable"
                        ? "No"
                        : "Tap"}
                </Text>
              </View>
              {hasPeerData && peerCount > 0 ? (
                <View style={[styles.peerBadge, { backgroundColor: native.groupedBackground }]}>
                  <Text style={[type.caption, { fontWeight: "700" }]}>{peerCount}</Text>
                </View>
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  dayRow: { gap: 8, paddingBottom: 4 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  slots: { gap: 8 },
  slot: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  peerBadge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: "center",
  },
})
