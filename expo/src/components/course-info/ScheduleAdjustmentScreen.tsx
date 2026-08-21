import { useCallback, useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { scheduleAdjustmentApi, type ScheduleAdjustmentRequest } from "../../lib/schedule-adjustment-api"
import { formatStatusLabel } from "../../lib/schedule-adjustment/time-slots"
import { ModuleScreen } from "../modules/ModuleScreen"
import { EmptyBlock } from "../rewards/rewards-shared"
import { InfoSectionCard, StatusBadge, statusTone, useCourseInfoTheme } from "./course-info-shared"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { COURSE_INFO_SCHEDULE_ADJUSTMENT } from "../../lib/course-info-color-theme"
import { ScheduleAdjustmentNoticeBanner } from "../schedule-adjustment/ScheduleAdjustmentNoticeBanner"
import { NATIVE } from "../../constants/faculty-native-theme"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function RequestRow({ item, onPress }: { item: ScheduleAdjustmentRequest; onPress: () => void }) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: native.separator },
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.reason}
    >
      <View style={styles.rowBody}>
        <Text style={type.bodyEmphasis}>{item.reason}</Text>
        <View style={styles.rowMeta}>
          <Text style={[type.caption, styles.rowMetaText]} numberOfLines={1}>
            {item.section_code ?? "Course"} · {item.meeting_type}
          </Text>
          <StatusBadge label={formatStatusLabel(item.status)} tone={statusTone(item.status)} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
    </Pressable>
  )
}

export function ScheduleAdjustmentScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const theme = useCourseInfoTheme()
  const type = useNativeType()
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
      contentStyle={styles.screenContent}
    >
      <ScheduleAdjustmentNoticeBanner />
      <InfoSectionCard
        title="Schedule adjustments"
        icon="calendar-outline"
        iconThumb={COURSE_INFO_SCHEDULE_ADJUSTMENT.list}
        theme={theme}
      >
        <Text style={[type.caption, styles.intro]}>
          Review availability polls and sign consent for proposed class time changes.
        </Text>
        {requests.length === 0 ? (
          <EmptyBlock
            icon="calendar-outline"
            title="No active requests"
            body="Your instructor will notify you when a schedule adjustment needs your input."
          />
        ) : (
          <View style={styles.list}>
            {requests.map((item) => (
              <RequestRow
                key={item.id}
                item={item}
                onPress={() => router.push(`/schedule-adjustment/${item.id}` as never)}
              />
            ))}
          </View>
        )}
      </InfoSectionCard>
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: Math.max(NATIVE.pagePadding, 20),
    gap: 16,
  },
  intro: { lineHeight: 18, marginBottom: 4 },
  list: { marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, gap: 8, minWidth: 0 },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  rowMetaText: { flexShrink: 1, minWidth: 0 },
})
