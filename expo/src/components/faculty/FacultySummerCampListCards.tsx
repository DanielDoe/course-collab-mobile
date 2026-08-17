import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { SummerCampCamper, SummerCampProgram, SummerCampRequest, SummerCampTraining } from "../../lib/instructor-api"
import { formatFacultyRelativeTime } from "../../lib/instructor-api"
import { parseAcademicCalendarDate } from "../../lib/faculty-academic-term-utils"
import { studentInitials } from "../../lib/faculty-students-utils"
import {
  FACULTY_SUMMER_CAMP_COLOR,
  facultySummerCampCamperEnrollmentStatus,
  facultySummerCampCamperThumb,
  facultySummerCampProgramThumb,
  facultySummerCampRequestThumb,
  facultySummerCampStatus,
  facultySummerCampTrackThumb,
} from "../../lib/faculty-summer-camp-theme"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

function formatDateRange(start?: string | null, end?: string | null): string | null {
  if (!start && !end) return null
  const fmt = (d: string) =>
    parseAcademicCalendarDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  return start ? `From ${fmt(start)}` : end ? `Until ${fmt(end)}` : null
}

function SignatureListCard({
  thumb,
  icon,
  thumbChildren,
  title,
  eyebrow,
  description,
  metaLine,
  status,
  onPress,
  footer,
}: {
  thumb: SolidListThumb
  icon?: keyof typeof Ionicons.glyphMap
  thumbChildren?: ReactNode
  title: string
  eyebrow?: string
  description?: string
  metaLine?: string
  status?: ReturnType<typeof facultySummerCampStatus>
  onPress?: () => void
  footer?: ReactNode
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const body = (
    <>
      <SolidListThumbTile thumb={thumb} icon={icon} size="compact">
        {thumbChildren}
      </SolidListThumbTile>

      <View style={styles.copy}>
        {eyebrow ? (
          <Text style={[type.caption, styles.eyebrow, { color: native.secondaryLabel }]} numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text style={[type.caption, styles.description, { color: native.secondaryLabel }]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {status || metaLine ? (
          <View style={styles.statusRow}>
            {status ? (
              <>
                <Ionicons
                  name={status.icon}
                  size={status.icon === "ellipse" ? 8 : 14}
                  color={status.color}
                  style={status.icon === "ellipse" ? styles.statusDot : undefined}
                />
                <Text style={[type.footnote, styles.statusText, { color: status.color }]}>{status.label}</Text>
              </>
            ) : null}
            {metaLine ? (
              <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                {status ? ` · ${metaLine}` : metaLine}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} style={styles.chevron} />
      ) : null}
    </>
  )

  return (
    <View
      style={[
        styles.card,
        tokens.cardShadow,
        { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
      ]}
    >
      {onPress ? (
        <Pressable
          style={({ pressed }) => [styles.row, { opacity: pressed ? NATIVE.pressedOpacity : 1 }]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${title}${status ? `, ${status.label}` : ""}`}
        >
          {body}
        </Pressable>
      ) : (
        <View style={styles.row}>{body}</View>
      )}
      {footer ? <View style={[styles.footer, { borderTopColor: native.separator }]}>{footer}</View> : null}
    </View>
  )
}

function DraftQuickActions({
  publishLabel,
  acting,
  onPublish,
  onEdit,
}: {
  publishLabel: string
  acting: boolean
  onPublish: () => void
  onEdit: () => void
}) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={styles.quickActions}>
      <Pressable
        style={[styles.quickBtn, { backgroundColor: FACULTY_SUMMER_CAMP_COLOR.action }]}
        disabled={acting}
        onPress={onPublish}
        accessibilityRole="button"
        accessibilityLabel={publishLabel}
      >
        <Ionicons name="cloud-upload-outline" size={16} color={FACULTY_SUMMER_CAMP_COLOR.actionInk} />
        <Text style={[type.caption, styles.quickPublishText, { color: FACULTY_SUMMER_CAMP_COLOR.actionInk }]}>
          {publishLabel}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.quickBtn, { backgroundColor: native.tertiaryGrouped }]}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit"
      >
        <Ionicons name="create-outline" size={16} color={FACULTY_SUMMER_CAMP_COLOR.link} />
        <Text style={[type.caption, styles.quickReviewText, { color: FACULTY_SUMMER_CAMP_COLOR.link }]}>Edit</Text>
      </Pressable>
    </View>
  )
}

export function FacultySummerCampProgramCard({
  camp,
  acting,
  onPress,
  onPublish,
}: {
  camp: SummerCampProgram
  acting: boolean
  onPress: () => void
  onPublish: () => void
}) {
  const dates = formatDateRange(camp.start_date, camp.end_date)
  const meta = [
    `${camp.training_count ?? 0} track${(camp.training_count ?? 0) === 1 ? "" : "s"}`,
    `${camp.enrollment_count ?? 0} enrolled`,
    dates,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <SignatureListCard
      thumb={facultySummerCampProgramThumb()}
      icon="sunny"
      title={camp.title}
      description={camp.description ?? undefined}
      metaLine={meta}
      status={facultySummerCampStatus(camp.status)}
      onPress={onPress}
      footer={
        camp.status === "draft" ? (
          <DraftQuickActions publishLabel="Publish" acting={acting} onPublish={onPublish} onEdit={onPress} />
        ) : undefined
      }
    />
  )
}

export function FacultySummerCampTrackCard({
  training,
  acting,
  onPress,
  onPublish,
}: {
  training: SummerCampTraining
  acting: boolean
  onPress: () => void
  onPublish: () => void
}) {
  return (
    <SignatureListCard
      thumb={facultySummerCampTrackThumb(training.id)}
      icon="school"
      eyebrow={training.camp_title ?? "Program"}
      title={training.title}
      description={training.description ?? undefined}
      metaLine={`${training.enrollment_count ?? 0} enrolled`}
      status={facultySummerCampStatus(training.status)}
      onPress={onPress}
      footer={
        training.status === "draft" ? (
          <DraftQuickActions
            publishLabel="Publish"
            acting={acting}
            onPublish={onPublish}
            onEdit={onPress}
          />
        ) : undefined
      }
    />
  )
}

export function FacultySummerCampCamperCard({
  camper,
  onPress,
}: {
  camper: SummerCampCamper
  onPress: () => void
}) {
  const type = useNativeType()
  const thumb = facultySummerCampCamperThumb(camper)
  const enrollmentStatus = facultySummerCampCamperEnrollmentStatus(camper.enrollments ?? 0)

  return (
    <SignatureListCard
      thumb={thumb}
      thumbChildren={
        <Text style={[type.caption, styles.initials, { color: thumb.icon }]}>{studentInitials(camper.full_name)}</Text>
      }
      title={camper.full_name}
      description={camper.email ?? undefined}
      metaLine={`ID: ${camper.student_id}`}
      status={enrollmentStatus}
      onPress={onPress}
    />
  )
}

export function FacultySummerCampRequestCard({
  request,
  acting,
  onApprove,
  onReject,
  onPress,
}: {
  request: SummerCampRequest
  acting: boolean
  onApprove: () => void
  onReject: () => void
  onPress?: () => void
}) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const isPending = request.status === "pending" || request.status === "requested"
  const meta = `${(request.request_kind ?? "request").replace(/_/g, " ")} · ${formatFacultyRelativeTime(request.created_at)}`

  return (
    <SignatureListCard
      thumb={facultySummerCampRequestThumb(request.id)}
      icon="mail-outline"
      title={request.full_name}
      description={request.email ?? request.student_id}
      metaLine={request.organization ? `${meta} · ${request.organization}` : meta}
      status={facultySummerCampStatus(isPending ? "pending" : request.status)}
      onPress={onPress}
      footer={
        isPending ? (
          <View style={styles.quickActions}>
            <Pressable
              style={[styles.quickBtn, { backgroundColor: FACULTY_SUMMER_CAMP_COLOR.action }]}
              disabled={acting}
              onPress={onApprove}
              accessibilityRole="button"
              accessibilityLabel={`Approve ${request.full_name}`}
            >
              <Ionicons name="checkmark" size={16} color={FACULTY_SUMMER_CAMP_COLOR.actionInk} />
              <Text style={[type.caption, styles.quickPublishText, { color: FACULTY_SUMMER_CAMP_COLOR.actionInk }]}>
                Approve
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.quickBtn,
                { backgroundColor: `${tokens.danger}14`, borderColor: `${tokens.danger}33`, borderWidth: StyleSheet.hairlineWidth },
              ]}
              disabled={acting}
              onPress={onReject}
              accessibilityRole="button"
              accessibilityLabel={`Reject ${request.full_name}`}
            >
              <Ionicons name="close" size={16} color={tokens.danger} />
              <Text style={[type.caption, styles.quickReviewText, { color: tokens.danger }]}>Reject</Text>
            </Pressable>
          </View>
        ) : undefined
      }
    />
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 88,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: 1,
  },
  eyebrow: {
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  title: {
    lineHeight: 20,
  },
  description: {
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
    minHeight: 16,
  },
  statusDot: {
    marginHorizontal: 2,
  },
  statusText: {
    fontWeight: "600",
  },
  chevron: {
    marginTop: 2,
    flexShrink: 0,
  },
  initials: {
    fontWeight: "700",
    fontSize: 11,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  quickPublishText: {
    fontWeight: "700",
    fontSize: 14,
  },
  quickReviewText: {
    fontWeight: "700",
    fontSize: 14,
  },
})
