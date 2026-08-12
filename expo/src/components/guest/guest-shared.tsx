import { useMemo, type ReactNode } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { AppThemeTokens } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"
import type { RecommendationPipelineTone } from "../../lib/faculty-recommendation-utils"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"

export function useGuestModuleTheme() {
  const tokens = useAppThemeTokens()
  return useMemo(
    () => ({
      primary: tokens.accent,
      primaryDark: tokens.accentDark,
      primaryLight: tokens.accentSoft,
      soft: tokens.accentSoft,
      softBorder: tokens.accentBorder,
    }),
    [tokens],
  )
}

/** Maps recommendation pipeline tones to appearance theme tokens. */
export function guestPipelineColor(tone: RecommendationPipelineTone, tokens: AppThemeTokens): string {
  switch (tone) {
    case "teal":
      return tokens.success
    case "amber":
      return tokens.warning
    case "rose":
      return tokens.danger
    case "slate":
      return tokens.textMuted
    case "violet":
    case "sky":
    case "blue":
    default:
      return tokens.accent
  }
}

export function GuestSettingsSectionHeader({ title }: { title: string }) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <Text style={[type.sectionHeader, guestSettingsStyles.sectionHeader, { color: native.secondaryLabel }]}>
      {title}
    </Text>
  )
}

export function GuestSettingsGroup({ children }: { children: ReactNode }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  return (
    <View
      style={[
        guestSettingsStyles.group,
        tokens.cardShadow,
        { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
      ]}
    >
      {children}
    </View>
  )
}

export function GuestSettingsRow({
  icon,
  label,
  detail,
  onPress,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  detail?: string
  onPress: () => void
  isLast?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <Pressable
      style={({ pressed }) => [
        guestSettingsStyles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
        pressed && { backgroundColor: native.fill },
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={[guestSettingsStyles.rowIcon, { backgroundColor: tokens.accentSoft }]}>
        <Ionicons name={icon} size={18} color={tokens.accent} />
      </View>
      <Text style={[type.bodyEmphasis, guestSettingsStyles.rowLabel, { color: native.label }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={guestSettingsStyles.rowTrailing}>
        {detail ? (
          <Text style={[type.detail, guestSettingsStyles.rowDetail, { color: native.secondaryLabel }]} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
      </View>
    </Pressable>
  )
}

export function GuestSettingsSignOutGroup({ onPress }: { onPress: () => void }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View
      style={[
        guestSettingsStyles.group,
        tokens.cardShadow,
        { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
      ]}
    >
      <Pressable
        style={({ pressed }) => [guestSettingsStyles.signOutRow, pressed && { backgroundColor: native.fill }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text style={[type.destructive, guestSettingsStyles.signOutLabel]}>Sign out</Text>
      </Pressable>
    </View>
  )
}

const guestSettingsStyles = StyleSheet.create({
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  group: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, minWidth: 0, marginRight: 8 },
  rowTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    maxWidth: "52%",
  },
  rowDetail: { flexShrink: 1, textAlign: "right" as const },
  signOutRow: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  signOutLabel: {
    fontWeight: Platform.OS === "ios" ? "600" : "700",
    textAlign: "center",
  },
})
