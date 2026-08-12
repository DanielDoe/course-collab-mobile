import { Pressable, StyleSheet, Text, View } from "react-native"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import { formatFacultyRelativeTime, type OfficeHourRequest, type RegularOfficeHourSlot } from "../../lib/instructor-api"
import {
  FACULTY_OFFICE_HOURS_COLOR,
  facultyOfficeHoursPriorityColor,
  facultyOfficeHoursRequestStatus,
  facultyOfficeHoursRequestThumb,
  facultyOfficeHoursScheduleThumb,
} from "../../lib/faculty-office-hours-theme"
import { FacultySignatureListCard } from "./FacultyCollabListCards"

export function FacultyOfficeHoursRequestCard({
  request,
  onPress,
  onDecline,
}: {
  request: OfficeHourRequest
  onPress: () => void
  onDecline?: () => void
}) {
  const type = useNativeType()
  const status = facultyOfficeHoursRequestStatus(request.status)
  const isPending = request.status === "pending" || request.status === "requested"
  const metaParts = [
    formatFacultyRelativeTime(request.created_at),
    request.preferredDates?.length
      ? `${request.preferredDates.length} preferred time${request.preferredDates.length === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean)

  return (
    <FacultySignatureListCard
      thumb={facultyOfficeHoursRequestThumb(request.id)}
      icon="time-outline"
      title={request.topic}
      eyebrow={request.full_name + (request.student_code ? ` · ${request.student_code}` : "")}
      description={request.description ?? undefined}
      metaLine={metaParts.join(" · ")}
      status={status}
      accentLine={
        request.priority
          ? { text: `${request.priority} priority`, color: facultyOfficeHoursPriorityColor(request.priority) }
          : undefined
      }
      onPress={onPress}
      footer={
        isPending && onDecline ? (
          <View style={styles.quickActions}>
            <Pressable
              style={[styles.secondaryBtn, { borderColor: NATIVE.separator }]}
              onPress={(e) => {
                e.stopPropagation?.()
                onDecline()
              }}
            >
              <Text style={[type.caption, styles.secondaryText]}>Decline</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: FACULTY_OFFICE_HOURS_COLOR.action }]}
              onPress={(e) => {
                e.stopPropagation?.()
                onPress()
              }}
            >
              <Text style={[type.caption, styles.primaryText]}>Review</Text>
            </Pressable>
          </View>
        ) : undefined
      }
    />
  )
}

export function FacultyOfficeHoursScheduleCard({
  slot,
  onPress,
}: {
  slot: RegularOfficeHourSlot
  onPress: () => void
}) {
  const meta = [
    `${slot.startTime} – ${slot.endTime}`,
    slot.semesterLabel ? `${slot.semesterLabel} term` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <FacultySignatureListCard
      thumb={facultyOfficeHoursScheduleThumb(slot.dayOfWeek)}
      icon="calendar-outline"
      title={slot.dayName}
      metaLine={meta}
      onPress={onPress}
    />
  )
}

const styles = StyleSheet.create({
  quickActions: { flexDirection: "row", gap: 8 },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryText: { color: "#ffffff", fontWeight: "700" },
  secondaryText: { fontWeight: "600", color: NATIVE.label },
})
