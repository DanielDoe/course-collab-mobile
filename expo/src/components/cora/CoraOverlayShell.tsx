import type { ReactNode } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"

type Props = {
  children: ReactNode
  onBack: () => void
}

/** Wraps Cora breadcrumb overlay screens with a thumb-friendly bottom back control. */
export function CoraOverlayShell({ children, onBack }: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View style={styles.root}>
      {/* The overlay covers the screen with no nav bar, and none of the tabs it
          hosts add a top inset of their own, so their first card collided with
          the status bar on taller devices. */}
      <View style={[styles.content, { paddingTop: insets.top }]}>{children}</View>
      <View
        style={[
          styles.footer,
          {
            borderTopColor: native.separator,
            backgroundColor: native.groupedBackground,
            paddingBottom: Math.max(insets.bottom, 12),
          },
          !tokens.isDark && Platform.OS === "ios" ? NATIVE.raisedShadow : null,
        ]}
      >
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: native.secondaryGrouped,
              borderColor: native.separator,
              opacity: pressed ? NATIVE.pressedOpacity : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to Cora"
        >
          <Ionicons name="chevron-back" size={20} color={SN.accent} />
          <Text style={[type.bodyEmphasis, { color: SN.accent }]}>Back to Cora</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: NATIVE.rowMinHeight,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
})
