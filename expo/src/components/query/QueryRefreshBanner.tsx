import { Pressable, StyleSheet, Text, View } from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"

type Props = {
  visible: boolean
  message?: string
  onRetry?: () => void
}

export function QueryRefreshBanner({ visible, message = "Unable to refresh", onRetry }: Props) {
  const native = useThemedNative()
  const type = useNativeType()
  if (!visible) return null
  return (
    <View style={[styles.banner, { backgroundColor: native.secondaryGrouped }]}>
      <Text style={[type.caption, { color: native.secondaryLabel, flex: 1 }]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8} style={({ pressed }) => pressed && { opacity: NATIVE.pressedOpacity }}>
          <Text style={[type.caption, { color: native.tint }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: NATIVE.sectionRadius,
  },
})
