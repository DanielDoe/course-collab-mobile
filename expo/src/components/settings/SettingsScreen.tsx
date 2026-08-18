import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import Constants from "expo-constants"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useSession } from "../../context/SessionProvider"
import { useAppearance, useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { getAppearanceModeLabel, getThemeLabel } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import { useOptionalStudentShell } from "../../context/StudentShellContext"
import { ApiError, studentApi } from "../../lib/student-api"
import type { StudentSession, SummerSession } from "../../lib/session"
import { getCachedMembershipTier, setCachedMembershipTier } from "../../lib/membership-tier-cache"
import { parseMembershipTier } from "../../lib/membership-tier"
import type { MembershipTier } from "../../types/dashboard"
import {
  getClassReminderPrefs,
  saveClassReminderPrefs,
} from "../../lib/calendar/reminder-preferences"
import { ensureNotificationPermission } from "../../lib/calendar/class-reminders"
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "../../lib/settings-preferences"
import {
  requestNotificationPermissionAlert,
  StudentNotificationSettingsSheet,
  StudentProfileSettingsSheet,
  StudentSecuritySettingsSheet,
} from "./StudentSettingsSheets"
import { getStudentCourseLine, getStudentSectionLine } from "../shell/shell-shared"
import { formatSummerRole } from "../summer/summer-utils"
import { SETTINGS_PROFILE_THUMB, settingsRowThumb } from "../../lib/support-color-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

type SheetId = "profile" | "security" | "notifications" | null

type SettingsSession =
  | { portal: "student"; session: StudentSession }
  | { portal: "summer"; session: SummerSession }

function useSettingsSession(): SettingsSession | null {
  const { session } = useSession()
  return useMemo(() => {
    if (session?.portal === "student") return { portal: "student", session }
    if (session?.portal === "summer") return { portal: "summer", session }
    return null
  }, [session])
}

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function SettingsSectionHeader({ title }: { title: string }) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <Text style={[type.sectionHeader, styles.sectionHeader, { color: native.secondaryLabel }]}>
      {title}
    </Text>
  )
}

function SettingsRow({
  icon,
  label,
  detail,
  onPress,
  destructive,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  detail?: string
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
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.rowTrailing}>
        {detail ? (
          <Text style={[type.detail, styles.rowDetail, { color: native.secondaryLabel }]} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        {!destructive ? <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} /> : null}
      </View>
    </Pressable>
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

export function SettingsScreen() {
  const settingsSession = useSettingsSession()
  const router = useRouter()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const { signOut } = useSession()
  const studentShell = useOptionalStudentShell()
  const { prefs } = useAppearance()
  const appearanceSummary = `${getThemeLabel(prefs.themeId)} · ${getAppearanceModeLabel(prefs.appearanceMode)}`
  const isSummer = settingsSession?.portal === "summer"
  const studentSession = settingsSession?.portal === "student" ? settingsSession.session : null
  const summerSession = settingsSession?.portal === "summer" ? settingsSession.session : null

  const [activeSheet, setActiveSheet] = useState<SheetId>(null)
  const params = useLocalSearchParams<{ open?: string | string[] }>()
  const openSheet = Array.isArray(params.open) ? params.open[0] : params.open

  useEffect(() => {
    if (openSheet === "security") setActiveSheet("security")
  }, [openSheet])
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    quizReminders: true,
    announcementAlerts: true,
    classReminders: true,
    classReminderMinutes: 30,
  })
  const [localMembershipTier, setLocalMembershipTier] = useState<MembershipTier>("Scholar")
  const [localMembershipTierLoaded, setLocalMembershipTierLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const membershipTier = studentShell?.membershipTier ?? localMembershipTier
  const membershipTierLoaded = studentShell?.membershipTierLoaded ?? localMembershipTierLoaded

  const displayName = studentSession?.name ?? summerSession?.name ?? "Account"
  const profileInitials = useMemo(() => initialsFor(displayName), [displayName])
  const courseLine = useMemo(
    () => (studentSession ? getStudentCourseLine(studentSession) : null),
    [studentSession],
  )
  const sectionLine = useMemo(
    () => (studentSession ? getStudentSectionLine(studentSession) : null),
    [studentSession],
  )
  const profileSubtitle = isSummer
    ? formatSummerRole(summerSession?.studentProgramRole)
    : courseLine ?? "CourseCollab student"
  const membershipLabel = membershipTierLoaded ? `${membershipTier} member` : "View plan"

  const loadMembership = useCallback(async (session: StudentSession) => {
    if (studentShell) return
    const cached = await getCachedMembershipTier(session.databaseId)
    if (cached) {
      setLocalMembershipTier(cached)
      setLocalMembershipTierLoaded(true)
    }
    try {
      const payload = await studentApi.getMembership(session)
      const tier = parseMembershipTier(payload.membership?.tier)
      setLocalMembershipTier(tier)
      setLocalMembershipTierLoaded(true)
      await setCachedMembershipTier(session.databaseId, tier)
    } catch {
      if (!cached) setLocalMembershipTierLoaded(false)
    }
  }, [studentShell])

  const load = useCallback(async () => {
    if (!settingsSession) return
    setError("")
    try {
      const [localNotifs, classReminders] = await Promise.all([
        getNotificationPrefs(),
        getClassReminderPrefs(),
      ])
      setNotifPrefs({
        ...localNotifs,
        classReminders: classReminders.enabled,
        classReminderMinutes: classReminders.minutesBefore,
      })

      if (settingsSession.portal === "student") {
        const profileData = await studentApi.getProfile(settingsSession.session)
        const profile = profileData.student ?? profileData.profile ?? {}
        setFullName(profile.full_name ?? settingsSession.session.name)
        setEmail(profile.email ?? "")
        await loadMembership(settingsSession.session)
      } else {
        setFullName(settingsSession.session.name)
        setEmail(settingsSession.session.email ?? "")
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load settings.")
    }
  }, [settingsSession, loadMembership])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  async function handleSaveProfile() {
    if (!studentSession || !fullName.trim()) {
      AppAlert.alert("Name required", "Please enter your full name.")
      return
    }
    setSavingProfile(true)
    setMessage("")
    setError("")
    try {
      await studentApi.updateProfile(studentSession, { fullName: fullName.trim(), email: email.trim() })
      setMessage("Profile updated.")
      setActiveSheet(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (!studentSession) return
    if (!currentPassword || !newPassword) {
      AppAlert.alert("Missing fields", "Enter your current and new password.")
      return
    }
    if (newPassword.length < 8) {
      AppAlert.alert("Password too short", "Use at least 8 characters for your new password.")
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
      await studentApi.changePassword(studentSession, currentPassword, newPassword)
      setMessage("Password changed successfully.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setActiveSheet(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password.")
    } finally {
      setSavingPassword(false)
    }
  }

  async function persistNotificationPrefs(next: NotificationPrefs) {
    setNotifPrefs(next)
    await saveNotificationPrefs({
      quizReminders: next.quizReminders,
      announcementAlerts: next.announcementAlerts,
      classReminders: next.classReminders,
      classReminderMinutes: next.classReminderMinutes,
    })
    await saveClassReminderPrefs({
      enabled: next.classReminders,
      minutesBefore: next.classReminderMinutes,
    })
  }

  async function toggleNotification(
    key: keyof Pick<NotificationPrefs, "quizReminders" | "announcementAlerts" | "classReminders">,
    enabled: boolean,
  ) {
    if (enabled) {
      const permitted = await ensureNotificationPermission()
      if (!permitted) {
        requestNotificationPermissionAlert()
        return
      }
    }
    await persistNotificationPrefs({ ...notifPrefs, [key]: enabled })
  }

  async function setClassReminderMinutes(minutes: NotificationPrefs["classReminderMinutes"]) {
    await persistNotificationPrefs({ ...notifPrefs, classReminderMinutes: minutes })
  }

  function handleSignOut() {
    AppAlert.alert("Sign out?", "You will need to sign in again to access your account.", [
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

  function openProfileSheet() {
    if (isSummer) {
      AppAlert.alert("Camp profile", "Your summer camp profile is managed by your camp enrollment. Contact your instructor to update account details.")
      return
    }
    setActiveSheet("profile")
  }

  const appVersion = Constants.expoConfig?.version ?? "1.0.0"
  const notificationSummary =
    [
      notifPrefs.quizReminders ? "Quizzes" : null,
      notifPrefs.announcementAlerts ? "Announcements" : null,
      notifPrefs.classReminders ? "Class" : null,
    ]
      .filter(Boolean)
      .join(", ") || "Off"

  if (!settingsSession) {
    return (
      <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
        <NotetakerScreenHeader title="Settings" fallbackHref="/dashboard" />
        <ModuleScreen loading={false} error="Settings are not available for this account type." disableTopInsetAdjustment>
          <View />
        </ModuleScreen>
      </View>
    )
  }

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Settings" fallbackHref="/dashboard" />
      <ModuleScreen
        loading={loading}
        error={error}
        refreshing={refreshing}
        disableTopInsetAdjustment
        onRefresh={() => {
          setRefreshing(true)
          load().finally(() => setRefreshing(false))
        }}
      >
      {message ? (
        <View style={[styles.bannerSuccess, { backgroundColor: `${tokens.success}18`, borderColor: `${tokens.success}33` }]}>
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
        onPress={openProfileSheet}
        accessibilityRole="button"
        accessibilityLabel="View profile"
      >
        <SolidListThumbTile thumb={SETTINGS_PROFILE_THUMB} size="compact" style={styles.profileAvatar}>
          <Text style={[styles.profileAvatarText, { color: SETTINGS_PROFILE_THUMB.icon }]}>{profileInitials}</Text>
        </SolidListThumbTile>
        <View style={styles.profileCopy}>
          <Text style={[type.bodyEmphasis, styles.profileName, { color: native.label }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[type.caption, styles.profileSub, { color: native.secondaryLabel }]} numberOfLines={1}>
            {profileSubtitle}
          </Text>
          <View style={styles.profileMetaRow}>
            <Text style={[type.footnote, styles.profileMeta, { color: native.tertiaryLabel }]}>
              ID {settingsSession.session.databaseId ?? "—"}
            </Text>
            {sectionLine ? (
              <>
                <Text style={[type.footnote, styles.profileMeta, { color: native.tertiaryLabel }]}>·</Text>
                <Text style={[type.footnote, styles.profileMeta, { color: native.tertiaryLabel }]}>
                  Section {sectionLine}
                </Text>
              </>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
      </Pressable>

      <SettingsSectionHeader title="Account" />
      <SettingsGroup>
        {!isSummer ? (
          <>
            <SettingsRow icon="person-outline" label="Edit profile" onPress={() => setActiveSheet("profile")} />
            <SettingsRow
              icon="lock-closed-outline"
              label="Password & security"
              onPress={() => setActiveSheet("security")}
            />
            <SettingsRow
              icon="diamond-outline"
              label="Membership"
              detail={membershipLabel}
              onPress={() => router.push("/membership" as never)}
            />
            <SettingsRow
              icon="time-outline"
              label="Cora usage"
              detail="Logs"
              onPress={() => router.push("/settings/cora-usage" as never)}
              isLast
            />
          </>
        ) : (
          <SettingsRow
            icon="sunny-outline"
            label="Summer camp account"
            detail="Camp enrollment"
            onPress={openProfileSheet}
            isLast
          />
        )}
      </SettingsGroup>

      <SettingsSectionHeader title="Preferences" />
      <SettingsGroup>
        <SettingsRow
          icon="notifications-outline"
          label="Notifications"
          detail={notificationSummary}
          onPress={() => setActiveSheet("notifications")}
        />
        <SettingsRow
          icon="color-palette-outline"
          label="Appearance"
          detail={appearanceSummary}
          onPress={() => router.push("/settings/appearance" as never)}
          isLast
        />
      </SettingsGroup>

      {isSummer ? (
        <>
          <SettingsSectionHeader title="Camp info" />
          <SettingsGroup>
            <SettingsRow
              icon="calendar-outline"
              label="Calendar"
              onPress={() => router.push("/module/calendar" as never)}
              isLast
            />
          </SettingsGroup>
        </>
      ) : null}

      <SettingsSectionHeader title="Support" />
      <SettingsGroup>
        {isSummer ? (
          <SettingsRow
            icon="chatbubbles-outline"
            label="Discussions & help"
            onPress={() => router.push("/module/discussions" as never)}
          />
        ) : (
          <>
            <SettingsRow
              icon="help-circle-outline"
              label="Help center"
              onPress={() => router.push("/module/help-center" as never)}
            />
            <SettingsRow
              icon="megaphone-outline"
              label="Announcements"
              onPress={() => router.push("/announcements" as never)}
            />
          </>
        )}
        <SettingsRow
          icon="shield-outline"
          label="Privacy & legal"
          onPress={() => router.push("/settings/privacy-security" as never)}
          isLast
        />
      </SettingsGroup>

      <SettingsSectionHeader title="Session" />
      <SettingsGroup>
        <SettingsRow icon="log-out-outline" label="Sign out" onPress={handleSignOut} destructive isLast />
      </SettingsGroup>

      <View style={styles.footer}>
        <Text style={[type.footnote, styles.footerText, { color: native.tertiaryLabel }]}>
          CourseCollab · v{appVersion}
        </Text>
      </View>

      {!isSummer ? (
        <>
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
            userId={settingsSession.session.databaseId}
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            saving={savingPassword}
            onChangeCurrent={setCurrentPassword}
            onChangeNew={setNewPassword}
            onChangeConfirm={setConfirmPassword}
            onSave={() => void handleChangePassword()}
            onClose={() => setActiveSheet(null)}
          />
        </>
      ) : null}

      <StudentNotificationSettingsSheet
        visible={activeSheet === "notifications"}
        prefs={notifPrefs}
        onToggle={(key, enabled) => void toggleNotification(key, enabled)}
        onSetReminderMinutes={(minutes) => void setClassReminderMinutes(minutes)}
        onClose={() => setActiveSheet(null)}
      />
    </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
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
  rowIconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  profileAvatarText: { fontSize: 18, fontWeight: "700" },
  profileCopy: { flex: 1, minWidth: 0, gap: 2 },
  profileName: {},
  profileSub: { lineHeight: 18 },
  profileMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  profileMeta: { fontSize: 12 },
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
  rowLabel: { flexShrink: 0, flexGrow: 1, marginRight: 8 },
  rowTrailing: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 1,
    maxWidth: "46%",
  },
  rowDetail: { flexShrink: 1, textAlign: "right" as const },
  footer: { alignItems: "center", paddingVertical: 16 },
  footerText: {},
})
