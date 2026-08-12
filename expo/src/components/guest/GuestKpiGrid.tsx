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
  completed: number
}

export function GuestKpiGrid({ total, awaitingYou, completed }: Props) {
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
      id: "done",
      label: "Completed",
      value: String(completed),
      icon: "checkmark-circle-outline",
      color: tokens.success,
    },
  ]

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View
          key={item.id}
          style={[styles.card, cardLayout, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}
        >
          <View style={styles.cardInner}>
            <View style={styles.copy}>
              <Text {...kpiLabelTextA11yProps} style={[type.caption, styles.label, { color: native.secondaryLabel }]} numberOfLines={2}>
                {item.label}
              </Text>
              <Text {...kpiMetricTextA11yProps} style={[styles.value, { color: native.label }]}>{item.value}</Text>
            </View>
            <View style={[styles.iconWrap, { backgroundColor: semanticSoft(item.color, tokens.isDark) }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    borderRadius: 16,
    padding: 12,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  iconWrap: {
    width: MODERN.metricIconSize,
    height: MODERN.metricIconSize,
    borderRadius: MODERN.metricIconRadius,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: {
    fontWeight: "600",
    lineHeight: 15,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 28,
  },
})
