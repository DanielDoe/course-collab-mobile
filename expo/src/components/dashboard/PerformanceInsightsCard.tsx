import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import type { PerformanceInsight } from "../../types/dashboard"
import { DashboardCard } from "./DashboardCard"
import { nativeType } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { DASHBOARD_INSIGHT } from "../../lib/dashboard-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { solidListThumbFromAccent } from "../../lib/solid-list-thumb"

export function PerformanceInsightsCard({
  insights,
  loading,
}: {
  insights: PerformanceInsight[]
  loading: boolean
}) {
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()

  const insightStyles = {
    warning: {
      bg: DASHBOARD_INSIGHT.warning.soft(tokens.isDark),
      border: DASHBOARD_INSIGHT.warning.border(tokens.isDark),
      icon: "alert-circle-outline" as const,
      thumb: solidListThumbFromAccent(DASHBOARD_INSIGHT.warning.accent),
    },
    tip: {
      bg: DASHBOARD_INSIGHT.tip.soft(tokens.isDark),
      border: DASHBOARD_INSIGHT.tip.border(tokens.isDark),
      icon: "trending-up-outline" as const,
      thumb: solidListThumbFromAccent(DASHBOARD_INSIGHT.tip.accent),
    },
    info: {
      bg: native.fill,
      border: native.separator,
      icon: null,
      thumb: null,
    },
  } as const

  if (loading) {
    return (
      <DashboardCard title="Academic Intelligence">
        <View style={styles.loading}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard title="Academic Intelligence">
      <View style={styles.list}>
        {insights.map((insight) => {
          const style = insightStyles[insight.type]
          return (
            <Pressable
              key={insight.id}
              style={[
                styles.row,
                {
                  backgroundColor: style.bg,
                  borderColor: style.border,
                  borderWidth: insight.type === "info" ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
              onPress={() => {
                if (insight.actionRoute) router.push(insight.actionRoute as never)
              }}
              disabled={!insight.actionRoute}
            >
              {style.icon && style.thumb ? (
                <SolidListThumbTile thumb={style.thumb} icon={style.icon} size="compact" style={styles.insightIcon} />
              ) : null}
              <View style={styles.copy}>
                <Text style={[styles.body, { color: native.label }]}>{insight.message}</Text>
                {insight.actionLabel ? (
                  <Text style={[styles.action, { color: tokens.accent }]}>{insight.actionLabel}</Text>
                ) : null}
              </View>
              {insight.actionRoute ? (
                <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </DashboardCard>
  )
}

const styles = StyleSheet.create({
  loading: { alignItems: "center", paddingVertical: 24 },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  insightIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    marginTop: 1,
  },
  copy: { flex: 1, gap: 4 },
  body: { ...nativeType.secondary, lineHeight: 18 },
  action: { ...nativeType.footnote, fontWeight: "600" },
})
