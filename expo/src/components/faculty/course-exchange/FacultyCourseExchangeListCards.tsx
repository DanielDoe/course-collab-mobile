import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons, type IoniconName } from "@/components/icons/AppIcon"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { signatureListCardShadow, useNativeType } from "../../../lib/themed-module-theme"
import {
  COURSE_EXCHANGE_MODULE_LABELS,
  COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES,
  type DiscoverableCourse,
  type ExchangeCopyRow,
  type ExchangeRequestDetail,
  type MyCourseSharing,
  discoverRelationshipLabel,
  exchangeRequestStatusLabel,
  exchangeRequestStatusColor,
  summarizeCloneCounts,
} from "../../../lib/course-exchange-shared"
import {
  FACULTY_COURSE_EXCHANGE_COLOR,
  facultyCourseExchangeCourseThumb,
  facultyCourseExchangeDiscoverThumb,
  facultyCourseExchangeThumb,
} from "../../../lib/faculty-course-exchange-theme"
import type { SolidListThumb } from "../../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../../theme/SolidListThumbTile"
import { FacultyStatusPill } from "../faculty-shared"
import { formatFacultyRelativeTime } from "../../../lib/instructor-api"

function statusTone(
  tone?: "success" | "warning" | "danger" | "muted",
): "success" | "warning" | "danger" | "neutral" {
  if (tone === "success") return "success"
  if (tone === "danger") return "danger"
  if (tone === "warning") return "warning"
  return "neutral"
}

export function FacultyCourseExchangeCardGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>
}

function ExchangeListCard({
  thumb,
  icon,
  title,
  eyebrow,
  description,
  metaLine,
  statusLabel: statusText,
  statusTone: tone,
  onPress,
  trailing,
  badge,
}: {
  thumb: SolidListThumb
  icon: IoniconName
  title: string
  eyebrow?: string
  description?: string
  metaLine?: string
  statusLabel?: string
  statusTone?: "success" | "warning" | "danger" | "muted"
  onPress?: () => void
  trailing?: ReactNode
  badge?: ReactNode
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const body = (
    <>
      <SolidListThumbTile thumb={thumb} icon={icon} size="compact" />
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
        {statusText ? (
          <View style={styles.statusRow}>
            <FacultyStatusPill label={statusText} tone={statusTone(tone)} />
            {metaLine ? (
              <Text style={[type.footnote, { color: native.tertiaryLabel }]}> · {metaLine}</Text>
            ) : null}
          </View>
        ) : metaLine ? (
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}>{metaLine}</Text>
        ) : null}
      </View>
      {trailing ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.chevron} />
        ) : null)}
      {badge}
    </>
  )

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
        signatureListCardShadow(tokens),
      ]}
    >
      {onPress ? (
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? NATIVE.pressedOpacity : 1 }]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          <View style={styles.row}>{body}</View>
        </Pressable>
      ) : (
        <View style={styles.row}>{body}</View>
      )}
    </View>
  )
}

function ExchangeGridCard({
  thumb,
  icon,
  title,
  eyebrow,
  description,
  metaLine,
  statusLabel,
  statusTone: tone,
  onPress,
  footer,
}: {
  thumb: SolidListThumb
  icon: IoniconName
  title: string
  eyebrow?: string
  description?: string
  metaLine?: string
  statusLabel?: string
  statusTone?: "success" | "warning" | "danger" | "muted"
  onPress: () => void
  footer?: ReactNode
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View style={styles.gridItem}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.gridCard,
          {
            backgroundColor: native.secondaryGrouped,
            borderColor: tokens.border,
            opacity: pressed ? NATIVE.pressedOpacity : 1,
          },
          signatureListCardShadow(tokens),
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={styles.gridTop}>
          <SolidListThumbTile thumb={thumb} icon={icon} size="compact" />
          {statusLabel ? <FacultyStatusPill label={statusLabel} tone={statusTone(tone)} /> : null}
        </View>
        {eyebrow ? (
          <Text style={[type.caption, styles.eyebrow, { color: native.secondaryLabel }]} numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[type.bodyEmphasis, styles.gridTitle, { color: native.label }]} numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
            {description}
          </Text>
        ) : null}
        {metaLine ? (
          <Text style={[type.caption, { color: native.tertiaryLabel }]} numberOfLines={1}>
            {metaLine}
          </Text>
        ) : null}
        {footer}
      </Pressable>
    </View>
  )
}

function discoverMeta(row: DiscoverableCourse) {
  const mods = row.shareableModules?.length ? row.shareableModules : COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES
  const rel = row.relationship
  const relLabel = rel && rel.kind !== "none" ? discoverRelationshipLabel(rel.kind) : undefined
  return {
    mods,
    rel,
    relLabel,
    title: row.discoverableTitle || row.courseTitle,
  }
}

export function FacultyCourseExchangeDiscoverCard({
  row,
  onPress,
}: {
  row: DiscoverableCourse
  onPress: () => void
}) {
  const { mods, rel, relLabel, title } = discoverMeta(row)

  return (
    <ExchangeListCard
      thumb={facultyCourseExchangeDiscoverThumb(row.courseId)}
      icon="school-outline"
      eyebrow={[row.instructorName, row.university].filter(Boolean).join(" · ")}
      title={title}
      description={`${row.courseCode}${row.semester ? ` · ${row.semester}` : ""}`}
      metaLine={`${mods.length} modules${row.autoApprove ? " · instant" : ""}${row.isOwner ? " · yours" : ""}`}
      statusLabel={row.isOwner ? "Your course" : relLabel}
      statusTone={row.isOwner ? "muted" : relLabel ? exchangeRequestStatusColor(rel?.status ?? "PENDING") : undefined}
      onPress={onPress}
    />
  )
}

export function FacultyCourseExchangeDiscoverGridCard({
  row,
  onPress,
}: {
  row: DiscoverableCourse
  onPress: () => void
}) {
  const { mods, rel, relLabel, title } = discoverMeta(row)

  return (
    <ExchangeGridCard
      thumb={facultyCourseExchangeDiscoverThumb(row.courseId)}
      icon="school-outline"
      eyebrow={row.courseCode}
      title={title}
      description={row.instructorName}
      metaLine={`${mods.length} modules${row.autoApprove ? " · instant" : ""}`}
      statusLabel={row.isOwner ? "Yours" : relLabel}
      statusTone={row.isOwner ? "muted" : relLabel ? exchangeRequestStatusColor(rel?.status ?? "PENDING") : undefined}
      onPress={onPress}
    />
  )
}

export function FacultyCourseExchangeRequestCard({
  row,
  mode,
  onPress,
}: {
  row: ExchangeRequestDetail
  mode: "received" | "sent"
  onPress: () => void
}) {
  const status = row.status.toUpperCase()
  const modules = mode === "received" ? row.requested_modules : (row.approved_modules ?? row.requested_modules)
  const moduleLine = modules.slice(0, 4).map((m) => COURSE_EXCHANGE_MODULE_LABELS[m]).join(" · ")

  return (
    <ExchangeListCard
      thumb={facultyCourseExchangeThumb(row.id)}
      icon={mode === "received" ? "mail-open-outline" : "send-outline"}
      eyebrow={mode === "received" ? row.requesterName : row.creatorName}
      title={[row.courseCode, row.courseTitle].filter(Boolean).join(" — ")}
      description={row.purpose ?? undefined}
      metaLine={row.created_at ? formatFacultyRelativeTime(row.created_at) : undefined}
      statusLabel={exchangeRequestStatusLabel(status)}
      statusTone={exchangeRequestStatusColor(status)}
      onPress={onPress}
      trailing={
        moduleLine ? (
          <Text style={{ fontSize: 11, color: "#636366", maxWidth: 72 }} numberOfLines={3}>
            {moduleLine}
          </Text>
        ) : undefined
      }
    />
  )
}

export function FacultyCourseExchangeRequestGridCard({
  row,
  mode,
  onPress,
}: {
  row: ExchangeRequestDetail
  mode: "received" | "sent"
  onPress: () => void
}) {
  const status = row.status.toUpperCase()
  return (
    <ExchangeGridCard
      thumb={facultyCourseExchangeThumb(row.id)}
      icon={mode === "received" ? "mail-open-outline" : "send-outline"}
      eyebrow={mode === "received" ? row.requesterName : row.creatorName}
      title={[row.courseCode, row.courseTitle].filter(Boolean).join(" — ")}
      description={row.purpose ?? undefined}
      metaLine={row.created_at ? formatFacultyRelativeTime(row.created_at) : undefined}
      statusLabel={exchangeRequestStatusLabel(status)}
      statusTone={exchangeRequestStatusColor(status)}
      onPress={onPress}
    />
  )
}

export function FacultyCourseExchangeCopyCard({
  copy,
  variant,
  updateCount,
  onPress,
  onUpdatePress,
}: {
  copy: ExchangeCopyRow
  variant: "shared-with-me" | "my-shared"
  updateCount?: number
  onPress?: () => void
  onUpdatePress?: () => void
}) {
  const native = useThemedNative()
  const id = Number(copy.id ?? 0)
  const title =
    variant === "shared-with-me"
      ? String(copy.destination_course_code ?? "Destination")
      : String(copy.source_course_code ?? "Source")
  const eyebrow =
    variant === "shared-with-me"
      ? `From ${String(copy.source_instructor_name ?? "creator")}`
      : `Requested by ${String(copy.requester_name ?? "instructor")}`
  const summary = summarizeCloneCounts(
    (copy.clone_summary as Record<string, unknown> | undefined) ?? null,
  )

  return (
    <ExchangeListCard
      thumb={facultyCourseExchangeThumb(id || title)}
      icon={variant === "shared-with-me" ? "book-outline" : "share-social-outline"}
      eyebrow={eyebrow}
      title={title}
      description={summary || String(copy.source_course_code ?? "")}
      onPress={onPress}
      badge={
        updateCount && updateCount > 0 ? (
          <Pressable
            onPress={onUpdatePress}
            style={[styles.updateBadge, { backgroundColor: FACULTY_COURSE_EXCHANGE_COLOR.update }]}
            accessibilityRole="button"
            accessibilityLabel={`${updateCount} updates available`}
          >
            <Text style={styles.updateBadgeText}>{updateCount}</Text>
          </Pressable>
        ) : null
      }
      trailing={
        updateCount && updateCount > 0 ? (
          <Pressable onPress={onUpdatePress} accessibilityRole="button">
            <Ionicons name="refresh-outline" size={18} color={native.tint} />
          </Pressable>
        ) : undefined
      }
    />
  )
}

export function FacultyCourseExchangeCopyGridCard({
  copy,
  variant,
  updateCount,
  onPress,
}: {
  copy: ExchangeCopyRow
  variant: "shared-with-me" | "my-shared"
  updateCount?: number
  onPress: () => void
}) {
  const id = Number(copy.id ?? 0)
  const title =
    variant === "shared-with-me"
      ? String(copy.destination_course_code ?? "Destination")
      : String(copy.source_course_code ?? "Source")
  const eyebrow =
    variant === "shared-with-me"
      ? `From ${String(copy.source_instructor_name ?? "creator")}`
      : `Requested by ${String(copy.requester_name ?? "instructor")}`
  const summary = summarizeCloneCounts(
    (copy.clone_summary as Record<string, unknown> | undefined) ?? null,
  )

  return (
    <ExchangeGridCard
      thumb={facultyCourseExchangeThumb(id || title)}
      icon={variant === "shared-with-me" ? "book-outline" : "share-social-outline"}
      eyebrow={eyebrow}
      title={title}
      description={summary || String(copy.source_course_code ?? "")}
      metaLine={updateCount && updateCount > 0 ? `${updateCount} updates` : undefined}
      statusLabel={updateCount && updateCount > 0 ? "Updates" : undefined}
      statusTone={updateCount && updateCount > 0 ? "warning" : undefined}
      onPress={onPress}
    />
  )
}

export function FacultyCourseExchangeSharingListCard({
  course,
  onPress,
}: {
  course: MyCourseSharing
  onPress: () => void
}) {
  const tokens = useAppThemeTokens()
  const isOn = course.sharingMode === "request_only"

  return (
    <ExchangeListCard
      thumb={facultyCourseExchangeCourseThumb(course.courseId)}
      icon="school-outline"
      title={course.courseTitle}
      description={course.courseCode}
      metaLine={
        isOn
          ? `${course.shareableModules.length} modules${course.autoApprove ? " · auto-approve" : ""}`
          : "Not discoverable"
      }
      statusLabel={isOn ? "Sharing" : "Off"}
      statusTone={isOn ? "success" : "muted"}
      onPress={onPress}
      trailing={
        <Text style={[styles.configureLink, { color: tokens.accent }]}>Configure</Text>
      }
    />
  )
}

export function FacultyCourseExchangeSharingGridCard({
  course,
  onPress,
}: {
  course: MyCourseSharing
  onPress: () => void
}) {
  const tokens = useAppThemeTokens()
  const isOn = course.sharingMode === "request_only"

  return (
    <ExchangeGridCard
      thumb={facultyCourseExchangeCourseThumb(course.courseId)}
      icon="school-outline"
      eyebrow={course.courseCode}
      title={course.courseTitle}
      metaLine={
        isOn
          ? `${course.shareableModules.length} modules${course.autoApprove ? " · auto-approve" : ""}`
          : "Not discoverable"
      }
      statusLabel={isOn ? "Sharing" : "Off"}
      statusTone={isOn ? "success" : "muted"}
      onPress={onPress}
      footer={
        <Text style={[styles.configureLink, { color: tokens.accent }]}>Configure</Text>
      }
    />
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  copy: { flex: 1, gap: 4, minWidth: 0 },
  eyebrow: { fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  title: { letterSpacing: -0.2 },
  description: { lineHeight: 18 },
  statusRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 2 },
  chevron: { marginTop: 14 },
  updateBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  updateBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  gridItem: {
    flexBasis: "50%",
    maxWidth: "50%",
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  gridCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
    minHeight: 168,
  },
  gridTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  gridTitle: { letterSpacing: -0.2, minHeight: 40 },
  configureLink: { fontSize: 13, fontWeight: "600", marginTop: 2 },
})
