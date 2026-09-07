import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { pushStudentAppHref } from "../../lib/student-app-href"
import { DashboardCard } from "./DashboardCard"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { DASHBOARD_QUICK_ACTION_THUMBS } from "../../lib/dashboard-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

export function QuickActionsPanel() {
  const router = useRouter()
  const native = useThemedNative()
  const type = useNativeType()

  const actions = [
    { id: "quizzes", label: "Quizzes", route: "/module/quizzes", icon: "clipboard-outline" as const, thumb: DASHBOARD_QUICK_ACTION_THUMBS.quizzes },
    { id: "grades", label: "Grades", route: "/module/grades", icon: "ribbon-outline" as const, thumb: DASHBOARD_QUICK_ACTION_THUMBS.grades },
    { id: "homework", label: "Homework", route: "/module/homework", icon: "book-outline" as const, thumb: DASHBOARD_QUICK_ACTION_THUMBS.homework },
    { id: "practice", label: "Practice Hub", route: "/module/practice", icon: "fitness-outline" as const, thumb: DASHBOARD_QUICK_ACTION_THUMBS.practice },
  ]

  return (
    <DashboardCard title="Quick actions" subtitle="Jump to common student tools">
      <View style={[styles.grid, { backgroundColor: native.fill }]}>
        {actions.map((action, index) => (
          <Pressable
            key={action.id}
            style={[
              styles.item,
              { backgroundColor: native.secondaryGrouped },
              index < actions.length - 1 && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
            onPress={() => pushStudentAppHref(router, action.route)}
          >
            <SolidListThumbTile thumb={action.thumb} icon={action.icon} size="compact" style={styles.iconTile} />
            <Text style={[type.bodyEmphasis, styles.label]}>{action.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
          </Pressable>
        ))}
      </View>
    </DashboardCard>
  )
}

const styles = StyleSheet.create({
  grid: {
    borderRadius: 16,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    minHeight: 44,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  label: { flex: 1 },
})
