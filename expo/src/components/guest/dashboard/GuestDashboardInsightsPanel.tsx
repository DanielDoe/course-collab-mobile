import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { DASHBOARD_INSIGHT } from "../../../lib/dashboard-theme"
import { useNativeType } from "../../../lib/themed-module-theme"
import { solidListThumbFromAccent } from "../../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../../theme/SolidListThumbTile"
import type { GuestDashboardInsight } from "../../../lib/guest-dashboard-utils"
import { nativeType } from "../../../constants/faculty-native-theme"

type Props = {
  insights: GuestDashboardInsight[]
}

export function GuestDashboardInsightsPanel({ insights }: Props) {
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()

  if (insights.length === 0) return null

  const stylesByType = {
    warning: {
      bg: DASHBOARD_INSIGHT.warning.soft(tokens.isDark),
      border: DASHBOARD_INSIGHT.warning.border(tokens.isDark),
      icon: "alert-circle-outline" as const,
      thumb: solidListThumbFromAccent(DASHBOARD_INSIGHT.warning.accent),
    },
    tip: {
      bg: DASHBOARD_INSIGHT.tip.soft(tokens.isDark),
      border: DASHBOARD_INSIGHT.tip.border(tokens.isDark),
      icon: "bulb-outline" as const,
      thumb: solidListThumbFromAccent(DASHBOARD_INSIGHT.tip.accent),
    },
    info: {
      bg: native.fill,
      border: native.separator,
      icon: "information-circle-outline" as const,
      thumb: solidListThumbFromAccent(tokens.accent),
    },
  } as const

  return (
    <View style={styles.list}>
      {insights.map((insight) => {
        const tone = stylesByType[insight.type]
        return (
          <Pressable
            key={insight.id}
            style={[
              styles.row,
              {
                backgroundColor: tone.bg,
                borderColor: tone.border,
                borderWidth: insight.type === "info" ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
            onPress={() => {
              if (insight.actionRoute) router.push(insight.actionRoute as never)
            }}
            disabled={!insight.actionRoute}
          >
            <SolidListThumbTile thumb={tone.thumb} icon={tone.icon} size="compact" style={styles.icon} />
            <View style={styles.copy}>
              <Text style={[nativeType.secondary, { color: native.label, lineHeight: 20 }]}>{insight.message}</Text>
              {insight.actionLabel ? (
                <Text style={[nativeType.footnote, { color: tokens.accent, fontWeight: "600" }]}>
                  {insight.actionLabel}
                </Text>
              ) : null}
            </View>
            {insight.actionRoute ? (
              <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  icon: { width: 30, height: 30, borderRadius: 8, marginTop: 1 },
  copy: { flex: 1, gap: 4 },
})
