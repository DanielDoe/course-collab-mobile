import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  buildTimedEventIcs,
  formatLongDate,
  googleCalendarUrlForTimedEvent,
  originalScheduleText,
  outlookCalendarUrlForTimedEvent,
  proposedScheduleLabel,
  resolveEventStartEnd,
} from "../../lib/schedule-adjustment/student-calendar"
import { COURSE_INFO_ACTION } from "../../lib/course-info-color-theme"

type RequestFields = {
  section_code?: string | null
  meeting_type?: string | null
  poll_kind?: string | null
  reason?: string | null
  instructor_notes?: string | null
  original_schedules?: {
    lecture?: { scheduleText?: string }
    laboratory?: { scheduleText?: string }
  } | null
  proposed_day?: string | null
  proposed_date?: string | null
  proposed_start_time?: string | null
  proposed_end_time?: string | null
  effective_date?: string | null
  missed_class_date?: string | null
  location?: string | null
  building?: string | null
  room?: string | null
  status?: string | null
}

function locationText(request: RequestFields) {
  return [request.location, [request.building, request.room].filter(Boolean).join(" ")]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)[0] || "See course syllabus"
}

export function StudentScheduleChangeCard({
  request: raw,
  consentStatus,
}: {
  request: Record<string, unknown>
  consentStatus?: string
}) {
  const request = raw as RequestFields
  const native = useThemedNative()
  const type = useNativeType()
  const isMakeup = request.poll_kind === "one_off"
  const previous = originalScheduleText(request.original_schedules, request.meeting_type ?? undefined)
  const nextLabel = proposedScheduleLabel({
    day: request.proposed_day,
    start: request.proposed_start_time,
    end: request.proposed_end_time,
  })
  const location = locationText(request)
  const eventRange = resolveEventStartEnd({
    day: request.proposed_day,
    date: request.proposed_date,
    start: request.proposed_start_time,
    end: request.proposed_end_time,
    effectiveDate: request.effective_date,
  })
  const courseTitle = `${request.section_code || "Course"} ${request.meeting_type || "meeting"}`.trim()

  const openCalendar = async (target: "google" | "outlook" | "ics") => {
    if (!eventRange) return
    const payload = {
      title: `${courseTitle} — ${isMakeup ? "Makeup" : "Updated meeting"}`,
      start: eventRange.start,
      end: eventRange.end,
      description: String(request.reason ?? "Schedule adjustment"),
      location,
    }
    if (target === "google") {
      void Linking.openURL(googleCalendarUrlForTimedEvent(payload))
      return
    }
    if (target === "outlook") {
      void Linking.openURL(outlookCalendarUrlForTimedEvent(payload))
      return
    }
    await Share.share({ message: buildTimedEventIcs(payload), title: `${courseTitle}.ics` })
  }

  return (
    <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <Text style={type.sectionHeader}>Current class schedule</Text>
      <Text style={[type.caption, { color: native.secondaryLabel, marginBottom: 8 }]}>
        {isMakeup ? "This updates the one missed meeting." : "This updates the regular weekly meeting time."}
      </Text>

      <View style={styles.compare}>
        <View style={[styles.block, { backgroundColor: "rgba(59,130,246,0.12)" }]}>
          <Text style={type.caption}>Previous meeting</Text>
          <Text style={type.bodyEmphasis}>{previous}</Text>
        </View>
        <View style={[styles.block, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
          <Text style={type.caption}>New meeting</Text>
          <Text style={type.bodyEmphasis}>{nextLabel}</Text>
          <Text style={type.caption}>Effective: {formatLongDate(request.effective_date ?? request.proposed_date)}</Text>
          <Text style={type.caption}>Location: {location}</Text>
        </View>
      </View>

      {request.reason ? (
        <Text style={[type.secondary, styles.note]}>
          <Text style={type.bodyEmphasis}>Why: </Text>
          {request.reason}
        </Text>
      ) : null}
      {request.instructor_notes ? (
        <Text style={[type.caption, styles.note]}>Instructor note: {request.instructor_notes}</Text>
      ) : null}
      {consentStatus === "agreed" ? (
        <Text style={[type.bodyEmphasis, { color: "#047857", marginTop: 8 }]}>You agreed to this change.</Text>
      ) : null}

      {eventRange ? (
        <View style={styles.calendarRow}>
          <Pressable style={[styles.calBtn, { backgroundColor: COURSE_INFO_ACTION.fill }]} onPress={() => void openCalendar("google")}>
            <Text style={[type.caption, { color: COURSE_INFO_ACTION.ink, fontWeight: "600" }]}>Google Calendar</Text>
          </Pressable>
          <Pressable style={[styles.calBtn, { borderColor: native.separator, borderWidth: StyleSheet.hairlineWidth }]} onPress={() => void openCalendar("outlook")}>
            <Text style={type.caption}>Outlook</Text>
          </Pressable>
          <Pressable style={[styles.calBtn, { borderColor: native.separator, borderWidth: StyleSheet.hairlineWidth }]} onPress={() => void openCalendar("ics")}>
            <Text style={type.caption}>Share .ics</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  compare: { gap: 10 },
  block: { borderRadius: 12, padding: 12, gap: 4 },
  note: { marginTop: 4 },
  calendarRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  calBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
})
