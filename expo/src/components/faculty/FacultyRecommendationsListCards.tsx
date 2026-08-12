import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type {
  InstructorRecommendationRequest,
  RecommendationGuestAccountRequest,
} from "../../lib/instructor-api"
import {
  formatRecommendationDeadline,
  getRecommendationJourney,
  recommendationPurposeLabel,
} from "../../lib/faculty-recommendations-utils"
import {
  formatGuestAccountRelative,
  guestAccountStatusLabel,
} from "../../lib/faculty-guest-account-requests-utils"
import {
  FACULTY_RECOMMENDATIONS_COLOR,
  facultyRecommendationGuestThumb,
  facultyRecommendationJourneyColor,
  facultyRecommendationLetterThumb,
  facultyRecommendationStatusMeta,
  facultyGuestRequestStatusColor,
} from "../../lib/faculty-recommendations-theme"
import { FacultyStatusPill } from "./faculty-shared"
import { FacultySignatureListCard } from "./FacultyCollabListCards"

export function FacultyRecommendationLetterCard({
  item,
  onPress,
}: {
  item: InstructorRecommendationRequest
  onPress: () => void
}) {
  const type = useNativeType()
  const native = useThemedNative()
  const journey = getRecommendationJourney({ status: item.status })
  const status = facultyRecommendationStatusMeta(item.status)
  const journeyColor = facultyRecommendationJourneyColor(item.status)
  const thumb = facultyRecommendationLetterThumb(item.status, item.id)

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon="document-text-outline"
      title={item.student_name ?? "Student"}
      description={`${recommendationPurposeLabel(item.purpose)}${item.course_code ? ` · ${item.course_code}` : ""}`}
      metaLine={`Deadline ${formatRecommendationDeadline(item.deadline)} · ${journey.pillar}`}
      accentLine={{ text: journey.headline, color: journeyColor }}
      status={status}
      onPress={onPress}
      footer={
        <>
          {item.student_request_description ? (
            <Text
              style={[type.caption, styles.quote, { color: native.secondaryLabel, borderLeftColor: FACULTY_RECOMMENDATIONS_COLOR.link }]}
              numberOfLines={2}
            >
              {item.student_request_description}
            </Text>
          ) : null}
          <View style={styles.footerRow}>
            {item.latest_pdf_url ? <FacultyStatusPill label="PDF on file" tone="warning" /> : null}
            <Text style={[type.caption, { color: FACULTY_RECOMMENDATIONS_COLOR.link, fontWeight: "700" }]}>
              Open letter →
            </Text>
          </View>
        </>
      }
    />
  )
}

export function FacultyGuestRecommendationRequestCard({
  row,
  onPress,
}: {
  row: RecommendationGuestAccountRequest
  onPress: () => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const thumb = facultyRecommendationGuestThumb(row.id)
  const pending = String(row.status).toLowerCase() === "pending"
  const statusColor = facultyGuestRequestStatusColor(row.status)
  const nr = Number(row.rec_letter_total) || 0

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon="person-add-outline"
      title={row.full_name}
      description={row.email}
      metaLine={row.organization?.trim() || `Applied ${formatGuestAccountRelative(row.created_at)}`}
      status={{
        label: guestAccountStatusLabel(row.status),
        color: statusColor,
        icon: pending ? "time-outline" : String(row.status).toLowerCase() === "approved" ? "checkmark-circle" : "ellipse",
      }}
      trailing={<Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />}
      onPress={onPress}
      footer={
        <View style={styles.chipRow}>
          {row.matching_student_found ? (
            <FacultyStatusPill label="Profile linked" tone="neutral" />
          ) : (
            <FacultyStatusPill label="Awaiting signup" tone="warning" />
          )}
          {nr > 0 ? <FacultyStatusPill label={`${nr} letters`} tone="live" /> : null}
          <Text style={[type.caption, { color: FACULTY_RECOMMENDATIONS_COLOR.link, fontWeight: "700" }]}>
            Review request →
          </Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  quote: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    lineHeight: 18,
    fontStyle: "italic",
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
})
