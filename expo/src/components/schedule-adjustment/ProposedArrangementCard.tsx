import { StyleSheet, Text, View } from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { formatLongDate } from "../../lib/schedule-adjustment/student-calendar"
import { formatMeetingWindow, formatOriginalSchedules } from "../../lib/schedule-adjustment/arrangement"

type RequestLike = {
  original_schedules?: {
    lecture?: { scheduleText?: string }
    laboratory?: { scheduleText?: string }
  } | null
  instructor_led_day?: string | null
  instructor_led_start_time?: string | null
  instructor_led_end_time?: string | null
  structured_session_day?: string | null
  structured_session_start_time?: string | null
  structured_session_end_time?: string | null
  proposed_day?: string | null
  proposed_start_time?: string | null
  proposed_end_time?: string | null
  effective_date?: string | null
  section_code?: string | null
}

export function ProposedArrangementCard({
  request,
  title = "Proposed Revised Schedule",
}: {
  request: RequestLike
  title?: string
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const led = formatMeetingWindow({
    day: request.instructor_led_day,
    startTime: request.instructor_led_start_time,
    endTime: request.instructor_led_end_time,
  })
  const structured = formatMeetingWindow({
    day: request.structured_session_day,
    startTime: request.structured_session_start_time,
    endTime: request.structured_session_end_time,
  })
  const fallback =
    request.proposed_day && request.proposed_start_time && request.proposed_end_time
      ? formatMeetingWindow({
          day: request.proposed_day,
          startTime: request.proposed_start_time,
          endTime: request.proposed_end_time,
        })
      : "Not set"

  return (
    <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <Text style={type.bodyEmphasis}>{title}</Text>
      <View style={[styles.block, { backgroundColor: "rgba(59,130,246,0.12)" }]}>
        <Text style={type.caption}>Current Schedule</Text>
        <Text style={[type.secondary, { marginTop: 4 }]}>{formatOriginalSchedules(request.original_schedules)}</Text>
      </View>
      <View style={[styles.block, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
        <Text style={type.caption}>Instructor Led Session</Text>
        <Text style={[type.bodyEmphasis, { marginTop: 4 }]}>{led !== "Not set" ? led : fallback}</Text>
      </View>
      <View style={[styles.block, { backgroundColor: "rgba(20,184,166,0.12)" }]}>
        <Text style={type.caption}>Structured CourseCollab Session</Text>
        <Text style={[type.bodyEmphasis, { marginTop: 4 }]}>{structured}</Text>
        <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 4 }]}>
          Required course session — complete activities and attendance check-in in CourseCollab.
        </Text>
      </View>
      {request.effective_date ? (
        <Text style={[type.secondary, { marginTop: 4 }]}>
          Effective date: {formatLongDate(request.effective_date)}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  block: {
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
})
