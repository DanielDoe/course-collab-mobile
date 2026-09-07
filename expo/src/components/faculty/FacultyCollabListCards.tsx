import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { signatureListCardShadow, useNativeType } from "../../lib/themed-module-theme"
import type { InstructorCourse, InstructorGroup, InstructorProject } from "../../lib/instructor-api"
import {
  FACULTY_COLLAB_COLOR,
  facultyCollabGroupThumb,
  facultyCollabProjectThumb,
  facultyGroupStatusMeta,
  facultyProjectStatusMeta,
  type FacultyCollabStatusMeta,
} from "../../lib/faculty-collab-theme"
import { facultyAdminCourseThumb } from "../../lib/faculty-admin-theme"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { FacultyStatusPill } from "./faculty-shared"

function SignatureListCard({
  thumb,
  icon,
  thumbChild,
  title,
  eyebrow,
  description,
  metaLine,
  accentLine,
  status,
  onPress,
  trailing,
  footer,
  testID,
  accessibilityLabel,
}: {
  thumb: SolidListThumb
  icon?: keyof typeof Ionicons.glyphMap
  thumbChild?: ReactNode
  title: string
  eyebrow?: string
  description?: string
  metaLine?: string
  accentLine?: { text: string; color: string }
  status?: FacultyCollabStatusMeta
  onPress?: () => void
  trailing?: ReactNode
  footer?: ReactNode
  testID?: string
  accessibilityLabel?: string
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const body = (
    <>
      <SolidListThumbTile thumb={thumb} icon={icon} size="compact">
        {thumbChild}
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
        {accentLine ? (
          <Text style={[type.caption, styles.accentLine, { color: accentLine.color }]} numberOfLines={1}>
            {accentLine.text}
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

      {trailing ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.chevron} />
        ) : null)}
    </>
  )

  const cardSurface = (
    <View
      style={[
        styles.card,
        { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
      ]}
    >
      {onPress ? (
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? NATIVE.pressedOpacity : 1 }]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
          testID={testID}
        >
          <View style={styles.row}>{body}</View>
          {footer ? <View style={[styles.footer, { borderTopColor: native.separator }]}>{footer}</View> : null}
        </Pressable>
      ) : (
        <>
          <View style={styles.row}>{body}</View>
          {footer ? <View style={[styles.footer, { borderTopColor: native.separator }]}>{footer}</View> : null}
        </>
      )}
    </View>
  )

  return (
    <View style={[styles.cardOuter, signatureListCardShadow(tokens)]}>{cardSurface}</View>
  )
}

/** Shared lecture-style list row — exported for module panel tabs. */
export const FacultySignatureListCard = SignatureListCard

function PendingReviewFooter({
  acting,
  onApprove,
  onSecondary,
  secondaryLabel,
  secondaryIcon = "create-outline",
  secondaryColor,
  secondaryDestructive = false,
}: {
  acting: boolean
  onApprove: () => void
  onSecondary: () => void
  secondaryLabel: string
  secondaryIcon?: keyof typeof Ionicons.glyphMap
  secondaryColor?: string
  secondaryDestructive?: boolean
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const secondary = secondaryColor ?? (secondaryDestructive ? FACULTY_COLLAB_COLOR.danger : FACULTY_COLLAB_COLOR.link)

  return (
    <View style={styles.quickActions}>
      <Pressable
        style={[styles.quickBtn, { backgroundColor: FACULTY_COLLAB_COLOR.action }]}
        disabled={acting}
        onPress={onApprove}
        accessibilityRole="button"
        accessibilityLabel="Approve"
      >
        <Ionicons name="checkmark" size={16} color={FACULTY_COLLAB_COLOR.actionInk} />
        <Text style={[type.caption, styles.quickActionText, { color: FACULTY_COLLAB_COLOR.actionInk }]}>
          Approve
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.quickBtn,
          {
            backgroundColor: native.tertiaryGrouped,
            borderWidth: secondaryDestructive ? StyleSheet.hairlineWidth : 0,
            borderColor: secondaryDestructive ? `${FACULTY_COLLAB_COLOR.danger}44` : "transparent",
          },
        ]}
        disabled={acting}
        onPress={onSecondary}
        accessibilityRole="button"
        accessibilityLabel={secondaryLabel}
      >
        <Ionicons name={secondaryIcon} size={16} color={secondary} />
        <Text style={[type.caption, styles.quickActionText, { color: secondary }]}>{secondaryLabel}</Text>
      </Pressable>
    </View>
  )
}

export function FacultyGroupListCard({
  group,
  index,
  acting,
  onPress,
  onApprove,
  onReject,
}: {
  group: InstructorGroup
  index: number
  acting: boolean
  onPress: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const isPending =
    !group.deleted_at && (group.status === "pending" || group.status === "pending_update")
  const meta = `${group.leader_name} · ${group.member_count} member${group.member_count === 1 ? "" : "s"} · ${group.session}`

  return (
    <SignatureListCard
      thumb={facultyCollabGroupThumb(index)}
      icon="people-outline"
      title={group.name}
      description={group.pending_changes ? "Pending roster or name changes" : undefined}
      metaLine={meta}
      status={facultyGroupStatusMeta(group)}
      onPress={onPress}
      footer={
        isPending ? (
          <PendingReviewFooter
            acting={acting}
            onApprove={onApprove}
            onSecondary={onReject}
            secondaryLabel="Reject"
            secondaryIcon="close"
            secondaryDestructive
          />
        ) : undefined
      }
    />
  )
}

export function FacultyProjectListCard({
  project,
  index,
  acting,
  onPress,
  onApprove,
  onReview,
}: {
  project: InstructorProject
  index: number
  acting: boolean
  onPress: () => void
  onApprove: () => void
  onReview: () => void
}) {
  const isPending = project.status === "pending" || project.status === "pending_update"
  const meta = [
    project.group?.name ?? "Group",
    project.leader?.full_name ?? "Leader",
    project.group?.session,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <SignatureListCard
      thumb={facultyCollabProjectThumb(index)}
      icon="folder-open-outline"
      title={project.title}
      description={project.summary?.trim() || undefined}
      metaLine={meta}
      status={facultyProjectStatusMeta(project)}
      onPress={onPress}
      footer={
        isPending ? (
          <PendingReviewFooter
            acting={acting}
            onApprove={onApprove}
            onSecondary={onReview}
            secondaryLabel="Review"
          />
        ) : undefined
      }
    />
  )
}

export function FacultyCoursePickerRow({
  course,
  active,
  showSemester,
  onPress,
}: {
  course: InstructorCourse
  active: boolean
  showSemester: boolean
  onPress: () => void
}) {
  const tokens = useAppThemeTokens()
  const title = course.picker_display_title ?? course.course_title
  const description = course.picker_is_section_row
    ? course.course_title
    : course.course_code
  const meta =
    course.picker_is_section_row && course.session_code
      ? course.session_code
      : showSemester && course.semester
        ? course.semester
        : undefined

  return (
    <SignatureListCard
      thumb={facultyAdminCourseThumb(course.id)}
      icon="school-outline"
      title={title}
      description={description}
      metaLine={meta}
      status={
        active
          ? { label: "Active course", color: tokens.accent, icon: "checkmark-circle-outline" }
          : undefined
      }
      trailing={active ? <FacultyStatusPill label="Selected" tone="live" /> : undefined}
      onPress={onPress}
      testID={`faculty-course-${course.session_code ?? course.course_code}`}
      accessibilityLabel={course.session_code ?? course.course_code}
    />
  )
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 16,
  },
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
    minHeight: 72,
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
  accentLine: {
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 2,
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
    marginTop: 4,
    flexShrink: 0,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "stretch",
    width: "100%",
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
  quickActionText: {
    fontWeight: "700",
    fontSize: 14,
  },
})
