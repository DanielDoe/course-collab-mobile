import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NativeSwitch } from "../NativeSwitch"
import {
  addClassScheduleToNativeCalendar,
  ensureNotificationPermission,
  getClassReminderPrefs,
  googleCalendarUrlForClass,
  nativeCalendarButtonLabel,
  outlookCalendarUrlForClass,
  saveClassReminderPrefs,
  syncClassMeetingReminders,
  CALENDAR_COLOR,
  type CalendarEvent,
  type ClassReminderPrefs,
  type ClassScheduleContext,
  type ParsedClassSchedule,
} from "../../lib/calendar"

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

const REMINDER_OPTIONS: Array<{ minutes: ClassReminderPrefs["minutesBefore"]; label: string }> = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
]

export function ClassScheduleCard({
  hasSchedule,
  scheduleText,
  location,
  meetingCount,
  schedule,
  context,
  classMeetings = [],
  onRemindersChange}: ClassScheduleCardProps) {
  const native = useThemedNative()
  const type = useNativeType()
  const googleUrl = schedule && context ? googleCalendarUrlForClass(schedule, context) : null
  const outlookUrl = schedule && context ? outlookCalendarUrlForClass(schedule, context) : null
  const [prefs, setPrefs] = useState<ClassReminderPrefs>({ enabled: true, minutesBefore: 30 })
  const [addingNative, setAddingNative] = useState(false)
  const [nativeAdded, setNativeAdded] = useState(false)
  const [reminderCount, setReminderCount] = useState(0)

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
  }, [hasSchedule, classMeetings, prefs.enabled, prefs.minutesBefore, refreshReminders])

  const toggleReminders = async (enabled: boolean) => {
    const next = { ...prefs, enabled }
    setPrefs(next)
    await saveClassReminderPrefs(next)
    if (enabled) await ensureNotificationPermission()
  }

  const setMinutesBefore = async (minutesBefore: ClassReminderPrefs["minutesBefore"]) => {
    const next = { ...prefs, minutesBefore }
    setPrefs(next)
    await saveClassReminderPrefs(next)
  }

  const handleAddToNativeCalendar = async () => {
    if (!schedule || !context) return
    setAddingNative(true)
    try {
      const result = await addClassScheduleToNativeCalendar(schedule, context)
      if (result.ok) {
        setNativeAdded(true)
        AppAlert.alert(
          result.alreadyAdded ? "Already in Calendar" : "Added to Calendar",
          result.alreadyAdded
            ? "Your recurring class schedule is already in Apple Calendar."
            : result.method === "native"
              ? Platform.OS === "ios"
                ? "Your class schedule was added to Apple Calendar with weekly repeats."
                : "Your class schedule was added to your device calendar."
              : "Open the shared calendar file and tap Add to import your weekly class schedule.",
        )
      } else {
        AppAlert.alert("Could not add schedule", result.message)
      }
    } finally {
      setAddingNative(false)
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <View style={[styles.head, { backgroundColor: CALENDAR_COLOR.scheduleHeader }]}>
        <View style={styles.headIcon}>
          <Ionicons name="school-outline" size={18} color="#ffffff" />
        </View>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>Class Schedule</Text>
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

          <View style={[styles.reminderCard, { backgroundColor: native.fill, borderColor: native.separator }]}>
            <View style={styles.reminderHead}>
              <View style={styles.reminderTitleRow}>
                <Ionicons name="notifications-outline" size={18} color={CALENDAR_COLOR.accent} />
                <Text style={[type.bodyEmphasis, styles.reminderTitle, { color: native.label }]}>Class reminders</Text>
              </View>
              <NativeSwitch
                value={prefs.enabled}
                onValueChange={(v) => void toggleReminders(v)}
              />
            </View>
            <Text style={[type.caption, styles.reminderSub]}>
              {prefs.enabled
                ? `${reminderCount} upcoming class reminder${reminderCount === 1 ? "" : "s"} scheduled`
                : "Turn on push reminders before each class"}
            </Text>
            {prefs.enabled ? (
              <View style={styles.reminderOptions}>
                {REMINDER_OPTIONS.map((opt) => {
                  const active = prefs.minutesBefore === opt.minutes
                  return (
                    <Pressable
                      key={opt.minutes}
                      style={[
                        styles.reminderChip,
                        { borderColor: native.separator, backgroundColor: native.fill },
                        active && {
                          backgroundColor: CALENDAR_COLOR.reminderActive,
                          borderColor: CALENDAR_COLOR.reminderActive,
                        },
                      ]}
                      onPress={() => void setMinutesBefore(opt.minutes)}
                    >
                      <Text
                        style={[
                          type.caption,
                          styles.reminderChipText,
                          { color: native.secondaryLabel },
                          active && styles.reminderChipTextActive,
                        ]}
                      >
                        {opt.label} before
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            {Platform.OS !== "web" ? (
              <Pressable
                style={[
                  styles.actionBtn,
                  styles.actionBtnPrimary,
                  { backgroundColor: CALENDAR_COLOR.primaryAction, borderColor: CALENDAR_COLOR.primaryAction },
                ]}
                onPress={() => void handleAddToNativeCalendar()}
                disabled={addingNative}
              >
                {addingNative ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="logo-apple" size={16} color="#ffffff" />
                )}
                <Text style={styles.actionTextPrimary}>
                  {nativeAdded ? "Added to Apple Calendar" : nativeCalendarButtonLabel()}
                </Text>
              </Pressable>
            ) : null}
            {googleUrl ? (
              <Pressable
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: CALENDAR_COLOR.secondaryActionFill,
                    borderColor: CALENDAR_COLOR.secondaryActionBorder,
                  },
                ]}
                onPress={() => void Linking.openURL(googleUrl)}
              >
                <Ionicons name="logo-google" size={16} color={CALENDAR_COLOR.secondaryActionInk} />
                <Text style={[styles.actionText, { color: CALENDAR_COLOR.secondaryActionInk }]}>Google</Text>
              </Pressable>
            ) : null}
            {outlookUrl ? (
              <Pressable
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: CALENDAR_COLOR.secondaryActionFill,
                    borderColor: CALENDAR_COLOR.secondaryActionBorder,
                  },
                ]}
                onPress={() => void Linking.openURL(outlookUrl)}
              >
                <Ionicons name="mail-outline" size={16} color={CALENDAR_COLOR.secondaryActionInk} />
                <Text style={[styles.actionText, { color: CALENDAR_COLOR.secondaryActionInk }]}>Outlook</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="school-outline" size={28} color={native.tertiaryLabel} />
          <Text style={[type.caption, styles.emptyText]}>
            Class times appear once your instructor publishes meeting days and times in the syllabus.
          </Text>
        </View>
      )}
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
    padding: 14},
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
  reminderCard: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1},
  reminderHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reminderTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reminderTitle: {},
  reminderSub: { lineHeight: 17 },
  reminderOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reminderChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  reminderChipText: { fontWeight: "600" },
  reminderChipTextActive: { color: "#ffffff" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1},
  actionBtnPrimary: {},
  actionText: { fontSize: 13, fontWeight: "700" },
  actionTextPrimary: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
  empty: { alignItems: "center", gap: 8, padding: 20 },
  emptyText: { lineHeight: 19, textAlign: "center" },
})
