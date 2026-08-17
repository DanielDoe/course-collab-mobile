import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { MODERN, kpiLabelTextA11yProps, kpiMetricTextA11yProps } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, semanticSoft } from "../../lib/themed-module-theme"
import { useGuestKpiCardStyle } from "../../lib/responsive-layout"

type KpiItem = {
  id: string
  label: string
  value: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
}

type Props = {
  total: number
  awaitingYou: number
  inProgress: number
  completed: number
}

export function GuestKpiGrid({ total, awaitingYou, inProgress, completed }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const cardLayout = useGuestKpiCardStyle()

  const items: KpiItem[] = [
    {
      id: "total",
      label: "Total requests",
      value: String(total),
      icon: "folder-outline",
      color: tokens.accent,
    },
    {
      id: "action",
      label: "Needs action",
      value: String(awaitingYou),
      icon: "hand-left-outline",
      color: tokens.warning,
    },
    {
      id: "progress",
      label: "In progress",
      value: String(inProgress),
      icon: "sync-outline",
      color: tokens.accent,
    },
    {
      id: "done",
      label: "Completed",
      value: String(completed),
      icon: "checkmark-circle-outline",
      color: tokens.success,
    },
  ]

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View
          key={item.id}
          style={[styles.card, cardLayout, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: semanticSoft(item.color, tokens.isDark) }]}>
            <Ionicons name={item.icon} size={18} color={item.color} />
          </View>
          <Text {...kpiMetricTextA11yProps} style={[styles.value, { color: native.label }]}>
            {item.value}
          </Text>
          <Text
            {...kpiLabelTextA11yProps}
            style={[type.caption, styles.label, { color: native.secondaryLabel }]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 6,
    minHeight: 108,
  },
  iconWrap: {
    width: MODERN.metricIconSize,
    height: MODERN.metricIconSize,
    borderRadius: MODERN.metricIconRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  label: {
    fontWeight: "600",
    lineHeight: 18,
  },
})
