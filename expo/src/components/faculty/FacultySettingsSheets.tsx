import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NativeSwitch } from "../NativeSwitch"
import { NATIVE } from "../../constants/faculty-native-theme"
import type { FacultyNotificationPrefs } from "../../lib/faculty-settings-preferences"
import {
  FACULTY_TITLE_OPTIONS,
  type FacultyTitle,
} from "../../lib/faculty-profile-preferences"
import { FACULTY_SETTINGS_COLOR } from "../../lib/faculty-settings-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NativeSelect } from "../NativeSelect"
import { MfaSecurityCard } from "../settings/MfaSecurityCard"
import {
  FacultySheetChrome,
  FacultySheetContainer,
  FacultySheetField,
  FacultySheetSaveAction,
  FacultySheetTextInput,
  useCollabSheetStyles,
} from "./faculty-collab-sheet-ui"

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  const { native, type } = useModuleTheme()
  return (
    <View style={[sheetStyles.readRow, { borderBottomColor: native.separator }]}>
      <Text style={[type.caption, { color: native.secondaryLabel }]}>{label}</Text>
      <Text style={[type.bodyEmphasis, { color: native.label, flex: 1, textAlign: "right" }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
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
  const { native, type } = useModuleTheme()
  return (
    <View style={[sheetStyles.toggleRow, !isLast && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={sheetStyles.toggleCopy}>
        <Text style={[type.bodyEmphasis, { color: native.label }]}>{title}</Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>{sub}</Text>
      </View>
      <NativeSwitch value={value} onValueChange={onChange} activeTrackColor={FACULTY_SETTINGS_COLOR.primary} />
    </View>
  )
}

type ProfileSheetProps = {
  visible: boolean
  name: string
  username: string
  email: string
  title: FacultyTitle
  roleLabel: string
  memberSince: string
  lastLogin: string
  saving: boolean
  onChangeName: (v: string) => void
  onChangeUsername: (v: string) => void
  onChangeEmail: (v: string) => void
  onChangeTitle: (v: FacultyTitle) => void
  onSave: () => void
  onClose: () => void
}

export function FacultyProfileSettingsSheet({
  visible,
  name,
  username,
  email,
  title,
  roleLabel,
  memberSince,
  lastLogin,
  saving,
  onChangeName,
  onChangeUsername,
  onChangeEmail,
  onChangeTitle,
  onSave,
  onClose,
}: ProfileSheetProps) {
  const insets = useSafeAreaInsets()
  const collabSheetStyles = useCollabSheetStyles()
  const { native, type } = useModuleTheme()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Edit profile" onClose={onClose} accentColor={FACULTY_SETTINGS_COLOR.primary} />
        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20, marginBottom: 4 }]}>
            Update how your name and contact details appear across CourseCollab, including Cora Copilot greetings.
          </Text>
          <View style={[sheetStyles.group, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
            <ReadOnlyRow label="Role" value={roleLabel} />
            <ReadOnlyRow label="Member since" value={memberSince} />
            <ReadOnlyRow label="Last login" value={lastLogin} />
          </View>
          <FacultySheetField label="Title">
            <NativeSelect
              placeholder="Choose a title"
              sheetTitle="Professional title"
              value={title}
              options={FACULTY_TITLE_OPTIONS}
              onChange={onChangeTitle}
              variant="grouped"
            />
          </FacultySheetField>
          <FacultySheetField label="Display name">
            <FacultySheetTextInput value={name} onChangeText={onChangeName} placeholder="Your name" autoCapitalize="words" />
          </FacultySheetField>
          <FacultySheetField label="Username">
            <FacultySheetTextInput
              value={username}
              onChangeText={onChangeUsername}
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FacultySheetField>
          <FacultySheetField label="Email">
            <FacultySheetTextInput
              value={email}
              onChangeText={onChangeEmail}
              placeholder="you@university.edu"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </FacultySheetField>
          <FacultySheetSaveAction label="Save profile" saving={saving} onPress={onSave} />
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

type SecuritySheetProps = {
  visible: boolean
  instructorId: number
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

export function FacultySecuritySettingsSheet({
  visible,
  instructorId,
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
  const collabSheetStyles = useCollabSheetStyles()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Password & security" onClose={onClose} />
        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <MfaSecurityCard userType="instructor" userId={instructorId} variant="faculty" />
          <FacultySheetField label="Current password">
            <FacultySheetTextInput
              value={currentPassword}
              onChangeText={onChangeCurrent}
              placeholder="Current password"
              secureTextEntry
              autoCapitalize="none"
            />
          </FacultySheetField>
          <FacultySheetField label="New password">
            <FacultySheetTextInput
              value={newPassword}
              onChangeText={onChangeNew}
              placeholder="At least 8 characters, 1 number, 1 symbol"
              secureTextEntry
              autoCapitalize="none"
            />
          </FacultySheetField>
          <FacultySheetField label="Confirm new password">
            <FacultySheetTextInput
              value={confirmPassword}
              onChangeText={onChangeConfirm}
              placeholder="Re-enter new password"
              secureTextEntry
              autoCapitalize="none"
            />
          </FacultySheetField>
          <FacultySheetSaveAction label="Change password" saving={saving} onPress={onSave} />
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

type NotificationSheetProps = {
  visible: boolean
  prefs: FacultyNotificationPrefs
  onToggle: (key: keyof FacultyNotificationPrefs, enabled: boolean) => void
  onClose: () => void
}

export function FacultyNotificationSettingsSheet({ visible, prefs, onToggle, onClose }: NotificationSheetProps) {
  const insets = useSafeAreaInsets()
  const collabSheetStyles = useCollabSheetStyles()
  const { native, type } = useModuleTheme()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Notifications" onClose={onClose} accentColor={FACULTY_SETTINGS_COLOR.secondary} />
        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20, marginBottom: 8 }]}>
            Choose which alerts you receive on this device.
          </Text>
          <View style={[sheetStyles.group, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
            <ToggleRow
              title="Submission & issue alerts"
              sub="Notify when students report submission problems"
              value={prefs.submissionAlerts}
              onChange={(v) => onToggle("submissionAlerts", v)}
            />
            <ToggleRow
              title="Office hours requests"
              sub="New booking requests from students"
              value={prefs.officeHoursAlerts}
              onChange={(v) => onToggle("officeHoursAlerts", v)}
            />
            <ToggleRow
              title="Classroom points"
              sub="Pending point submissions awaiting review"
              value={prefs.classroomPointsAlerts}
              onChange={(v) => onToggle("classroomPointsAlerts", v)}
            />
            <ToggleRow
              title="Student messages"
              sub="Support tickets and discussion replies"
              value={prefs.studentMessageAlerts}
              onChange={(v) => onToggle("studentMessageAlerts", v)}
              isLast
            />
          </View>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const sheetStyles = StyleSheet.create({
  group: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 16,
  },
  readRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleCopy: { flex: 1, gap: 2 },
})
