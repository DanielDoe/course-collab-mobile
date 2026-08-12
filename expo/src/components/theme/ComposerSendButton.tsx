import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"

const DEFAULT_SIZE = 36

type Props = {
  active: boolean
  onPress: () => void
  sending?: boolean
  disabled?: boolean
  size?: number
  iconSize?: number
  iconName?: "arrow-up" | "send"
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
  /** Streaming stop control — dark fill + white square icon. */
  stop?: boolean
  stopBackground?: string
}

/** Circular send control — active fill uses the current appearance theme accent. */
export function ComposerSendButton({
  active,
  onPress,
  sending = false,
  disabled,
  size = DEFAULT_SIZE,
  iconSize = 20,
  iconName = "arrow-up",
  accessibilityLabel = "Send message",
  testID,
  style,
  stop = false,
  stopBackground,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const disabledResolved = disabled ?? (!active && !stop)
  const showAccent = (active && !sending) || stop
  const resolvedStopBg = stopBackground ?? (tokens.isDark ? "#3A3A3C" : "#1C1C1E")

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: stop ? resolvedStopBg : active && !sending ? tokens.accent : native.fill,
          opacity: pressed && showAccent ? NATIVE.pressedOpacity : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabledResolved}
      accessibilityRole="button"
      accessibilityLabel={stop ? "Stop generating" : accessibilityLabel}
      hitSlop={4}
      testID={testID}
    >
      {sending ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : stop ? (
        <View style={styles.stopIcon} />
      ) : (
        <Ionicons
          name={iconName}
          size={iconSize}
          color={active ? "#ffffff" : native.secondaryLabel}
        />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
})
