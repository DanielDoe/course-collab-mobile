import { Pressable, StyleSheet, Text, View } from "react-native"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { formatFacultyRelativeTime, type InstructorPasswordResetRequest } from "../../lib/instructor-api"
import {
  FACULTY_COMMUNICATION_COLOR,
  FACULTY_COMM_BUTTON_RADIUS,
  facultySupportResetThumb,
} from "../../lib/faculty-communication-theme"
import { studentInitials } from "../../lib/faculty-students-utils"
import { FacultySignatureListCard } from "./FacultyCollabListCards"

function resetStatusDisplay(status?: string): { label: string; tone: "warning" | "success" | "danger" | "neutral" } {
  const pending = status === "pending" || status === "requested"
  if (pending) return { label: "Pending", tone: "warning" }
  const normalized = (status ?? "").toLowerCase()
  if (normalized.includes("approve") || normalized.includes("complete")) {
    return { label: "Approved", tone: "success" }
  }
  if (normalized.includes("reject") || normalized.includes("deny")) {
    return { label: "Rejected", tone: "danger" }
  }
  if (!status) return { label: "Unknown", tone: "neutral" }
  return { label: status.replace(/_/g, " "), tone: "neutral" }
}

export function FacultySupportResetCard({
  row,
  acting,
  onApprove,
  onReject,
}: {
  row: InstructorPasswordResetRequest
  acting: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const thumb = facultySupportResetThumb(row.id)
  const pending = row.status === "pending" || row.status === "requested"
  const status = resetStatusDisplay(row.status)

  return (
    <FacultySignatureListCard
      thumb={thumb}
      thumbChild={
        <Text style={[type.caption, styles.initials, { color: thumb.icon }]}>
          {(row.full_name?.[0] ?? "?").toUpperCase()}
        </Text>
      }
      title={row.full_name}
      description={[row.section, row.student_number].filter(Boolean).join(" · ") || undefined}
      metaLine={row.requested_at ? formatFacultyRelativeTime(row.requested_at) : undefined}
      status={{
        label: status.label,
        color: status.tone === "success" ? FACULTY_COMMUNICATION_COLOR.success : status.tone === "danger" ? FACULTY_COMMUNICATION_COLOR.danger : status.tone === "warning" ? FACULTY_COMMUNICATION_COLOR.action : native.secondaryLabel,
        icon: status.tone === "success" ? "checkmark-circle-outline" : status.tone === "danger" ? "close-circle-outline" : status.tone === "warning" ? "time-outline" : "ellipse",
      }}
      footer={
        pending ? (
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { borderColor: native.separator, opacity: pressed || acting ? 0.75 : 1 },
              ]}
              onPress={onReject}
              disabled={acting}
            >
              <Text style={[type.caption, styles.rejectText, { color: FACULTY_COMMUNICATION_COLOR.danger }]}>
                {acting ? "…" : "Reject"}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.approveBtn,
                { opacity: pressed || acting ? 0.85 : 1 },
              ]}
              onPress={onApprove}
              disabled={acting}
            >
              <Text style={styles.approveText}>{acting ? "…" : "Approve"}</Text>
            </Pressable>
          </View>
        ) : undefined
      }
    />
  )
}

const styles = StyleSheet.create({
  initials: { fontWeight: "700" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: FACULTY_COMM_BUTTON_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  approveBtn: {
    backgroundColor: FACULTY_COMMUNICATION_COLOR.action,
    borderColor: FACULTY_COMMUNICATION_COLOR.action,
  },
  approveText: { fontSize: 15, fontWeight: "600", color: FACULTY_COMMUNICATION_COLOR.actionInk },
  rejectText: { fontWeight: "600" },
})
