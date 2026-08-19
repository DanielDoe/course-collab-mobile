import { useEffect } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useSession } from "../../context/SessionProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { isLearnerPortal } from "../../lib/session"
import { useNativeType } from "../../lib/themed-module-theme"
import { settingsRowThumb } from "../../lib/support-color-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { prefetchLegalContentCatalog } from "../../lib/legal-content-api"

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
  const { session } = useSession()
  const showCoraSettings =
    session == null ||
    isLearnerPortal(session.portal) ||
    session.portal === "faculty" ||
    session.portal === "admin"

  useEffect(() => {
    void prefetchLegalContentCatalog()
  }, [])

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Privacy & legal" fallbackHref="/settings" />
      <ModuleScreen disableTopInsetAdjustment>
        <SectionHeader title="Legal" />
        <SettingsGroup>
          <SettingsRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => router.push("/settings/legal/privacy" as never)}
          />
          <SettingsRow
            icon="reader-outline"
            label="Terms of Service"
            onPress={() => router.push("/settings/legal/terms" as never)}
            isLast
          />
        </SettingsGroup>

        {showCoraSettings ? (
          <>
            <SectionHeader title="Cora" />
            <SettingsGroup>
              <SettingsRow
                icon="sparkles-outline"
                label="Cora privacy & personalization"
                onPress={() => router.push("/settings/cora-privacy" as never)}
              />
              <SettingsRow
                icon="analytics-outline"
                label="How Cora uses your data"
                onPress={() => router.push("/settings/ai-data" as never)}
                isLast
              />
            </SettingsGroup>
          </>
        ) : null}

        <SectionHeader title="Your data" />
        <SettingsGroup>
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
          <SettingsRow
            icon="help-circle-outline"
            label="Support"
            onPress={() => router.push("/settings/legal/support" as never)}
            isLast
          />
        </SettingsGroup>
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
})
