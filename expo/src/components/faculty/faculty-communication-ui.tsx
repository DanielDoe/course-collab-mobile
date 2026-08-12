import type { ReactNode } from "react"
import { useMemo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { COMM_SYSTEM, IOS, NATIVE, resolveCommIconSoft } from "../../constants/faculty-communication-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyModuleTabBar } from "./faculty-module-shell"
import { AppButton } from "../theme/AppButton"
import { NativeCountBadge } from "./faculty-shared"
import { formatRelativeTime, stripHtml, type ForumThread } from "../../lib/collaboration-api"
import {
  FACULTY_COMMUNICATION_COLOR,
  FACULTY_COMM_BUTTON_RADIUS,
  facultyDiscussionThreadThumb,
  facultySupportQueueThumb,
} from "../../lib/faculty-communication-theme"
import { solidListThumbFixed } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

/**
 * Native iOS building blocks for module screens.
 * Prefer inset grouped lists, hairline separators, and title-case section headers
 * over heavy card chrome (HIG: Clarity / Deference / Lists).
 *
 * @see expo/docs/ios-native-module-design.md
 */

export function useFacultyCommunicationTheme() {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return useMemo(
    () => ({
      native,
      tokens,
      type,
      layout: {
        sectionRadius: NATIVE.sectionRadius,
        rowMinHeight: NATIVE.rowMinHeight,
        iconTileSize: NATIVE.iconTileSize,
        iconTileRadius: NATIVE.iconTileRadius,
        pagePadding: NATIVE.pagePadding,
      },
      iconSoft: (color: string, lightSoft: string) => resolveCommIconSoft(color, lightSoft, tokens.isDark),
    }),
    [native, tokens, type],
  )
}

export function CommSectionHeader({ title, trailing }: { title: string; trailing?: ReactNode }) {
  const type = useNativeType()
  return (
    <View style={styles.sectionHeader}>
      <Text style={type.sectionHeader}>{title}</Text>
      {trailing}
    </View>
  )
}

export function CommSectionFooter({ children }: { children: string }) {
  const native = useThemedNative()
  return <Text style={[styles.sectionFooter, { color: native.secondaryLabel }]}>{children}</Text>
}

function threadAuthorLabel(thread: ForumThread): string {
  return thread.is_anonymous ? "Anonymous" : thread.author_name ?? "Student"
}

function threadAuthorInitial(thread: ForumThread): string {
  const label = threadAuthorLabel(thread)
  return (label.trim()[0] ?? "S").toUpperCase()
}

/** Native thread row — initials avatar, title, preview, meta (not rainbow category tiles). */
export function CommThreadRow({
  thread,
  onPress,
  isLast,
}: {
  thread: ForumThread
  onPress: () => void
  isLast?: boolean
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const author = threadAuthorLabel(thread)
  const preview = stripHtml(thread.description ?? "").trim()
  const replies = thread.reply_count ?? 0
  const votes = (thread.upvotes ?? 0) - (thread.downvotes ?? 0)
  const thumb = facultyDiscussionThreadThumb(thread.id)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${thread.title}. ${author}. ${replies} replies`}
    >
      <View
        style={[
          styles.threadRow,
          { backgroundColor: native.secondaryGrouped },
          !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
        ]}
      >
        <SolidListThumbTile thumb={thumb} size="compact">
          <Text style={[type.caption, styles.threadAvatarText, { color: thumb.icon }]}>
            {threadAuthorInitial(thread)}
          </Text>
        </SolidListThumbTile>
        <View style={styles.threadCopy}>
          <View style={styles.threadHead}>
            <Text style={[type.bodyEmphasis, styles.threadTitle]} numberOfLines={2}>
              {thread.title}
            </Text>
            <Text style={type.footnote}>{formatRelativeTime(thread.created_at)}</Text>
          </View>
          {preview ? (
            <Text style={[type.secondary, styles.threadPreview]} numberOfLines={2}>
              {preview}
            </Text>
          ) : null}
          <View style={styles.threadMetaRow}>
            <Text style={type.footnote} numberOfLines={1}>
              {author}
            </Text>
            {votes !== 0 ? (
              <Text style={type.footnote}> · {votes > 0 ? `+${votes}` : votes} votes</Text>
            ) : null}
            <Text style={type.footnote}> · {replies} repl{replies === 1 ? "y" : "ies"}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.chevron} />
      </View>
    </Pressable>
  )
}

export function CommGroupedList({ children }: { children: ReactNode }) {
  const native = useThemedNative()
  return <View style={[styles.groupedList, { backgroundColor: native.secondaryGrouped }]}>{children}</View>
}

export function CommListRow({
  icon,
  iconColor,
  iconSoft,
  title,
  subtitle,
  meta,
  badge,
  onPress,
  showChevron = true,
  destructive,
  isLast,
  queueId,
}: {
  icon?: keyof typeof Ionicons.glyphMap
  iconColor?: string
  iconSoft?: string
  title: string
  subtitle?: string
  meta?: string
  badge?: string | number
  onPress?: () => void
  showChevron?: boolean
  destructive?: boolean
  isLast?: boolean
  queueId?: string
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const thumb = queueId
    ? facultySupportQueueThumb(queueId)
    : iconColor
      ? solidListThumbFixed(iconColor)
      : null

  const content = (
    <View
      style={[
        styles.row,
        { backgroundColor: native.secondaryGrouped },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
      ]}
    >
      {icon && thumb ? (
        <SolidListThumbTile thumb={thumb} icon={icon} size="compact" />
      ) : icon ? (
        <View
          style={[
            styles.iconTile,
            {
              backgroundColor:
                iconColor && iconSoft
                  ? resolveCommIconSoft(iconColor, iconSoft, tokens.isDark)
                  : (iconSoft ?? COMM_SYSTEM.gray.soft),
            },
          ]}
        >
          <Ionicons name={icon} size={17} color={iconColor ?? COMM_SYSTEM.gray.color} />
        </View>
      ) : null}
      <View style={styles.rowCopy}>
        <Text
          style={[type.body, destructive && { color: COMM_SYSTEM.red.color }]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.caption, styles.rowSubtitle]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? <Text style={type.detail}>{meta}</Text> : null}
      {badge != null && badge !== "" && Number(badge) !== 0 ? (
        <NativeCountBadge count={Number(badge)} variant="inline" />
      ) : null}
      {showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.chevron} />
      ) : null}
    </View>
  )

  if (!onPress) return content

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  )
}

export function CommSegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ id: T; label: string }>
}) {
  return (
    <FacultyModuleTabBar
      tabs={options}
      tab={value}
      onChange={onChange}
      scrollable={options.length > 3}
    />
  )
}

export function CommEmptyState({
  icon,
  title,
  body}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body: string
}) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: native.fill }]}>
        <Ionicons name={icon} size={32} color={native.tertiaryLabel} />
      </View>
      <Text style={[type.sheetTitle, styles.emptyTitle]}>{title}</Text>
      <Text style={[type.secondary, styles.emptyBody]}>{body}</Text>
    </View>
  )
}

export function CommTintButton({
  label,
  onPress,
  icon,
  disabled,
}: {
  label: string
  onPress: () => void
  icon?: keyof typeof Ionicons.glyphMap
  disabled?: boolean
}) {
  return (
    <AppButton
      label={label}
      onPress={onPress}
      icon={icon}
      iconPosition="left"
      variant="soft"
      size="sm"
      disabled={disabled}
      fullWidth={false}
      backgroundColor={`${FACULTY_COMMUNICATION_COLOR.link}18`}
      textColor={FACULTY_COMMUNICATION_COLOR.link}
      style={{ borderRadius: FACULTY_COMM_BUTTON_RADIUS, alignSelf: "flex-start" }}
    />
  )
}

export function CommStatusChip({
  label,
  color,
  soft}: {
  label: string
  color: string
  soft: string
}) {
  return (
    <View style={[styles.statusChip, { backgroundColor: soft }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusChipText, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 8,
    marginTop: 4},
  sectionFooter: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4},
  groupedList: {
    borderRadius: IOS.sectionRadius,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: IOS.rowMinHeight,
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 12},
  rowPressed: { opacity: 0.55 },
  iconTile: {
    width: IOS.iconTileSize,
    height: IOS.iconTileSize,
    borderRadius: IOS.iconTileRadius,
    alignItems: "center",
    justifyContent: "center"},
  rowCopy: { flex: 1, gap: 2 },
  rowSubtitle: { lineHeight: 17 },
  chevron: { marginLeft: 2 },
  segmentTrack: {
    flexDirection: "row",
    borderRadius: 9,
    padding: 2},
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 999},
  segmentBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
    elevation: 1},
  segmentTextActive: { fontWeight: "600" },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 8},
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8},
  emptyTitle: {
    letterSpacing: -0.4,
    textAlign: "center"},
  emptyBody: {
    lineHeight: 21,
    textAlign: "center"},
  tintBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10},
  tintBtnDim: { opacity: 0.4 },
  tintBtnText: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.4},
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6},
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 12, fontWeight: "600" },
  threadRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: IOS.rowMinHeight},
  threadAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1},
  threadAvatarText: { fontSize: 14 },
  threadCopy: { flex: 1, gap: 3, minWidth: 0 },
  threadHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8},
  threadTitle: {
    flex: 1,
    letterSpacing: -0.3,
    lineHeight: 21},
  threadPreview: { lineHeight: 20 },
  threadMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" }})
