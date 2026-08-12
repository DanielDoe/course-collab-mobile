import type { ReactNode } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import {
  helpCenterLinkThumb,
  SUPPORT_COLOR,
  SUPPORT_TIP_INFO,
  supportThemeFromTokens,
} from "../../lib/support-color-theme"
import { useNativeType, semanticSoft } from "../../lib/themed-module-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

export function useSupportTheme() {
  const tokens = useAppThemeTokens()
  return supportThemeFromTokens(tokens)
}

export function SupportBanner({
  tone,
  message,
}: {
  tone: "success" | "error"
  message: string
}) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const isSuccess = tone === "success"
  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isSuccess
            ? semanticSoft(SUPPORT_COLOR.success, tokens.isDark, 0.16)
            : semanticSoft(tokens.danger, tokens.isDark, 0.16),
        },
      ]}
    >
      <Ionicons
        name={isSuccess ? "checkmark-circle" : "alert-circle"}
        size={18}
        color={isSuccess ? SUPPORT_COLOR.success : tokens.danger}
      />
      <Text
        style={[
          type.caption,
          styles.bannerText,
          {
            color: isSuccess ? SUPPORT_COLOR.success : tokens.danger,
            fontWeight: "600",
            lineHeight: 18,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  )
}

export function SupportFieldLabel({ children }: { children: string }) {
  const type = useNativeType()
  return <Text style={type.sectionHeader}>{children}</Text>
}

export function SupportQuickLink({
  icon,
  label,
  sub,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  sub: string
  onPress: () => void
  last?: boolean
}) {
  const tokens = useAppThemeTokens()
  const native = tokens.native
  const type = useNativeType()
  const thumb = helpCenterLinkThumb(icon)

  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickLink,
        { borderBottomColor: native.separator },
        last && styles.quickLinkLast,
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      android_ripple={Platform.OS === "android" ? { color: "rgba(0,0,0,0.08)" } : undefined}
    >
      <SolidListThumbTile thumb={thumb} icon={icon} size="compact" />
      <View style={styles.quickLinkCopy}>
        <Text style={type.bodyEmphasis}>{label}</Text>
        <Text style={type.caption}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
    </Pressable>
  )
}

export function FaqItem({
  question,
  answer,
  open,
  onToggle,
  last,
}: {
  question: string
  answer: string
  open: boolean
  onToggle: () => void
  last?: boolean
}) {
  const tokens = useAppThemeTokens()
  const native = tokens.native
  const type = useNativeType()
  return (
    <View style={[styles.faqItem, { borderBottomColor: native.separator }, last && styles.faqItemLast]}>
      <Pressable
        style={({ pressed }) => [styles.faqHead, pressed && { opacity: NATIVE.pressedOpacity }]}
        onPress={onToggle}
        android_ripple={Platform.OS === "android" ? { color: "rgba(0,0,0,0.08)" } : undefined}
      >
        <Text style={[type.bodyEmphasis, styles.faqQuestion]}>{question}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={native.tertiaryLabel} />
      </Pressable>
      {open ? <Text style={[type.secondary, styles.faqAnswer]}>{answer}</Text> : null}
    </View>
  )
}

export function SupportTip({ children }: { children: ReactNode }) {
  const tokens = useAppThemeTokens()
  const native = tokens.native
  const type = useNativeType()

  return (
    <View style={[styles.tip, { backgroundColor: native.secondaryGrouped }]}>
      <SolidListThumbTile thumb={SUPPORT_TIP_INFO} icon="information-circle-outline" size="compact" />
      <Text style={[type.secondary, styles.tipText]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
  },
  bannerText: { flex: 1 },
  quickLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: NATIVE.rowMinHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quickLinkLast: { borderBottomWidth: 0 },
  quickLinkCopy: { flex: 1, gap: 2 },
  faqItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  faqItemLast: { borderBottomWidth: 0 },
  faqHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: NATIVE.rowMinHeight,
  },
  faqQuestion: { flex: 1, lineHeight: 20 },
  faqAnswer: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    lineHeight: 20,
  },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
  },
  tipText: { flex: 1, lineHeight: 19 },
})
