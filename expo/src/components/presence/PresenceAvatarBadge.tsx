import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import type { PresenceStatus } from "../../lib/presence/types"
import { PresenceIndicator } from "./PresenceIndicator"

type Props = {
  status?: PresenceStatus
  avatarSize?: number
  style?: StyleProp<ViewStyle>
}

export function PresenceAvatarBadge({ status, avatarSize = 40, style }: Props) {
  if (!status) return null

  const offset = avatarSize <= 34 ? -1 : avatarSize <= 40 ? 0 : 1
  const scale = avatarSize <= 30 ? 0.85 : 1

  return (
    <View
      style={[
        styles.badge,
        {
          bottom: offset,
          right: offset,
          transform: [{ scale }],
        },
        style,
      ]}
      pointerEvents="none"
    >
      <PresenceIndicator status={status} size="sm" />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    zIndex: 2,
  },
})
