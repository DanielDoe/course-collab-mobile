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
  subtitle?: string
  fallbackHref?: string
  rightSlot?: ReactNode
  onBackPress?: () => void
  /** When true, back chevron triggers `onBlockedBack` instead of navigating away. */
  backDisabled?: boolean
  onBlockedBack?: () => void
}

/** Immersive collaboration flow header — back chevron + title, respects safe area. */
export function CollabFlowHeader({
  title,
  subtitle,
  fallbackHref = "/module/playground",
  rightSlot,
  onBackPress,
  backDisabled = false,
  onBlockedBack,
}: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  const handleBack = () => {
    if (backDisabled) {
      onBlockedBack?.()
      return
    }
    if (onBackPress) onBackPress()
    else safeRouterBack(router, fallbackHref)
  }

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8, borderBottomColor: native.separator }]}>
      <Pressable
        onPress={handleBack}
        hitSlop={8}
        accessibilityLabel={backDisabled ? "Back unavailable" : "Back"}
      >
        <Ionicons
          name={backDisabled ? "lock-closed-outline" : "chevron-back"}
          size={backDisabled ? 20 : 24}
          color={backDisabled ? native.tertiaryLabel : tokens.accent}
        />
      </Pressable>
      <View style={styles.titleBlock}>
        <Text style={[type.navTitle, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.caption, styles.subtitle, { color: native.secondaryLabel }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{rightSlot ?? <View style={styles.rightSpacer} />}</View>
    </View>
  )
}

/** @deprecated Prefer CollabFlowHeader on immersive collaboration sub-screens. */
export function CollabScreenTitle({ title, subtitle }: { title?: string; subtitle?: string }) {
  const tokens = useAppThemeTokens()

  if (!title && !subtitle) return null

  return (
    <View style={styles.legacyWrap}>
      {title ? (
        <Text style={[styles.legacyTitle, { color: tokens.accentDark }]}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={[styles.legacySubtitle, { color: tokens.textSecondary }]}>{subtitle}</Text>
      ) : null}
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
  titleBlock: {
    flex: 1,
    alignItems: "center",
    gap: 1,
    minWidth: 0,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  right: {
    minWidth: 44,
    alignItems: "flex-end",
  },
  rightSpacer: {
    width: 24,
  },
  legacyWrap: { gap: 2, paddingBottom: 4 },
  legacyTitle: { fontSize: 20, fontWeight: "600" },
  legacySubtitle: { fontSize: 13 },
})
