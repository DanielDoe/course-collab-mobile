import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { notificationTypeStyleThemed } from "../../constants/faculty-communication-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { formatFacultyRelativeTime, type InstructorNotification } from "../../lib/instructor-api"
import { summarizeNotification } from "../../lib/notification-summary"
import { useNativeType } from "../../lib/themed-module-theme"
import { facultyNotificationThumb, FACULTY_COMMUNICATION_COLOR } from "../../lib/faculty-communication-theme"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { AppButton } from "../theme/AppButton"

export function NotificationCenterList({
  items,
  onOpen,
  pinnedIds = [],
}: {
  items: InstructorNotification[]
  onOpen: (item: InstructorNotification) => void
  pinnedIds?: number[]
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const pinned = new Set(pinnedIds)

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const style = notificationTypeStyleThemed(item.type, tokens.isDark)
        const thumb = facultyNotificationThumb(item.type)
        const preview = summarizeNotification(item.title, item.message, {
          type: item.type,
          aiSummary: item.ai_summary,
          maxLength: 120,
        })

        return (
          <FacultySignatureListCard
            key={item.id}
            thumb={thumb}
            icon={style.icon}
            title={item.title}
            description={preview}
            metaLine={formatFacultyRelativeTime(item.created_at)}
            status={{
              label: style.label,
              color: style.color,
              icon: "ellipse",
            }}
            onPress={() => onOpen(item)}
            trailing={
              <View style={styles.trailing}>
                {pinned.has(item.id) ? (
                  <Ionicons name="pin" size={14} color={tokens.accent} />
                ) : null}
                {!item.is_read ? (
                  <View style={[styles.unreadDot, { backgroundColor: tokens.accent }]} />
                ) : null}
                <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
              </View>
            }
          />
        )
      })}
    </View>
  )
}

export const NOTIFICATION_PAGE_SIZE = 8

export function NotificationListPager({
  page,
  pageCount,
  onPageChange,
}: {
  page: number
  pageCount: number
  onPageChange: (next: number) => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  if (pageCount <= 1) return null

  const canPrev = page > 0
  const canNext = page < pageCount - 1

  return (
    <View style={styles.pager}>
      <View style={styles.pagerSide}>
        <Pressable
          onPress={() => onPageChange(page - 1)}
          disabled={!canPrev}
          hitSlop={8}
          style={[styles.pagerBtn, !canPrev && styles.pagerBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Previous page"
        >
          <Ionicons name="chevron-back" size={16} color={tokens.accent} />
          <Text style={[type.caption, styles.pagerLabel, { color: tokens.accent }]}>Prev</Text>
        </Pressable>
      </View>
      <Text
        style={[type.caption, styles.pagerStatus, { color: native.secondaryLabel }]}
        numberOfLines={1}
      >
        Page {page + 1} of {pageCount}
      </Text>
      <View style={[styles.pagerSide, styles.pagerSideEnd]}>
        <Pressable
          onPress={() => onPageChange(page + 1)}
          disabled={!canNext}
          hitSlop={8}
          style={[styles.pagerBtn, styles.pagerBtnEnd, !canNext && styles.pagerBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Next page"
        >
          <Text style={[type.caption, styles.pagerLabel, { color: tokens.accent }]}>Next</Text>
          <Ionicons name="chevron-forward" size={16} color={tokens.accent} />
        </Pressable>
      </View>
    </View>
  )
}

export function NotificationInboxFooter({
  page,
  pageCount,
  onPageChange,
  showMarkAllRead,
  onMarkAllRead,
}: {
  page: number
  pageCount: number
  onPageChange: (next: number) => void
  showMarkAllRead: boolean
  onMarkAllRead: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const showPager = pageCount > 1
  if (!showPager && !showMarkAllRead) return null

  return (
    <View
      style={[
        styles.footerShell,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
        },
      ]}
    >
      {showPager ? (
        <NotificationListPager page={page} pageCount={pageCount} onPageChange={onPageChange} />
      ) : null}
      {showPager && showMarkAllRead ? (
        <View style={[styles.footerDivider, { backgroundColor: native.separator }]} />
      ) : null}
      {showMarkAllRead ? (
        <AppButton
          label="Mark All as Read"
          onPress={onMarkAllRead}
          icon="checkmark-done-outline"
          iconPosition="left"
          variant="soft"
          size="sm"
          fullWidth
          backgroundColor={`${FACULTY_COMMUNICATION_COLOR.link}18`}
          textColor={FACULTY_COMMUNICATION_COLOR.link}
          style={styles.markAllBtn}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  pagerSide: {
    flex: 1,
    minWidth: 72,
  },
  pagerSideEnd: {
    alignItems: "flex-end",
  },
  pagerStatus: {
    flexShrink: 0,
    minWidth: 96,
    textAlign: "center",
    paddingHorizontal: 8,
    fontVariant: ["tabular-nums"],
  },
  pagerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  pagerBtnEnd: {
    justifyContent: "flex-end",
  },
  pagerBtnDisabled: {
    opacity: 0.35,
  },
  pagerLabel: { fontWeight: "600" },
  footerShell: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  markAllBtn: {
    borderRadius: NATIVE.sectionRadius,
  },
})
