import type { ReactNode } from "react"
import { useCallback, useEffect, useState } from "react"
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NativeSwitch } from "../NativeSwitch"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { GlassSurface } from "../theme/GlassSurface"
import { NATIVE, nativeType } from "../../constants/faculty-native-theme"
import type { NotificationPrefs } from "../../lib/settings-preferences"
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  type NotificationPermissionStatus,
} from "../../lib/notifications/notification-service"
import { MfaSecurityCard } from "./MfaSecurityCard"

const REMINDER_OPTIONS: Array<{ minutes: NotificationPrefs["classReminderMinutes"]; label: string }> = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
]

type SheetChromeProps = {
  title: string
  onClose: () => void
  rightSlot?: ReactNode
}

export function StudentSettingsSheetChrome({ title, onClose, rightSlot }: SheetChromeProps) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()

  return (
    <View
      style={[
        sheetStyles.chrome,
        {
          paddingTop: insets.top + 6,
          borderBottomColor: tokens.border,
        },
      ]}
    >
      <GlassSurface
        style={StyleSheet.absoluteFill}
        overlayColor={tokens.surfaceGlass ?? tokens.surface}
      />
      <View style={sheetStyles.chromeContent} pointerEvents="box-none">
      <View style={sheetStyles.handleWrap}>
        <View style={[sheetStyles.handle, { backgroundColor: tokens.textMuted, opacity: 0.35 }]} />
      </View>
      <View style={sheetStyles.titleRow}>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Done">
          <Text style={[sheetStyles.doneBtn, { color: tokens.accent }]}>Done</Text>
        </Pressable>
        <Text style={[sheetStyles.title, { color: tokens.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={sheetStyles.side}>{rightSlot ?? null}</View>
      </View>
      </View>
    </View>
  )
}

function SheetGroup({ children }: { children: ReactNode }) {
  const tokens = useAppThemeTokens()
  return (
    <View
      style={[
        sheetStyles.group,
        tokens.cardShadow,
        { backgroundColor: tokens.surface, borderColor: tokens.border },
      ]}
    >
      {children}
    </View>
  )
}

function SheetFieldLabel({ children }: { children: string }) {
  const tokens = useAppThemeTokens()
  return <Text style={[nativeType.sectionHeader, { color: tokens.textSecondary }]}>{children}</Text>
}

function SheetInput(props: React.ComponentProps<typeof TextInput>) {
  const tokens = useAppThemeTokens()
  return (
    <TextInput
      {...props}
      placeholderTextColor={tokens.textMuted}
      style={[
        sheetStyles.input,
        { color: tokens.text, backgroundColor: tokens.native.fill, borderColor: tokens.border },
        props.style,
      ]}
    />
  )
}

function SheetPrimaryButton({
  label,
  loading,
  onPress,
  icon,
}: {
  label: string
  loading?: boolean
  onPress: () => void
  icon?: keyof typeof Ionicons.glyphMap
}) {
  const tokens = useAppThemeTokens()
  return (
    <Pressable
      style={[sheetStyles.primaryBtn, { backgroundColor: tokens.accent }, loading && sheetStyles.btnDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {icon ? <Ionicons name={icon} size={16} color="#FFFFFF" /> : null}
      <Text style={sheetStyles.primaryBtnText}>{label}</Text>
    </Pressable>
  )
}

function ToggleRow({
  title,
  sub,
  value,
  onChange,
  isLast,
}: {
  title: string
  sub: string
  value: boolean
  onChange: (v: boolean) => void
  isLast?: boolean
}) {
  const tokens = useAppThemeTokens()
  return (
    <View style={[sheetStyles.toggleRow, !isLast && { borderBottomColor: tokens.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={sheetStyles.toggleCopy}>
        <Text style={[nativeType.bodyEmphasis, { color: tokens.text }]}>{title}</Text>
        <Text style={[nativeType.caption, { color: tokens.textSecondary }]}>{sub}</Text>
      </View>
      <NativeSwitch value={value} onValueChange={onChange} />
    </View>
  )
}

type ProfileSheetProps = {
  visible: boolean
  fullName: string
  email: string
  saving: boolean
  onChangeFullName: (v: string) => void
  onChangeEmail: (v: string) => void
  onSave: () => void
  onClose: () => void
}

export function StudentProfileSettingsSheet({
  visible,
  fullName,
  email,
  saving,
  onChangeFullName,
  onChangeEmail,
  onSave,
  onClose,
}: ProfileSheetProps) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[sheetStyles.root, { backgroundColor: tokens.native.groupedBackground }]}>
        <StudentSettingsSheetChrome
          title="Edit Profile"
          onClose={onClose}
          rightSlot={
            <Pressable onPress={onSave} disabled={saving} hitSlop={8}>
              <Text style={[sheetStyles.saveBtn, { color: tokens.accent, opacity: saving ? 0.5 : 1 }]}>
                {saving ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          }
        />
        <ScrollView
          contentContainerStyle={[sheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[sheetStyles.lead, { color: tokens.textSecondary }]}>
            Update how your name and email appear in CourseCollab.
          </Text>
          <SheetGroup>
            <View style={sheetStyles.groupInner}>
              <SheetFieldLabel>Full name</SheetFieldLabel>
              <SheetInput value={fullName} onChangeText={onChangeFullName} placeholder="Your full name" autoCapitalize="words" />
              <SheetFieldLabel>Email</SheetFieldLabel>
              <SheetInput
                value={email}
                onChangeText={onChangeEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
          </SheetGroup>
          <SheetPrimaryButton label={saving ? "Saving…" : "Save profile"} loading={saving} icon="save-outline" onPress={onSave} />
        </ScrollView>
      </View>
    </Modal>
  )
}

type SecuritySheetProps = {
  visible: boolean
  userId: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
  saving: boolean
  onChangeCurrent: (v: string) => void
  onChangeNew: (v: string) => void
  onChangeConfirm: (v: string) => void
  onSave: () => void
  onClose: () => void
}

export function StudentSecuritySettingsSheet({
  visible,
  userId,
  currentPassword,
  newPassword,
  confirmPassword,
  saving,
  onChangeCurrent,
  onChangeNew,
  onChangeConfirm,
  onSave,
  onClose,
}: SecuritySheetProps) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[sheetStyles.root, { backgroundColor: tokens.native.groupedBackground }]}>
        <StudentSettingsSheetChrome title="Password & Security" onClose={onClose} />
        <ScrollView
          contentContainerStyle={[sheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[sheetStyles.lead, { color: tokens.textSecondary }]}>
            Choose a strong password with at least 8 characters.
          </Text>

          <MfaSecurityCard userType="student" userId={userId} variant="sheet" />

          <SheetGroup>
            <View style={sheetStyles.groupInner}>
              <SheetFieldLabel>Current password</SheetFieldLabel>
              <SheetInput
                value={currentPassword}
                onChangeText={onChangeCurrent}
                placeholder="Current password"
                secureTextEntry
                autoCapitalize="none"
              />
              <SheetFieldLabel>New password</SheetFieldLabel>
              <SheetInput
                value={newPassword}
                onChangeText={onChangeNew}
                placeholder="At least 8 characters"
                secureTextEntry
                autoCapitalize="none"
              />
              <SheetFieldLabel>Confirm new password</SheetFieldLabel>
              <SheetInput
                value={confirmPassword}
                onChangeText={onChangeConfirm}
                placeholder="Re-enter new password"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </SheetGroup>
          <SheetPrimaryButton
            label={saving ? "Updating…" : "Change password"}
            loading={saving}
            icon="key-outline"
            onPress={onSave}
          />
        </ScrollView>
      </View>
    </Modal>
  )
}

type NotificationSheetProps = {
  visible: boolean
  prefs: NotificationPrefs
  onToggle: (key: keyof Pick<NotificationPrefs, "quizReminders" | "announcementAlerts" | "classReminders">, enabled: boolean) => void
  onSetReminderMinutes: (minutes: NotificationPrefs["classReminderMinutes"]) => void
  onClose: () => void
}

export function StudentNotificationSettingsSheet({
  visible,
  prefs,
  onToggle,
  onSetReminderMinutes,
  onClose,
}: NotificationSheetProps) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const [permission, setPermission] = useState<NotificationPermissionStatus>("undetermined")

  const refreshPermission = useCallback(() => {
    void getNotificationPermissionStatus().then(setPermission)
  }, [])

  useEffect(() => {
    if (!visible) return
    refreshPermission()
  }, [visible, refreshPermission])

  async function handleEnableSystemPermission() {
    const granted = await requestNotificationPermissions()
    refreshPermission()
    if (!granted) {
      AppAlert.alert(
        "Notifications disabled",
        "Open iOS Settings to allow CourseCollab notifications on this device.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
      )
    }
  }

  const permissionLabel =
    permission === "granted"
      ? "Allowed on this device"
      : permission === "denied"
        ? "Blocked in iOS Settings"
        : "Not requested yet"

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[sheetStyles.root, { backgroundColor: tokens.native.groupedBackground }]}>
        <StudentSettingsSheetChrome title="Notifications" onClose={onClose} />
        <ScrollView
          contentContainerStyle={[sheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[sheetStyles.lead, { color: tokens.textSecondary }]}>
            Control reminders and alerts on this device.
          </Text>
          <SheetGroup>
            <Pressable
              style={[sheetStyles.toggleRow, { borderBottomColor: tokens.border }]}
              onPress={() => void handleEnableSystemPermission()}
              accessibilityRole="button"
            >
              <View style={sheetStyles.toggleCopy}>
                <Text style={[nativeType.body, { color: tokens.text, fontWeight: "600" }]}>
                  iOS notifications
                </Text>
                <Text style={[nativeType.caption, { color: tokens.textSecondary }]}>
                  {permissionLabel}
                </Text>
              </View>
              <Ionicons
                name={permission === "granted" ? "checkmark-circle" : "chevron-forward"}
                size={20}
                color={permission === "granted" ? tokens.success : tokens.textMuted}
              />
            </Pressable>
          </SheetGroup>
          <SheetGroup>
            <ToggleRow
              title="Quiz reminders"
              sub="Alerts before quizzes and homework deadlines"
              value={prefs.quizReminders}
              onChange={(v) => onToggle("quizReminders", v)}
            />
            <ToggleRow
              title="Announcement alerts"
              sub="Push when instructors post course updates"
              value={prefs.announcementAlerts}
              onChange={(v) => onToggle("announcementAlerts", v)}
            />
            <ToggleRow
              title="Class reminders"
              sub="Local reminders before each class meeting"
              value={prefs.classReminders}
              onChange={(v) => onToggle("classReminders", v)}
              isLast={!prefs.classReminders}
            />
            {prefs.classReminders ? (
              <View style={[sheetStyles.reminderBlock, { borderTopColor: tokens.border }]}>
                <Text style={[nativeType.caption, { color: tokens.textSecondary, marginBottom: 8 }]}>
                  Remind me
                </Text>
                <View style={sheetStyles.reminderOptions}>
                  {REMINDER_OPTIONS.map((opt) => {
                    const active = prefs.classReminderMinutes === opt.minutes
                    return (
                      <Pressable
                        key={opt.minutes}
                        style={[
                          sheetStyles.reminderChip,
                          { backgroundColor: active ? tokens.accent : tokens.native.fill },
                        ]}
                        onPress={() => onSetReminderMinutes(opt.minutes)}
                      >
                        <Text
                          style={[
                            sheetStyles.reminderChipText,
                            { color: active ? "#FFFFFF" : tokens.textSecondary },
                          ]}
                        >
                          {opt.label} before
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            ) : null}
          </SheetGroup>
        </ScrollView>
      </View>
    </Modal>
  )
}

export function requestNotificationPermissionAlert() {
  AppAlert.alert(
    "Notifications disabled",
    "Enable notifications in Settings to receive reminders on this device.",
  )
}

const sheetStyles = StyleSheet.create({
  root: { flex: 1 },
  chrome: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
  },
  chromeContent: {
    zIndex: 1,
  },
  handleWrap: { alignItems: "center", paddingBottom: 6 },
  handle: { width: 36, height: 5, borderRadius: 3 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    minHeight: 40,
  },
  doneBtn: { fontSize: 17, fontWeight: "400", minWidth: 56 },
  title: { ...nativeType.navTitle, flex: 1, textAlign: "center" },
  side: { minWidth: 56, alignItems: "flex-end" },
  saveBtn: { fontSize: 17, fontWeight: "600" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  lead: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  group: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  groupInner: { padding: 14, gap: 8 },
  input: {
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleCopy: { flex: 1, gap: 2 },
  reminderBlock: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reminderOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reminderChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  reminderChipText: { fontSize: 12, fontWeight: "600" },
})
