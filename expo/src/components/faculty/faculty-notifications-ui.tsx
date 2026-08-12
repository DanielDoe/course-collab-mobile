import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { notificationTypeStyleThemed } from "../../constants/faculty-communication-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { formatFacultyRelativeTime, type InstructorNotification } from "../../lib/instructor-api"
import { summarizeNotification } from "../../lib/notification-summary"
import { facultyNotificationThumb } from "../../lib/faculty-communication-theme"
import { FacultySignatureListCard } from "./FacultyCollabListCards"

export function NotificationCenterList({
  items,
  onOpen,
}: {
  items: InstructorNotification[]
  onOpen: (item: InstructorNotification) => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()

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
})
