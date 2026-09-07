import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { StudentSession } from "../../lib/session"
import { rewardsApi, type StructuredTodaySession } from "../../lib/rewards-api"
import { formatTime12h } from "../../lib/schedule-adjustment/time-slots"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { ATTENDANCE_STAT_THEMES } from "../../lib/attendance-overview-theme"
import { useRewardsTheme } from "./rewards-shared"

function clock(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return formatTime12h(String(value))
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })
}

export function StructuredSessionCheckIn({
  session,
  onPress,
}: {
  session: StudentSession
  onPress?: (row: StructuredTodaySession) => void
}) {
  const theme = useRewardsTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const [row, setRow] = useState<StructuredTodaySession | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await rewardsApi.getStructuredTodaySession(session)
      setRow(data.session ?? null)
    } catch {
      setRow(null)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }

  if (!row) return null

  const accent = ATTENDANCE_STAT_THEMES.attended
  const checkedIn = Boolean(row.my_status)

  return (
    <Pressable
      onPress={() => onPress?.(row)}
      style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: `${accent.fill}55` }]}
    >
      <View style={styles.headerRow}>
        <Text style={[type.caption, { color: accent.labelInk, fontWeight: "700", flex: 1 }]}>
          Today&apos;s session
        </Text>
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
      </View>
      <Text style={[type.bodyEmphasis, { color: native.label, marginTop: 4 }]}>
        {row.section ?? row.class_title ?? "Structured CourseCollab Session"}
      </Text>
      <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 2 }]}>
        {clock(row.start_time)} to {clock(row.end_time)}
      </Text>
      <Text style={[type.caption, { color: checkedIn ? accent.labelInk : theme.primaryDark, marginTop: 8, fontWeight: "600" }]}>
        {checkedIn ? `Checked in · ${String(row.my_status)}` : "Tap for check-in options"}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
})
