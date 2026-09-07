import { useState } from "react"
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NativeSwitch } from "../NativeSwitch"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { CALENDAR_COLOR } from "../../lib/calendar"
import { NATIVE } from "../../constants/faculty-native-theme"

export type CalendarAlertsSheetProps = {
  visible: boolean
  onClose: () => void
  enabled: boolean
  notifyBefore: boolean
  notifyAtStart: boolean
  scheduledCount: number
  onToggleEnabled: (value: boolean) => void
  onToggleBefore: (value: boolean) => void
  onToggleAtStart: (value: boolean) => void
  onSubscribe: () => Promise<void>
}

export { openCalendarSubscribeUrl } from "../../lib/calendar/calendar-subscribe"

export function CalendarAlertsSheet({
  visible,
  onClose,
  enabled,
  notifyBefore,
  notifyAtStart,
  scheduledCount,
  onToggleEnabled,
  onToggleBefore,
  onToggleAtStart,
  onSubscribe,
}: CalendarAlertsSheetProps) {
  const native = useThemedNative()
  const type = useNativeType()
  const [busy, setBusy] = useState(false)

  async function subscribe() {
    setBusy(true)
    try {
      await onSubscribe()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: native.secondaryGrouped }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={type.sheetTitle}>Calendar alerts</Text>
          <Text style={[type.caption, styles.lead]}>
            App reminders cover every section. Subscribe to keep the same times on your phone calendar.
          </Text>

          <View style={[styles.row, { borderBottomColor: native.separator }]}>
            <View style={styles.copy}>
              <Text style={type.bodyEmphasis}>App reminders</Text>
              <Text style={type.caption}>
                {enabled
                  ? `${scheduledCount} alert${scheduledCount === 1 ? "" : "s"} scheduled`
                  : "Off on this device"}
              </Text>
            </View>
            <NativeSwitch value={enabled} onValueChange={onToggleEnabled} />
          </View>
          {enabled ? (
            <>
              <View style={[styles.row, { borderBottomColor: native.separator }]}>
                <Text style={type.body}>15 minutes before</Text>
                <NativeSwitch value={notifyBefore} onValueChange={onToggleBefore} />
              </View>
              <View style={[styles.row, { borderBottomColor: native.separator }]}>
                <Text style={type.body}>At class time</Text>
                <NativeSwitch value={notifyAtStart} onValueChange={onToggleAtStart} />
              </View>
            </>
          ) : null}

          <Pressable
            style={[styles.subscribe, { backgroundColor: CALENDAR_COLOR.accent }]}
            onPress={() => void subscribe()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="calendar-outline" size={18} color="#fff" />
            )}
            <Text style={styles.subscribeLabel}>Subscribe in Calendar</Text>
          </Pressable>
          <Text style={[type.caption, styles.hint]}>
            Adds a live calendar link. Times update when a class schedule changes.
          </Text>
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={type.bodyEmphasis}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 10,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(60,60,67,0.28)",
    marginBottom: 4,
  },
  lead: { lineHeight: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copy: { flex: 1, gap: 2 },
  subscribe: {
    marginTop: 6,
    minHeight: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  subscribeLabel: { color: "#fff", fontWeight: "700", fontSize: 15 },
  hint: { lineHeight: 17 },
  close: { alignSelf: "center", paddingVertical: 8 },
})
