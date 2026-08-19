import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import Constants from "expo-constants"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useSession } from "../../context/SessionProvider"
import { useAppearance, useAppThemeTokens } from "../../context/AppearanceProvider"
import { getAppearanceModeLabel, getThemeLabel } from "../../constants/app-themes"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorProfile } from "../../lib/instructor-api"
import {
  getFacultyNotificationPrefs,
  saveFacultyNotificationPrefs,
  type FacultyNotificationPrefs,
} from "../../lib/faculty-settings-preferences"
import {
  formatFacultyDisplayName,
  getFacultyProfilePrefs,
  saveFacultyProfilePrefs,
  type FacultyTitle,
} from "../../lib/faculty-profile-preferences"
import { ensureNotificationPermission } from "../../lib/calendar/class-reminders"
import type { FacultySession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { formatFacultyRoleLabel, getCourseDisplayLine } from "../shell/shell-shared"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { facultyMembershipTierLongLabel } from "../../lib/faculty-membership-tier"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import {
  FACULTY_SETTINGS_COLOR,
  facultySettingsRowThumb,
} from "../../lib/faculty-settings-theme"
import {
  FacultyNotificationSettingsSheet,
  FacultyProfileSettingsSheet,
  FacultySecuritySettingsSheet,
} from "./FacultySettingsSheets"

type SheetId = "profile" | "security" | "notifications" | null

function formatDate(iso?: string | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
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
  const thumb = facultySettingsRowThumb(icon)

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
          <Ionicons name={icon} size={18} color={tokens.danger} />
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

export function FacultySettingsHubScreen() {
  const router = useRouter()
  const { session, course } = useFacultyScope()
  const { signIn, signOut } = useSession()
  const { openCoursePicker, membershipTier, membershipTierLoaded } = useFacultyShell()
  const { prefs } = useAppearance()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const appearanceSummary = `${getThemeLabel(prefs.themeId)} · ${getAppearanceModeLabel(prefs.appearanceMode)}`

  const [profile, setProfile] = useState<InstructorProfile | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [title, setTitle] = useState<FacultyTitle>("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [notifPrefs, setNotifPrefs] = useState<FacultyNotificationPrefs>({
    submissionAlerts: true,
    officeHoursAlerts: true,
    classroomPointsAlerts: true,
    studentMessageAlerts: true,
  })
  const [activeSheet, setActiveSheet] = useState<SheetId>(null)
  const params = useLocalSearchParams<{ open?: string | string[] }>()
  const openSheet = Array.isArray(params.open) ? params.open[0] : params.open

  useEffect(() => {
    if (openSheet === "security") setActiveSheet("security")
  }, [openSheet])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const facultySession = session as FacultySession | null
  const profileInitials = useMemo(() => initialsFor(facultySession?.name ?? "Instructor"), [facultySession?.name])
  const profileDisplayName = useMemo(
    () => formatFacultyDisplayName(facultySession?.name ?? "", title),
    [facultySession?.name, title],
  )

  const courseSummary = useMemo(() => {
    if (!course) return "No course selected"
    return getCourseDisplayLine(course.course_code, course.course_title) ?? "No course selected"
  }, [course])

  const roleLabel = formatFacultyRoleLabel(facultySession?.role)

  const load = useCallback(async () => {
    if (!facultySession) return
    setError("")
    try {
      const [profileRes, localNotifs, localProfile] = await Promise.all([
        instructorApi.getProfile(facultySession.id),
        getFacultyNotificationPrefs(),
        getFacultyProfilePrefs(facultySession.id),
      ])
      const instructor = profileRes.instructor
      setProfile(instructor)
      setName(instructor.name ?? facultySession.name)
      setEmail(instructor.email ?? facultySession.email ?? "")
      setUsername(instructor.username ?? facultySession.username)
      setTitle(localProfile.title)
      setNotifPrefs(localNotifs)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load settings.")
    }
  }, [facultySession])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  async function handleSaveProfile() {
    if (!facultySession || !name.trim()) {
      AppAlert.alert("Name required", "Please enter your display name.")
      return
    }
    if (!username.trim()) {
      AppAlert.alert("Username required", "Please enter your username.")
      return
    }
    setSavingProfile(true)
    setMessage("")
    setError("")
    try {
      const res = await instructorApi.updateProfile(facultySession.id, {
        name: name.trim(),
        email: email.trim(),
        username: username.trim(),
      })
      setProfile(res.instructor)
      await saveFacultyProfilePrefs(facultySession.id, { title })
      await signIn({
        portal: "faculty",
        id: facultySession.id,
        name: res.instructor.name,
        username: res.instructor.username,
        email: res.instructor.email,
        role: facultySession.role,
      })
      setMessage("Profile updated.")
      setActiveSheet(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (!facultySession) return
    if (!currentPassword || !newPassword) {
      AppAlert.alert("Missing fields", "Enter your current and new password.")
      return
    }
    if (newPassword.length < 8) {
      AppAlert.alert("Password too short", "Use at least 8 characters for your new password.")
      return
    }
    if (!/\d/.test(newPassword)) {
      AppAlert.alert("Password requirements", "Include at least one number in your new password.")
      return
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      AppAlert.alert("Password requirements", "Include at least one special character in your new password.")
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
      await instructorApi.changePassword(facultySession.id, currentPassword, newPassword)
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

  async function persistNotificationPrefs(next: FacultyNotificationPrefs) {
    setNotifPrefs(next)
    await saveFacultyNotificationPrefs(next)
  }

  async function toggleNotification(key: keyof FacultyNotificationPrefs, enabled: boolean) {
    if (enabled) {
      const permitted = await ensureNotificationPermission()
      if (!permitted) {
        AppAlert.alert(
          "Notifications disabled",
          "Enable notifications in Settings to receive alerts on this device.",
        )
        return
      }
    }
    await persistNotificationPrefs({ ...notifPrefs, [key]: enabled })
  }

  function handleSignOut() {
    AppAlert.alert("Sign out?", "You will need to sign in again to access your courses.", [
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

  if (!facultySession) return null

  const appVersion = Constants.expoConfig?.version ?? "1.0.0"
  const memberSince = formatDate(profile?.created_at)
  const lastLogin = formatDate(profile?.last_login)
  const notificationSummary =
    [
      notifPrefs.submissionAlerts ? "Submissions" : null,
      notifPrefs.officeHoursAlerts ? "Office hours" : null,
      notifPrefs.classroomPointsAlerts ? "Points" : null,
      notifPrefs.studentMessageAlerts ? "Messages" : null,
    ]
      .filter(Boolean)
      .join(", ") || "Off"

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Settings" fallbackHref="/dashboard" />
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
        onPress={() => setActiveSheet("profile")}
        accessibilityRole="button"
        accessibilityLabel="View profile"
      >
        <SolidListThumbTile thumb={FACULTY_SETTINGS_COLOR.profileThumb} size="compact" style={styles.profileAvatar}>
          <Text style={[styles.profileAvatarText, { color: FACULTY_SETTINGS_COLOR.profileThumb.icon }]}>
            {profileInitials}
          </Text>
        </SolidListThumbTile>
        <View style={styles.profileCopy}>
          <Text style={[type.bodyEmphasis, styles.profileName, { color: native.label }]} numberOfLines={1}>
            {profileDisplayName}
          </Text>
          <Text style={[type.caption, styles.profileSub, { color: native.secondaryLabel }]} numberOfLines={1}>
            {roleLabel}
            {facultySession.email ? ` · ${facultySession.email}` : ""}
          </Text>
          <View style={styles.profileMetaRow}>
            <View style={[styles.metaPill, { backgroundColor: `${FACULTY_SETTINGS_COLOR.rolePill}18`, borderColor: `${FACULTY_SETTINGS_COLOR.rolePill}33` }]}>
              <Ionicons name="shield-checkmark-outline" size={11} color={FACULTY_SETTINGS_COLOR.rolePill} />
              <Text style={[type.footnote, { color: FACULTY_SETTINGS_COLOR.rolePill, fontWeight: "600" }]}>{roleLabel}</Text>
            </View>
            {course?.course_code ? (
              <View style={[styles.metaPill, { backgroundColor: `${FACULTY_SETTINGS_COLOR.coursePill}18`, borderColor: `${FACULTY_SETTINGS_COLOR.coursePill}33` }]}>
                <Ionicons name="book-outline" size={11} color={FACULTY_SETTINGS_COLOR.coursePill} />
                <Text style={[type.footnote, { color: FACULTY_SETTINGS_COLOR.coursePill, fontWeight: "700" }]} numberOfLines={1}>
                  {course.course_code}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
      </Pressable>

      <SettingsSectionHeader title="Account" />
      <SettingsGroup>
        <SettingsRow icon="person-outline" label="Edit profile" onPress={() => setActiveSheet("profile")} />
        <SettingsRow
          icon="diamond-outline"
          label="Membership & plans"
          detail={
            membershipTierLoaded
              ? facultyMembershipTierLongLabel(membershipTier)
              : "View plan"
          }
          onPress={() => router.push("/membership" as never)}
        />
        <SettingsRow
          icon="time-outline"
          label="Cora usage history"
          detail="Search & review logs"
          onPress={() => router.push("/settings/cora-usage" as never)}
        />
        <SettingsRow
          icon="lock-closed-outline"
          label="Password & security"
          onPress={() => setActiveSheet("security")}
          isLast
        />
      </SettingsGroup>

      <SettingsSectionHeader title="Workspace" />
      <SettingsGroup>
        <SettingsRow icon="swap-horizontal-outline" label="Switch course" detail={courseSummary} onPress={openCoursePicker} />
        <SettingsRow
          icon="school-outline"
          label="My courses"
          onPress={() => router.push("/module/my-courses" as never)}
        />
        <SettingsRow
          icon="options-outline"
          label="Course settings"
          onPress={() => router.push("/module/course-settings" as never)}
          isLast
        />
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
          label="Appearance & themes"
          detail={appearanceSummary}
          onPress={() => router.push("/settings/appearance" as never)}
          isLast
        />
      </SettingsGroup>

      <SettingsSectionHeader title="Teaching tools" />
      <SettingsGroup>
        <SettingsRow
          icon="sparkles-outline"
          label="Cora Assistant Settings"
          onPress={() => router.push("/module/ai-assistant-settings" as never)}
        />
        <SettingsRow
          icon="alert-circle-outline"
          label="Submission issues"
          onPress={() => router.push("/module/submission-issues" as never)}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Assessment governance"
          onPress={() => router.push("/module/assessment-governance" as never)}
        />
        <SettingsRow
          icon="scale-outline"
          label="Grading policies"
          onPress={() => router.push("/module/grading-policies" as never)}
          isLast
        />
      </SettingsGroup>

      <SettingsSectionHeader title="Support" />
      <SettingsGroup>
        <SettingsRow icon="help-circle-outline" label="Help center" onPress={() => router.push("/module/help-center" as never)} />
        <SettingsRow
          icon="chatbubble-ellipses-outline"
          label="Student support"
          onPress={() => router.push("/module/student-support" as never)}
        />
        <SettingsRow
          icon="megaphone-outline"
          label="Announcements"
          onPress={() => router.push("/module/announcements" as never)}
        />
        <SettingsRow
          icon="shield-outline"
          label="Privacy & legal"
          onPress={() => router.push("/settings/privacy-security" as never)}
        />
        <SettingsRow
          icon="sparkles-outline"
          label="Cora privacy & data use"
          onPress={() => router.push("/settings/cora-privacy" as never)}
        />
        <SettingsRow
          icon="analytics-outline"
          label="How Cora uses your data"
          onPress={() => router.push("/settings/ai-data" as never)}
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

      <FacultyProfileSettingsSheet
        visible={activeSheet === "profile"}
        name={name}
        username={username}
        email={email}
        title={title}
        roleLabel={roleLabel}
        memberSince={memberSince}
        lastLogin={lastLogin}
        saving={savingProfile}
        onChangeName={setName}
        onChangeUsername={setUsername}
        onChangeEmail={setEmail}
        onChangeTitle={setTitle}
        onSave={() => void handleSaveProfile()}
        onClose={() => setActiveSheet(null)}
      />

      <FacultySecuritySettingsSheet
        visible={activeSheet === "security"}
        instructorId={facultySession.id}
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

      <FacultyNotificationSettingsSheet
        visible={activeSheet === "notifications"}
        prefs={notifPrefs}
        onToggle={(key, enabled) => void toggleNotification(key, enabled)}
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
  profileCopy: { flex: 1, minWidth: 0, gap: 2 },
  profileName: {},
  profileSub: { lineHeight: 18 },
  profileMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
    textTransform: "none",
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
  rowIconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
  footer: { alignItems: "center", paddingVertical: 16 },
  footerText: {},
})
