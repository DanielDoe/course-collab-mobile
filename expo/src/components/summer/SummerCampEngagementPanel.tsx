import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerDashboard } from "../../lib/summer-camp-api"
import { DashboardCard } from "../dashboard/DashboardCard"
import { SYSTEM, nativeType } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"

function Stat({
  icon,
  label,
  value,
  accent,
  native,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  accent: string
  native: ReturnType<typeof useThemedNative>
}) {
  const cardLayout = useKpiGridCardStyle("48%")
  return (
    <View style={[styles.stat, cardLayout, { backgroundColor: native.fill }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={[styles.value, { color: native.label }]}>{value}</Text>
      <Text style={[styles.label, { color: native.secondaryLabel }]}>{label}</Text>
    </View>
  )
}

export function SummerCampEngagementPanel({ data }: { data: SummerDashboard }) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const pendingCheckpoints = data.upcoming_checkpoints?.length ?? 0
  const rankLabel =
    data.leaderboard_rank != null && data.leaderboard_total
      ? `#${data.leaderboard_rank} of ${data.leaderboard_total}`
      : "Not ranked"

  return (
    <DashboardCard title="Camp activity" subtitle="Your participation at a glance">
      <View style={styles.grid}>
        <Stat
          icon="checkmark-done-outline"
          label="Modules done"
          value={String(data.modules_completed ?? 0)}
          accent={SYSTEM.teal.color}
          native={native}
        />
        <Stat
          icon="cloud-upload-outline"
          label="Pending checkpoints"
          value={String(pendingCheckpoints)}
          accent={pendingCheckpoints > 0 ? tokens.warning : SYSTEM.gray.color}
          native={native}
        />
        <Stat
          icon="flash-outline"
          label="Total XP"
          value={String(data.total_xp ?? 0)}
          accent={SYSTEM.orange.color}
          native={native}
        />
        <Stat
          icon="podium-outline"
          label="Leaderboard"
          value={rankLabel}
          accent={tokens.accent}
          native={native}
        />
      </View>
    </DashboardCard>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: {
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 16, fontWeight: "700", lineHeight: 21 },
  label: nativeType.footnote,
})
