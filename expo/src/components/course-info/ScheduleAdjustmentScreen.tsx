import { useCallback, useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { scheduleAdjustmentApi, type ScheduleAdjustmentRequest } from "../../lib/schedule-adjustment-api"
import { formatStatusLabel } from "../../lib/schedule-adjustment/time-slots"
import { ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { EmptyBlock } from "../rewards/rewards-shared"
import { StatusBadge, statusTone } from "./course-info-shared"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useModulePageLayout } from "../../lib/responsive-layout"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { ScheduleAdjustmentNoticeBanner } from "../schedule-adjustment/ScheduleAdjustmentNoticeBanner"
import { NATIVE } from "../../constants/faculty-native-theme"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function RequestRow({
  item,
  onPress,
  last,
  compact,
}: {
  item: ScheduleAdjustmentRequest
  onPress: () => void
  last?: boolean
  compact?: boolean
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const sectionMeta = `${item.section_code ?? "Course"} · ${item.meeting_type}`

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        compact && styles.rowCompact,
        { borderBottomColor: native.separator },
        last && styles.rowLast,
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.reason}. ${sectionMeta}. ${formatStatusLabel(item.status)}`}
    >
      <View style={styles.rowBody}>
        <Text style={[type.bodyEmphasis, styles.rowTitle]} numberOfLines={3}>
          {item.reason}
        </Text>
        <Text style={[type.caption, styles.rowMetaText]} numberOfLines={1}>
          {sectionMeta}
        </Text>
        <View style={styles.rowBadge}>
          <StatusBadge label={formatStatusLabel(item.status)} tone={statusTone(item.status)} />
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={native.tertiaryLabel}
        style={styles.rowChevron}
      />
    </Pressable>
  )
}

export function ScheduleAdjustmentScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const pageLayout = useModulePageLayout()
  const [requests, setRequests] = useState<ScheduleAdjustmentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await scheduleAdjustmentApi.list(session)
      setRequests(data.requests ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load schedule adjustments.")
    }
  }, [session])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh(["schedule-adjustment", "calendar"], onRefresh)

  return (
    <ModuleScreen
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      error={error}
    >
      <ScheduleAdjustmentNoticeBanner />
      {requests.length === 0 ? (
        <EmptyBlock
          icon="calendar-outline"
          title="No active requests"
          body="Your instructor will notify you when a schedule adjustment needs your input."
        />
      ) : (
        <ModuleSection>
          {requests.map((item, index) => (
            <RequestRow
              key={item.id}
              item={item}
              compact={pageLayout.isCompactPhone}
              last={index === requests.length - 1}
              onPress={() => router.push(`/schedule-adjustment/${item.id}` as never)}
            />
          ))}
        </ModuleSection>
      )}
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowCompact: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowBody: { flex: 1, gap: 6, minWidth: 0 },
  rowTitle: { lineHeight: 20 },
  rowMetaText: { minWidth: 0 },
  rowBadge: { alignSelf: "flex-start", marginTop: 2 },
  rowChevron: { flexShrink: 0 },
})
