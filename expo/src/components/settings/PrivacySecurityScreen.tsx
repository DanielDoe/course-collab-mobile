import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { AiDataDisclosureContent } from "./AiDataDisclosureContent"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import { openPrivacyPolicy, openSupportSite, openTermsOfService } from "../../lib/open-legal-url"
import { settingsRowThumb } from "../../lib/support-color-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

function SectionHeader({ title }: { title: string }) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <Text style={[type.sectionHeader, styles.sectionHeader, { color: native.secondaryLabel }]}>{title}</Text>
  )
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  return (
    <View
      style={[
        styles.group,
        tokens.cardShadow,
        { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
      ]}
    >
      {children}
    </View>
  )
}

function SettingsRow({
  icon,
  label,
  onPress,
  destructive,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  destructive?: boolean
  isLast?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const thumb = settingsRowThumb(icon)
  const iconColor = destructive ? tokens.danger : thumb.label

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
        pressed && { backgroundColor: native.fill },
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {destructive ? (
        <View style={[styles.rowIcon, { backgroundColor: `${tokens.danger}18` }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : (
        <SolidListThumbTile thumb={thumb} icon={icon} size="compact" style={styles.rowIconTile} />
      )}
      <Text
        style={[type.bodyEmphasis, styles.rowLabel, { color: destructive ? tokens.danger : native.label }]}
        numberOfLines={2}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
    </Pressable>
  )
}

export function PrivacySecurityScreen() {
  const router = useRouter()
  const native = useThemedNative()

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Privacy & Security" fallbackHref="/settings" />
      <ModuleScreen disableTopInsetAdjustment>
        <SectionHeader title="Legal" />
        <SettingsGroup>
          <SettingsRow icon="document-text-outline" label="Privacy Policy" onPress={() => void openPrivacyPolicy()} />
          <SettingsRow icon="reader-outline" label="Terms of Service" onPress={() => void openTermsOfService()} isLast />
        </SettingsGroup>

        <SectionHeader title="AI & Data" />
        <SettingsGroup>
          <SettingsRow
            icon="sparkles-outline"
            label="How Cora uses your data"
            onPress={() => router.push("/settings/ai-data" as never)}
            isLast
          />
        </SettingsGroup>

        <SectionHeader title="Account" />
        <SettingsGroup>
          <SettingsRow
            icon="lock-closed-outline"
            label="Account Security"
            onPress={() => router.push("/settings?open=security" as never)}
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete account"
            onPress={() => router.push("/settings/delete-account" as never)}
            destructive
            isLast
          />
        </SettingsGroup>

        <SectionHeader title="Support" />
        <SettingsGroup>
          <SettingsRow icon="help-circle-outline" label="Contact support" onPress={() => void openSupportSite()} isLast />
        </SettingsGroup>

        <SectionHeader title="AI & Data Summary" />
        <View style={[styles.disclosureCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <AiDataDisclosureContent />
        </View>
      </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  sectionHeader: { marginTop: 16, marginBottom: 8, paddingHorizontal: 2 },
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
  rowIconTile: { width: 36, height: 36, borderRadius: 10 },
  rowLabel: { flex: 1, minWidth: 0 },
  disclosureCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginTop: 4,
  },
})
