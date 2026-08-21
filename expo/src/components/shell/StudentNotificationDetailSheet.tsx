import { useMemo } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NATIVE } from "../../constants/faculty-native-theme"
import { notificationTypeStyleThemed } from "../../constants/faculty-communication-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import {
  formatNotificationTime,
  type StudentNotification,
} from "../../lib/student-notifications"
import { notificationActionLabel, summarizeNotification } from "../../lib/notification-summary"
import { useNativeType } from "../../lib/themed-module-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { solidListThumbFixed } from "../../lib/solid-list-thumb"
import { notificationSheetTheme } from "../../lib/notification-sheet-theme"
import {
  FacultySheetContainer,
  FacultySheetChrome,
  useCollabSheetStyles,
  useFacultySheetSurfaces,
} from "../faculty/faculty-collab-sheet-ui"
import { NotificationDetailActions } from "./NotificationDetailActions"

type Props = {
  visible: boolean
  notification: StudentNotification | null
  relatedAvailable?: boolean
  pinned?: boolean
  archived?: boolean
  actionBusy?: boolean
  onClose: () => void
  onOpenRelated?: (notification: StudentNotification) => void
  onTogglePin?: (notification: StudentNotification) => void
  onToggleArchive?: (notification: StudentNotification) => void
  onDelete?: (notification: StudentNotification) => void
}

function messageParagraphs(message: string): string[] {
  const cleaned = message.replace(/\r\n/g, "\n").trim()
  if (!cleaned) return []
  const blocks = cleaned
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
  return blocks.length > 0 ? blocks : [cleaned]
}

export function StudentNotificationDetailSheet({
  visible,
  notification,
  relatedAvailable = true,
  pinned = false,
  archived = false,
  actionBusy = false,
  onClose,
  onOpenRelated,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const surfaces = useFacultySheetSurfaces()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const styles = useMemo(() => createStyles(), [])

  if (!notification) return null

  const typeStyle = notificationTypeStyleThemed(notification.type, tokens.isDark)
  const sheetTheme = notificationSheetTheme(tokens, typeStyle)
  const thumb = solidListThumbFixed(typeStyle.color)
  const summary = summarizeNotification(notification.title, notification.message, {
    type: notification.type,
    maxLength: 220,
  })
  const paragraphs = messageParagraphs(notification.message ?? "")
  const canOpenRelated = Boolean(notification.link && relatedAvailable && onOpenRelated)
  const showUnavailable = Boolean(notification.link && !relatedAvailable)
  const canBrowseFallback = Boolean(showUnavailable && onOpenRelated)
  const showFooterCta = canOpenRelated || canBrowseFallback
  const showManage = Boolean(onTogglePin && onToggleArchive && onDelete)
  const ctaLabel = canOpenRelated
    ? notificationActionLabel(notification.type, notification.link)
    : notification.type?.toLowerCase().includes("announcement")
      ? "Browse Announcements"
      : "Browse Related Module"

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="Notification"
          onClose={onClose}
          accentColor={sheetTheme.brand}
          pageSheet
        />

        <ScrollView
          contentContainerStyle={[
            collabSheetStyles.scroll,
            styles.scroll,
            { paddingBottom: insets.bottom + (showFooterCta ? 112 : showManage ? 36 : 28) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <SolidListThumbTile thumb={thumb} icon={typeStyle.icon} size="hero" />
            <Text style={[type.sheetTitle, styles.title, { color: native.label }]}>
              {notification.title}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.chip, { backgroundColor: sheetTheme.typeSoft }]}>
                <View style={[styles.chipDot, { backgroundColor: sheetTheme.typeColor }]} />
                <Text style={[styles.chipText, { color: sheetTheme.typeColor }]}>{typeStyle.label}</Text>
              </View>
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: notification.is_read
                      ? native.fill
                      : sheetTheme.brandSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: notification.is_read ? native.secondaryLabel : sheetTheme.brand,
                    },
                  ]}
                >
                  {notification.is_read ? "Read" : "Unread"}
                </Text>
              </View>
              {pinned ? (
                <View style={[styles.chip, { backgroundColor: sheetTheme.brandSoft }]}>
                  <Ionicons name="pin" size={12} color={sheetTheme.brand} />
                  <Text style={[styles.chipText, { color: sheetTheme.brand }]}>Pinned</Text>
                </View>
              ) : null}
              {archived ? (
                <View style={[styles.chip, { backgroundColor: sheetTheme.warningSoft }]}>
                  <Ionicons name="archive" size={12} color={sheetTheme.warning} />
                  <Text style={[styles.chipText, { color: sheetTheme.warning }]}>Archived</Text>
                </View>
              ) : null}
            </View>
            <Text style={[type.caption, { color: native.tertiaryLabel }]}>
              {formatNotificationTime(notification.created_at)}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: sheetTheme.summaryBg }]}>
            <View style={[styles.summaryStripe, { backgroundColor: sheetTheme.summaryStripe }]} />
            <View style={styles.summaryBody}>
              <View style={styles.summaryHead}>
                <Ionicons name="sparkles" size={15} color={sheetTheme.brand} />
                <Text style={[styles.summaryLabel, { color: sheetTheme.brand }]}>Quick read</Text>
              </View>
              <Text style={[type.body, styles.summaryText, { color: native.label }]}>{summary}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[type.sectionHeader, styles.sectionLabel, { color: native.secondaryLabel }]}>
              Full Message
            </Text>
            <View
              style={[
                styles.messageCard,
                {
                  backgroundColor: surfaces.cardBg,
                  borderColor: surfaces.cardBorder,
                },
              ]}
            >
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => (
                  <Text
                    key={`${index}-${paragraph.slice(0, 12)}`}
                    style={[
                      type.body,
                      styles.messageText,
                      { color: native.label },
                      index > 0 && styles.messageGap,
                    ]}
                  >
                    {paragraph}
                  </Text>
                ))
              ) : (
                <Text style={[type.secondary, { color: native.secondaryLabel }]}>
                  No additional details were included with this notification.
                </Text>
              )}
            </View>
          </View>

          {showUnavailable ? (
            <View
              style={[
                styles.noteCard,
                {
                  backgroundColor: surfaces.pressedBg,
                  borderColor: surfaces.cardBorder,
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={18} color={native.secondaryLabel} />
              <Text style={[type.secondary, styles.noteText, { color: native.secondaryLabel }]}>
                The linked course item is no longer available. You can still read this notification
                here, or browse current course announcements.
              </Text>
            </View>
          ) : null}

          {showManage ? (
            <NotificationDetailActions
              pinned={pinned}
              archived={archived}
              busy={actionBusy}
              onTogglePin={() => onTogglePin?.(notification)}
              onToggleArchive={() => onToggleArchive?.(notification)}
              onDelete={() => onDelete?.(notification)}
            />
          ) : null}
        </ScrollView>

        {showFooterCta ? (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                backgroundColor: surfaces.isGlass ? "transparent" : native.groupedBackground,
                borderTopColor: surfaces.cardBorder,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              onPress={() => onOpenRelated?.(notification)}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: sheetTheme.brand,
                  opacity: pressed ? NATIVE.pressedOpacity : 1,
                },
              ]}
            >
              <Ionicons
                name={canOpenRelated ? "arrow-forward-circle" : "list-outline"}
                size={20}
                color={sheetTheme.onBrand}
              />
              <Text style={[styles.ctaLabel, { color: sheetTheme.onBrand }]}>{ctaLabel}</Text>
            </Pressable>
          </View>
        ) : null}
      </FacultySheetContainer>
    </Modal>
  )
}

function createStyles() {
  return StyleSheet.create({
    scroll: { gap: 18 },
    hero: {
      alignItems: "center",
      gap: 10,
      paddingTop: 4,
      paddingHorizontal: 8,
    },
    title: {
      textAlign: "center",
      letterSpacing: -0.4,
      lineHeight: 28,
      paddingHorizontal: 8,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    chipDot: { width: 7, height: 7, borderRadius: 4 },
    chipText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
    summaryCard: {
      flexDirection: "row",
      overflow: "hidden",
      borderRadius: NATIVE.sectionRadius,
      minHeight: 72,
    },
    summaryStripe: { width: 4 },
    summaryBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 8 },
    summaryHead: { flexDirection: "row", alignItems: "center", gap: 6 },
    summaryLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
    summaryText: { lineHeight: 22 },
    section: { gap: 8 },
    sectionLabel: { textTransform: "none", paddingHorizontal: 2 },
    messageCard: {
      borderRadius: NATIVE.sectionRadius,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    messageText: { lineHeight: 24 },
    messageGap: { marginTop: 12 },
    noteCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: NATIVE.sectionRadius,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    noteText: { flex: 1, lineHeight: 20 },
    footer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    cta: {
      minHeight: NATIVE.buttonMinHeight,
      borderRadius: NATIVE.buttonRadius,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
    },
    ctaLabel: {
      fontSize: 17,
      fontWeight: "600",
      letterSpacing: -0.2,
    },
  })
}
