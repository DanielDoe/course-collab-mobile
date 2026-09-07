import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons, type IoniconName } from "@/components/icons/AppIcon"
import { useFacultyShell } from "../../context/FacultyShellContext"
import {
  FACULTY_DASHBOARD_QUICK_ACTIONS,
  type FacultyQuickActionId,
} from "../../lib/faculty-dashboard-quick-actions"
import { FACULTY_DASHBOARD_QUICK_ACTION_THUMBS } from "../../lib/faculty-dashboard-theme"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { NativeCountBadge } from "./faculty-shared"

const ACTION_ICONS: Record<FacultyQuickActionId, IoniconName> = {
  points: "star-outline",
  issues: "alert-circle-outline",
  "office-hours": "time-outline",
  messages: "mail-outline",
  lectures: "easel-outline",
  quizzes: "clipboard-outline",
  attendance: "checkmark-circle-outline",
  calendar: "calendar-number-outline",
  announcements: "megaphone-outline",
  playground: "flash-outline",
}

const ACTION_THUMBS: Record<FacultyQuickActionId, keyof typeof FACULTY_DASHBOARD_QUICK_ACTION_THUMBS> = {
  points: "points",
  issues: "issues",
  "office-hours": "officeHours",
  messages: "messages",
  lectures: "lectures",
  quizzes: "quizzes",
  attendance: "attendance",
  calendar: "calendar",
  announcements: "announcements",
  playground: "playground",
}

export function FacultyQuickActions() {
  const { native, tokens, type } = useModuleTheme()
  const router = useRouter()
  const { badges } = useFacultyShell()
  const tileLayout = useKpiGridCardStyle("47%")

  return (
    <View style={styles.grid}>
      {FACULTY_DASHBOARD_QUICK_ACTIONS.map((action) => {
        const count = action.badgeKey ? badges[action.badgeKey] : 0
        return (
          <Pressable
            key={action.id}
            onPress={() => router.push(action.href as never)}
            accessibilityRole="button"
            accessibilityLabel={count > 0 ? `${action.label}, ${count}` : action.label}
            style={({ pressed }) => [
              styles.tile,
              tileLayout,
              tokens.cardShadow,
              { backgroundColor: native.fill, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <SolidListThumbTile
              thumb={FACULTY_DASHBOARD_QUICK_ACTION_THUMBS[ACTION_THUMBS[action.id]]}
              icon={ACTION_ICONS[action.id]}
              size="compact"
              style={styles.icon}
            />
            <Text style={[type.caption, styles.label, { color: native.label }]} numberOfLines={2}>
              {action.label}
            </Text>
            {count > 0 ? (
              <View style={styles.badge}>
                <NativeCountBadge count={count} variant="compact" />
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={14} color={native.tertiaryLabel} />
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  label: {
    flex: 1,
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 17,
  },
  badge: { flexShrink: 0 },
})
