import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { instructorApi } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import {
  ensureFacultyNotificationPermission,
  getFacultyCalendarPrefs,
  getScheduledFacultyClassReminderCount,
  resyncFacultyClassReminders,
  saveFacultyCalendarPrefs,
  type FacultyCalendarPrefs,
} from "../../../lib/calendar"
import { openCalendarSubscribeUrl } from "../../calendar/CalendarAlertsSheet"
import {
  FacultyAdminSection,
  FacultyAdminToggleRow,
  useAdminStyles,
} from "../faculty-admin-ui"

function SubscribeRow({
  busy,
  isLast,
  onPress,
}: {
  busy: boolean
  isLast?: boolean
  onPress: () => void
}) {
  const adminStyles = useAdminStyles()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Subscribe in Calendar"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        adminStyles.row,
        !isLast && adminStyles.rowBorder,
        pressed && adminStyles.rowPressed,
        busy && adminStyles.rowDisabled,
      ]}
    >
      <View style={adminStyles.rowCopy}>
        <Text style={adminStyles.rowLabel}>Subscribe in Calendar</Text>
        <Text style={adminStyles.rowSubtitle} numberOfLines={2}>
          Adds a live link that updates when class times change.
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={adminStyles.native.secondaryLabel} />
      )}
    </Pressable>
  )
}

export function FacultyCalendarAlertsSection() {
  const { scope } = useFacultyScope()
  const [prefs, setPrefs] = useState<FacultyCalendarPrefs>({
    enabled: true,
    calendarView: "all",
    notifyBefore: true,
    notifyAtStart: true,
  })
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getFacultyCalendarPrefs().then(setPrefs)
    void getScheduledFacultyClassReminderCount().then(setCount)
  }, [])

  const save = useCallback(
    async (next: FacultyCalendarPrefs) => {
      setPrefs(next)
      await saveFacultyCalendarPrefs(next)
      if (next.enabled) void ensureFacultyNotificationPermission()
      if (scope) {
        void instructorApi.updateCalendarFeed(scope, {
          beforeMinutes: next.notifyBefore ? 15 : 0,
          atStart: next.notifyAtStart,
        })
      }
      const result = await resyncFacultyClassReminders()
      setCount(result.scheduled)
    },
    [scope],
  )

  async function subscribe() {
    if (!scope) return
    setBusy(true)
    try {
      const feed = await instructorApi.getCalendarFeed(scope)
      await instructorApi.updateCalendarFeed(scope, {
        beforeMinutes: prefs.notifyBefore ? 15 : 0,
        atStart: prefs.notifyAtStart,
      })
      await openCalendarSubscribeUrl(feed.httpsUrl, feed.webcalUrl)
    } finally {
      setBusy(false)
    }
  }

  return (
    <FacultyAdminSection
      title="Calendar alerts"
      footer="Applies to every section you teach, not only the selected course. Saved here so it stays after a schedule change is finalized."
    >
      <FacultyAdminToggleRow
        label="App reminders"
        subtitle={
          prefs.enabled
            ? `${count} alert${count === 1 ? "" : "s"} scheduled on this device`
            : "Off on this device"
        }
        value={prefs.enabled}
        onChange={(enabled) => void save({ ...prefs, enabled })}
      />
      <FacultyAdminToggleRow
        label="15 minutes before"
        subtitle="App reminders and subscribed calendars"
        value={prefs.notifyBefore}
        onChange={(notifyBefore) => void save({ ...prefs, notifyBefore })}
      />
      <FacultyAdminToggleRow
        label="At class time"
        subtitle="App reminders and subscribed calendars"
        value={prefs.notifyAtStart}
        onChange={(notifyAtStart) => void save({ ...prefs, notifyAtStart })}
      />
      <SubscribeRow busy={busy} onPress={() => void subscribe()} />
    </FacultyAdminSection>
  )
}
