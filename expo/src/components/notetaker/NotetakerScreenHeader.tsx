import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { safeRouterBack } from "../../lib/safe-router-back"
import { useNativeType } from "../../lib/themed-module-theme"

type Props = {
  title: string
  rightSlot?: ReactNode
  /** Used when this screen is the navigation root (e.g. deep link into capture). */
  fallbackHref?: string
  /** Override default back — e.g. unsaved-changes prompt on note detail. */
  onBackPress?: () => void
}

export function NotetakerScreenHeader({
  title,
  rightSlot,
  fallbackHref = "/module/ai-notetaker",
  onBackPress,
}: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8, borderBottomColor: native.separator }]}>
      <Pressable
        onPress={onBackPress ?? (() => safeRouterBack(router, fallbackHref))}
        hitSlop={8}
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={24} color={tokens.accent} />
      </Pressable>
      <Text style={[type.navTitle, styles.title]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{rightSlot ?? <View style={styles.rightSpacer} />}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  title: {
    flex: 1,
    textAlign: "center",
  },
  right: {
    minWidth: 44,
    alignItems: "flex-end",
  },
  rightSpacer: {
    width: 24,
  },
})
