import { useCallback, useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useSession } from "../../context/SessionProvider"
import { studentApi } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  ensureNotificationPermission,
  getClassReminderPrefs,
  saveClassReminderPrefs,
  syncClassMeetingReminders,
  CALENDAR_COLOR,
  type CalendarEvent,
  type ClassReminderPrefs,
  type ClassScheduleContext,
  type ParsedClassSchedule,
} from "../../lib/calendar"
import { CalendarAlertsSheet, openCalendarSubscribeUrl } from "../calendar/CalendarAlertsSheet"

type ClassScheduleCardProps = {
  hasSchedule: boolean
  scheduleText?: string | null
  location?: string | null
  meetingCount: number
  schedule?: ParsedClassSchedule | null
  context?: ClassScheduleContext | null
  classMeetings?: CalendarEvent[]
  onRemindersChange?: (scheduled: number) => void
}

export function ClassScheduleCard({
  hasSchedule,
  scheduleText,
  location,
  meetingCount,
  classMeetings = [],
  onRemindersChange,
}: ClassScheduleCardProps) {
  const native = useThemedNative()
  const type = useNativeType()
  const { session } = useSession()
  const studentSession = session?.portal === "student" ? (session as StudentSession) : null
  const [prefs, setPrefs] = useState<ClassReminderPrefs>({
    enabled: true,
    minutesBefore: 15,
    notifyBefore: true,
    notifyAtStart: true,
  })
  const [reminderCount, setReminderCount] = useState(0)
  const [alertsOpen, setAlertsOpen] = useState(false)

  useEffect(() => {
    void getClassReminderPrefs().then(setPrefs)
  }, [])

  const refreshReminders = useCallback(async () => {
    const result = await syncClassMeetingReminders(classMeetings)
    setReminderCount(result.scheduled)
    onRemindersChange?.(result.scheduled)
  }, [classMeetings, onRemindersChange])

  useEffect(() => {
    if (hasSchedule && classMeetings.length > 0) {
      void refreshReminders()
    }
  }, [hasSchedule, classMeetings, prefs.enabled, prefs.notifyBefore, prefs.notifyAtStart, refreshReminders])

  async function savePrefs(next: ClassReminderPrefs) {
    setPrefs(next)
    await saveClassReminderPrefs(next)
    if (studentSession) {
      void studentApi.updateCalendarFeed(studentSession, {
        beforeMinutes: next.notifyBefore ? 15 : 0,
        atStart: next.notifyAtStart,
      })
    }
    await refreshReminders()
  }

  return (
    <View style={styles.card}>
      <View style={[styles.head, { backgroundColor: CALENDAR_COLOR.accent }]}>
        <View style={styles.headIcon}>
          <Ionicons name="calendar-outline" size={18} color="#ffffff" />
        </View>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>Class schedule</Text>
          <Text style={styles.headSub}>
            {hasSchedule ? "Synced from your course syllabus" : "Publish syllabus meeting times to see classes here"}
          </Text>
        </View>
      </View>

      {hasSchedule && scheduleText ? (
        <View style={styles.body}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={CALENDAR_COLOR.infoIcon} />
            <Text style={[type.bodyEmphasis, styles.infoText]}>{scheduleText}</Text>
          </View>
          {location ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={native.secondaryLabel} />
              <Text style={[type.secondary, styles.infoMuted]}>{location}</Text>
            </View>
          ) : null}
          <Text style={[type.caption, styles.countText]}>
            {meetingCount} class meeting{meetingCount === 1 ? "" : "s"} on your calendar this term
          </Text>
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="school-outline" size={28} color={native.tertiaryLabel} />
          <Text style={[type.caption, styles.emptyText]}>
            Class times appear once your instructor publishes meeting days and times in the syllabus.
          </Text>
        </View>
      )}
      <View style={styles.alertsWrap}>
        <Pressable
          style={[styles.alertsBtn, { backgroundColor: native.fill, borderColor: native.separator }]}
          onPress={() => setAlertsOpen(true)}
        >
          <Ionicons name="notifications-outline" size={18} color={CALENDAR_COLOR.accent} />
          <Text style={[type.bodyEmphasis, { color: native.label, flex: 1 }]}>Calendar alerts</Text>
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
        </Pressable>
      </View>

      <CalendarAlertsSheet
        visible={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        enabled={prefs.enabled}
        notifyBefore={prefs.notifyBefore}
        notifyAtStart={prefs.notifyAtStart}
        scheduledCount={reminderCount}
        onToggleEnabled={(enabled) => {
          if (enabled) void ensureNotificationPermission()
          void savePrefs({ ...prefs, enabled })
        }}
        onToggleBefore={(notifyBefore) => void savePrefs({ ...prefs, notifyBefore })}
        onToggleAtStart={(notifyAtStart) => void savePrefs({ ...prefs, notifyAtStart })}
        onSubscribe={async () => {
          if (!studentSession) return
          const feed = await studentApi.getCalendarFeed(studentSession)
          await studentApi.updateCalendarFeed(studentSession, {
            beforeMinutes: prefs.notifyBefore ? 15 : 0,
            atStart: prefs.notifyAtStart,
          })
          await openCalendarSubscribeUrl(feed.httpsUrl, feed.webcalUrl)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
  },
  headIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  headText: { flex: 1, gap: 2 },
  headTitle: { fontSize: 16, fontWeight: "600", color: "#ffffff" },
  headSub: { fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.9)" },
  body: { padding: 14, gap: 10 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { flex: 1, lineHeight: 20 },
  infoMuted: { flex: 1, lineHeight: 19 },
  countText: {},
  alertsWrap: { paddingHorizontal: 14, paddingBottom: 14 },
  alertsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  empty: { alignItems: "center", gap: 8, padding: 20 },
  emptyText: { lineHeight: 19, textAlign: "center" },
})
