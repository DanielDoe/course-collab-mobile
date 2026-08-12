import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { DashboardCard } from "../dashboard/DashboardCard"
import { SYSTEM, nativeType } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"

export function SummerQuickActionsPanel() {
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()

  const actions = [
    { id: "my-trainings", label: "My Trainings", route: "/module/my-trainings", icon: "school-outline" as const, accent: tokens.accent },
    { id: "roadmap", label: "Learning Roadmap", route: "/module/roadmap", icon: "map-outline" as const, accent: SYSTEM.teal.color },
    { id: "leaderboard", label: "Leaderboard", route: "/module/leaderboard", icon: "podium-outline" as const, accent: SYSTEM.yellow.color },
    { id: "browse-trainings", label: "Browse Trainings", route: "/module/browse-trainings", icon: "search-outline" as const, accent: SYSTEM.blue.color },
  ]

  return (
    <DashboardCard title="Quick actions" subtitle="Jump to common camp tools">
      <View style={[styles.grid, { backgroundColor: native.fill }]}>
        {actions.map((action, index) => (
          <Pressable
            key={action.id}
            style={[
              styles.item,
              { backgroundColor: native.secondaryGrouped },
              index < actions.length - 1 && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
            onPress={() => router.push(action.route as never)}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${action.accent}18` }]}>
              <Ionicons name={action.icon} size={20} color={action.accent} />
            </View>
            <Text style={[styles.label, { color: native.label }]}>{action.label}</Text>
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flex: 1, ...nativeType.bodyEmphasis },
})
