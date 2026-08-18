import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { Ionicons } from "@/components/icons/AppIcon"
import Constants from "expo-constants"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { AppearanceSettingsContent } from "../settings/AppearanceSettingsScreen"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { ApiError } from "../../lib/api"
import { guestApi } from "../../lib/guest-api"
import type { GuestSession } from "../../lib/session"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  StudentProfileSettingsSheet,
  StudentSecuritySettingsSheet,
} from "../settings/StudentSettingsSheets"
import {
  GuestSettingsGroup,
  GuestSettingsRow,
  GuestSettingsSectionHeader,
  GuestSettingsSignOutGroup,
} from "./guest-shared"

type SheetId = "profile" | "security" | null

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function GuestSettingsScreen() {
  const router = useRouter()
  const { sheet } = useLocalSearchParams<{ sheet?: string }>()
  const { session, signOut } = useSession()
  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const [activeSheet, setActiveSheet] = useState<SheetId>(null)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const purposeLabel =
    guestSession?.guestAccessPurpose === "recommendation_letter" ? "Recommendation letters" : "Career Member"

  const load = useCallback(async () => {
    if (!guestSession) return
    setError("")
    try {
      const profileData = await guestApi.getProfile(guestSession)
      const profile = profileData.student ?? profileData.profile ?? {}
      setFullName(String(profile.full_name ?? guestSession.name))
      setEmail(String(profile.email ?? ""))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load settings.")
    }
  }, [guestSession])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  useEffect(() => {
    if (sheet === "profile" || sheet === "security") {
      setActiveSheet(sheet)
    }
  }, [sheet])

  async function handleSaveProfile() {
    if (!guestSession || !fullName.trim()) {
      AppAlert.alert("Name required", "Please enter your full name.")
      return
    }
    setSavingProfile(true)
    setMessage("")
    setError("")
    try {
      await guestApi.updateProfile(guestSession, { fullName: fullName.trim(), email: email.trim() })
      setMessage("Profile updated.")
      setActiveSheet(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSavePassword() {
    if (!guestSession) return
    if (!currentPassword || !newPassword) {
      AppAlert.alert("Missing fields", "Enter your current and new password.")
      return
    }
    if (newPassword.length < 8) {
      AppAlert.alert("Password too short", "Use at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      AppAlert.alert("Passwords do not match", "Confirm your new password.")
      return
    }
    setSavingPassword(true)
    setMessage("")
    setError("")
    try {
      await guestApi.changePassword(guestSession, currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setActiveSheet(null)
      setMessage("Password updated.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password.")
    } finally {
      setSavingPassword(false)
    }
  }

  function handleSignOut() {
    AppAlert.alert("Sign out?", "You will need to sign in again to access your letters.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void signOut().then(() => router.replace("/login"))
        },
      },
    ])
  }

  const profileInitials = useMemo(
    () => initialsFor(fullName || guestSession?.name || "G"),
    [fullName, guestSession?.name],
  )

  if (!guestSession) return null

  const appVersion = Constants.expoConfig?.version ?? "1.0.0"

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Settings" fallbackHref="/dashboard" />
      <View style={styles.body}>
      <ModuleScreen
        loading={loading}
        error={error}
        refreshing={refreshing}
        disableTopInsetAdjustment
        stackedHeader
        onRefresh={() => {
          setRefreshing(true)
          load().finally(() => setRefreshing(false))
        }}
      >
        {message ? (
          <View
            style={[
              styles.bannerSuccess,
              { backgroundColor: `${tokens.success}18`, borderColor: `${tokens.success}33` },
            ]}
          >
            <Ionicons name="checkmark-circle" size={18} color={tokens.success} />
            <Text style={[styles.bannerSuccessText, { color: tokens.success }]}>{message}</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.profileCard,
            tokens.cardShadow,
            { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
          ]}
          onPress={() => setActiveSheet("profile")}
          accessibilityRole="button"
          accessibilityLabel="View profile"
        >
          <View style={[styles.profileAvatar, { backgroundColor: tokens.accentSoft }]}>
            <Text style={[styles.profileAvatarText, { color: tokens.accent }]}>{profileInitials}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
              {fullName || guestSession.name}
            </Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
              Guest · {purposeLabel}
            </Text>
            <Text style={[type.footnote, { color: native.tertiaryLabel }]}>ID {guestSession.id}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
        </Pressable>

        <GuestSettingsSectionHeader title="Account" />
        <GuestSettingsGroup>
          <GuestSettingsRow icon="person-outline" label="Profile" onPress={() => setActiveSheet("profile")} />
          <GuestSettingsRow
            icon="key-outline"
            label="Password & security"
            onPress={() => setActiveSheet("security")}
          />
          <GuestSettingsRow
            icon="shield-outline"
            label="Privacy & legal"
            onPress={() => router.push("/settings/privacy-security" as never)}
            isLast
          />
        </GuestSettingsGroup>

        <GuestSettingsSectionHeader title="Appearance" />
        <View style={styles.appearanceSection}>
          <AppearanceSettingsContent compact />
        </View>

        <GuestSettingsSectionHeader title="Session" />
        <GuestSettingsSignOutGroup onPress={handleSignOut} />

        <View style={styles.footer}>
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}>CourseCollab guest · v{appVersion}</Text>
        </View>
      </ModuleScreen>

      <StudentProfileSettingsSheet
        visible={activeSheet === "profile"}
        fullName={fullName}
        email={email}
        saving={savingProfile}
        onChangeFullName={setFullName}
        onChangeEmail={setEmail}
        onSave={() => void handleSaveProfile()}
        onClose={() => setActiveSheet(null)}
      />

      <StudentSecuritySettingsSheet
        visible={activeSheet === "security"}
        userId={guestSession?.databaseId ?? ""}
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        saving={savingPassword}
        onChangeCurrent={setCurrentPassword}
        onChangeNew={setNewPassword}
        onChangeConfirm={setConfirmPassword}
        onSave={() => void handleSavePassword()}
        onClose={() => setActiveSheet(null)}
      />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  body: { flex: 1 },
  bannerSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  bannerSuccessText: { flex: 1, fontSize: 13, fontWeight: "600" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: { fontSize: 18, fontWeight: "700" },
  profileCopy: { flex: 1, gap: 2 },
  appearanceSection: { marginBottom: 4 },
  footer: { alignItems: "center", paddingVertical: 16 },
})
