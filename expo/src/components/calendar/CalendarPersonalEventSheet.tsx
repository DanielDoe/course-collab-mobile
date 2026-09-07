import { useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AppAlert } from "../../lib/app-alert"
import { studentApi } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultySummerCampDatePicker } from "../faculty/FacultySummerCampDatePicker"
import { FacultySheetChrome, FacultySheetContainer } from "../faculty/faculty-collab-sheet-ui"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"

type Props = {
  visible: boolean
  session: StudentSession | null
  onClose: () => void
  onCreated: () => void
}

function startIso(date: string, time: string): string | null {
  const day = date.trim()
  if (!day) return null
  const clock = time.trim() || "09:00"
  const parsed = new Date(`${day}T${clock}:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function CalendarPersonalEventSheet({ visible, session, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("09:00")
  const [location, setLocation] = useState("")
  const [busy, setBusy] = useState(false)

  function reset() {
    setTitle("")
    setDate("")
    setTime("09:00")
    setLocation("")
  }

  async function submit() {
    if (!session) return
    const startTime = startIso(date, time)
    if (!title.trim() || !startTime) {
      AppAlert.alert("Title and date required", "Add a title and pick a date for this event.")
      return
    }
    setBusy(true)
    try {
      await studentApi.createCalendarEvent(session, {
        title: title.trim(),
        startTime,
        location: location.trim() || null,
        eventType: "event",
      })
      reset()
      onCreated()
      onClose()
    } catch (err) {
      AppAlert.alert(
        "Could not add event",
        err instanceof Error ? err.message : "Try again.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      scrollable
      accessibilityLabel="Close add event"
    >
      <FacultySheetContainer style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <FacultySheetChrome topInset={0} title="Add personal event" onClose={onClose} />
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          Saved to this course calendar. Title and date are required.
        </Text>
        <TextInput
          style={[styles.input, { color: native.label, borderColor: tokens.border, backgroundColor: native.fill }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Event title"
          placeholderTextColor={native.tertiaryLabel}
          accessibilityLabel="Event title"
        />
        <Text style={[type.caption, { color: native.secondaryLabel }]}>Date</Text>
        <FacultySummerCampDatePicker
          value={date}
          onChange={setDate}
          accessibilityLabel="Event date"
          yearPolicy="upcoming"
        />
        <TextInput
          style={[styles.input, { color: native.label, borderColor: tokens.border, backgroundColor: native.fill }]}
          value={time}
          onChangeText={setTime}
          placeholder="09:00"
          placeholderTextColor={native.tertiaryLabel}
          accessibilityLabel="Event time"
        />
        <TextInput
          style={[styles.input, { color: native.label, borderColor: tokens.border, backgroundColor: native.fill }]}
          value={location}
          onChangeText={setLocation}
          placeholder="Location (optional)"
          placeholderTextColor={native.tertiaryLabel}
          accessibilityLabel="Event location"
        />
        <View style={styles.actions}>
          <Pressable
            onPress={() => void submit()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Save personal event"
            style={[styles.save, { backgroundColor: tokens.accent, opacity: busy ? 0.7 : 1 }]}
          >
            <Text style={styles.saveText}>{busy ? "Saving…" : "Save event"}</Text>
          </Pressable>
        </View>
      </FacultySheetContainer>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 16, gap: 10 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  actions: { marginTop: 4 },
  save: {
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
})
