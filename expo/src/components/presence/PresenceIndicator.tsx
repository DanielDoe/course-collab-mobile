import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { PRESENCE_COLORS } from "../../lib/presence/constants"
import type { PresenceStatus } from "../../lib/presence/types"
import { presenceLabel } from "./presence-label"

type Props = {
  status: PresenceStatus
  size?: "sm" | "md" | "lg"
  style?: StyleProp<ViewStyle>
  showLabel?: boolean
}

export function PresenceIndicator({ status, size = "sm", style, showLabel }: Props) {
  const tokens = useAppThemeTokens()
  const dim = size === "sm" ? 12 : size === "md" ? 14 : 18
  const iconSize = size === "sm" ? 7 : size === "md" ? 8 : 10
  const color = PRESENCE_COLORS[status]
  const ringColor = tokens.isDark ? "#1c1c1e" : "#ffffff"

  return (
    <View style={[styles.row, style]}>
      <View
        style={[
          styles.dot,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            borderColor: status === "offline" ? color : ringColor,
            backgroundColor: status === "offline" ? ringColor : color,
          },
        ]}
        accessibilityLabel={presenceLabel(status)}
      >
        {status === "available" ? (
          <Ionicons name="checkmark" size={iconSize} color="#ffffff" />
        ) : null}
        {status === "dnd" ? (
          <Ionicons name="remove" size={iconSize} color="#ffffff" />
        ) : null}
        {status === "away" ? (
          <Ionicons name="time-outline" size={iconSize} color="#5c4a00" />
        ) : null}
        {status === "offline" ? (
          <Ionicons name="close" size={iconSize} color={color} />
        ) : null}
      </View>
      {showLabel ? (
        <Text style={[styles.label, { color: tokens.native.secondaryLabel }]}>{presenceLabel(status)}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  label: {
    fontSize: 12,
  },
})
