import { useMemo } from "react"
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { notificationTypeStyleThemed } from "../../constants/faculty-communication-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { formatFacultyRelativeTime, type InstructorNotification } from "../../lib/instructor-api"
import { notificationActionLabel, summarizeNotification } from "../../lib/notification-summary"
import { useNativeType } from "../../lib/themed-module-theme"
import { FACULTY_COMMUNICATION_COLOR } from "../../lib/faculty-communication-theme"
import {
  FacultySheetContainer,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetHero,
  FacultySheetSection,
  useCollabSheetStyles,

} from "./faculty-collab-sheet-ui"
import { FacultyStatusPill } from "./faculty-shared"

type Props = {
  visible: boolean
  notification: InstructorNotification | null
  onClose: () => void
  onOpenRelated?: (notification: InstructorNotification) => void
}

export function FacultyNotificationDetailSheet({ visible, notification, onClose, onOpenRelated }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const styles = useMemo(() => createStyles(native, tokens, type), [native, tokens, type])

  if (!notification) return null

  const style = notificationTypeStyleThemed(notification.type, tokens.isDark)
  const summary = summarizeNotification(notification.title, notification.message, {
    type: notification.type,
    aiSummary: notification.ai_summary,
  })

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="Notification"
          onClose={onClose}
          accentColor={FACULTY_COMMUNICATION_COLOR.link}
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={notification.title}
            subtitle={[
              style.label,
              formatFacultyRelativeTime(notification.created_at),
              notification.source_name ? `From ${notification.source_name}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            icon={style.icon}
            pills={
              <>
                <FacultyStatusPill
                  label={notification.is_read ? "Read" : "Unread"}
                  tone={notification.is_read ? "neutral" : "live"}
                />
                <FacultyStatusPill label={style.label} tone="neutral" />
              </>
            }
          />

          <FacultySheetSection label="AI Summary">
            <View style={[styles.aiCard, { backgroundColor: native.tertiaryGrouped, borderColor: tokens.border }]}>
              <View style={styles.aiInner}>
                <View style={styles.aiHead}>
                  <View style={[styles.aiIconWrap, { backgroundColor: FACULTY_COMMUNICATION_COLOR.ai }]}>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={[type.caption, styles.aiLabel, { color: FACULTY_COMMUNICATION_COLOR.ai }]}>AI Summary</Text>
                </View>
                <Text style={[type.body, styles.aiText, { color: native.label }]}>{summary}</Text>
                <Text style={[type.caption, styles.aiHint, { color: native.secondaryLabel }]}>
                  Scannable overview for your notification center
                </Text>
              </View>
            </View>
          </FacultySheetSection>

          <FacultySheetSection label="Full Message">
            <View style={styles.messageCard}>
              <Text style={[type.body, styles.messageText]}>{notification.message}</Text>
            </View>
          </FacultySheetSection>

          {notification.link ? (
            <FacultySheetSection label="Actions">
              <FacultySheetActionRow
                icon="open-outline"
                label={notificationActionLabel(notification.type, notification.link)}
                subtitle="Jump to the linked course screen"
                tone="primary"
                onPress={() => onOpenRelated?.(notification)}
              />
            </FacultySheetSection>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

function createStyles(
  native: ReturnType<typeof useThemedNative>,
  tokens: ReturnType<typeof useAppThemeTokens>,
  type: ReturnType<typeof useNativeType>,
) {
  return StyleSheet.create({
    aiCard: {
      borderRadius: NATIVE.sectionRadius,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
    },
    aiInner: { padding: 14, gap: 8 },
    aiHead: { flexDirection: "row", alignItems: "center", gap: 8 },
    aiIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    aiLabel: { fontWeight: "700", letterSpacing: 0.2 },
    aiText: { lineHeight: 23 },
    aiHint: {},
    messageCard: {
      borderRadius: NATIVE.sectionRadius,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: native.separator,
      backgroundColor: native.secondaryGrouped,
    },
    messageText: { lineHeight: 23 },
  })
}
