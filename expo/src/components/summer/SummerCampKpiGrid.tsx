import { StyleSheet, Text, View } from "react-native"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerDashboard } from "../../lib/summer-camp-api"
import { MODERN, SYSTEM, kpiLabelTextA11yProps, kpiMetricTextA11yProps } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { semanticSoft } from "../../lib/themed-module-theme"

type KpiDef = {
  id: string
  label: string
  value: string
  sub?: string
  icon: keyof typeof Ionicons.glyphMap
  iconBg: string
  iconColor: string
}

function buildSummerKpis(data: SummerDashboard, accentSoft: string, accent: string, isDark: boolean): KpiDef[] {
  const soft = (color: string) => semanticSoft(color, isDark)
  const activeTrainings = data.enrollments?.length ?? 0
  const rankLabel =
    data.leaderboard_rank != null && data.leaderboard_total ? `#${data.leaderboard_rank}` : "—"
  const modulesLabel = `${data.modules_completed}/${data.progress?.[0]?.total_modules ?? "—"} modules`

  return [
    {
      id: "progress",
      label: "Camp Progress",
      value: `${data.overall_percent}%`,
      sub: modulesLabel,
      icon: "bar-chart-outline",
      iconBg: soft(SYSTEM.teal.color),
      iconColor: SYSTEM.teal.color,
    },
    {
      id: "xp",
      label: "Camp XP",
      value: String(data.total_xp ?? 0),
      sub: "Experience points",
      icon: "flash-outline",
      iconBg: soft(SYSTEM.orange.color),
      iconColor: SYSTEM.orange.color,
    },
    {
      id: "rank",
      label: "Leaderboard Rank",
      value: rankLabel,
      sub: data.leaderboard_total ? `of ${data.leaderboard_total} campers` : undefined,
      icon: "podium-outline",
      iconBg: soft(SYSTEM.yellow.color),
      iconColor: SYSTEM.yellow.color,
    },
    {
      id: "trainings",
      label: "Active Trainings",
      value: String(activeTrainings),
      sub: "Enrolled tracks",
      icon: "school-outline",
      iconBg: accentSoft,
      iconColor: accent,
    },
  ]
}

export function SummerCampKpiGrid({ data }: { data: SummerDashboard }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const cardLayout = useKpiGridCardStyle()
  const kpis = buildSummerKpis(data, tokens.accentSoft, tokens.accent, tokens.isDark)

  return (
    <View style={styles.grid}>
      {kpis.map((kpi) => (
        <View
          key={kpi.id}
          style={[styles.card, cardLayout, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}
        >
          <View style={styles.cardRow}>
            <View style={styles.copy}>
              <Text {...kpiLabelTextA11yProps} style={[styles.label, { color: native.secondaryLabel }]}>{kpi.label}</Text>
              <Text {...kpiMetricTextA11yProps} style={[styles.value, { color: native.label }]}>{kpi.value}</Text>
              {kpi.sub ? (
                <Text {...kpiLabelTextA11yProps} style={[styles.sub, { color: native.tertiaryLabel }]}>{kpi.sub}</Text>
              ) : null}
            </View>
            <View style={[styles.iconWrap, { backgroundColor: kpi.iconBg }]}>
              <Ionicons name={kpi.icon} size={18} color={kpi.iconColor} />
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    borderRadius: 16,
    padding: 14,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  iconWrap: {
    width: MODERN.metricIconSize,
    height: MODERN.metricIconSize,
    borderRadius: MODERN.metricIconRadius,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  value: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  sub: { fontSize: 11, lineHeight: 15 },
})
