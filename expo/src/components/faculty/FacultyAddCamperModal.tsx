import { useEffect, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FACULTY_SUMMER_CAMP_COLOR,
  facultySummerCampActionSoft,
} from "../../lib/faculty-summer-camp-theme"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetTextInput,

} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Props = {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  let out = "Camp"
  for (let i = 0; i < 8; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

export function FacultyAddCamperModal({ visible, onClose, onCreated }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [school, setSchool] = useState("")
  const [password, setPassword] = useState("")
  const [programRole, setProgramRole] = useState<"summer_camper" | "summer_student">("summer_camper")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!visible) {
      setFullName("")
      setEmail("")
      setSchool("")
      setPassword("")
      setProgramRole("summer_camper")
      setError("")
      return
    }
    setPassword(generatePassword())
  }, [visible])

  async function submit() {
    if (!fullName.trim() || !email.trim() || !school.trim() || !password.trim()) {
      setError("Name, email, school, and password are required.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await instructorApi.createSummerCamperAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        school: school.trim(),
        password,
        programRole,
      })
      AppAlert.alert(
        res.autoApproved ? "Camper approved" : "Camper request submitted",
        res.autoApproved
          ? `${fullName.trim()} can sign in now.\n\nEmail: ${email.trim()}\nPassword: ${password}`
          : `${fullName.trim()} was added to the pending queue. Approve from the Requests tab when ready.\n\nTemporary password: ${password}`,
      )
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create camper account.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="Add camper"
          onClose={onClose}
          accentColor={FACULTY_SUMMER_CAMP_COLOR.link}
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FacultySheetNotice
            tone="warning"
            message="Creates a summer camp account request. Share the password with the camper securely. Pending requests appear under the Requests tab."
          />

          <FacultySheetSection label="Camper profile" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Full name">
              <FacultySheetTextInput value={fullName} onChangeText={setFullName} placeholder="Full name" />
            </FacultySheetField>
            <FacultySheetField label="Email">
              <FacultySheetTextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="email@school.edu"
              />
            </FacultySheetField>
            <FacultySheetField label="School / affiliation">
              <FacultySheetTextInput value={school} onChangeText={setSchool} placeholder="School or organization" />
            </FacultySheetField>
            <FacultySheetField label="Temporary password">
              <FacultySheetTextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                placeholder="Temporary password"
              />
            </FacultySheetField>
            <View style={localStyles.roleRow}>
              {(
                [
                  { id: "summer_camper" as const, label: "Camper" },
                  { id: "summer_student" as const, label: "Summer student" },
                ] as const
              ).map((role) => {
                const active = programRole === role.id
                return (
                  <Pressable
                    key={role.id}
                    style={[
                      localStyles.roleChip,
                      {
                        backgroundColor: active ? facultySummerCampActionSoft(tokens) : native.fill,
                        borderColor: active ? FACULTY_SUMMER_CAMP_COLOR.action : native.separator,
                      },
                    ]}
                    onPress={() => setProgramRole(role.id)}
                  >
                    <Text
                      style={[
                        type.caption,
                        { color: native.secondaryLabel, fontWeight: "700" },
                        active && { color: FACULTY_SUMMER_CAMP_COLOR.action },
                      ]}
                    >
                      {role.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </FacultySheetSection>

          {error ? <Text style={collabSheetStyles.errorText}>{error}</Text> : null}

          <Pressable
            style={[localStyles.submitBtn, { backgroundColor: FACULTY_SUMMER_CAMP_COLOR.action }]}
            disabled={submitting}
            onPress={() => void submit()}
          >
            {submitting ? (
              <ActivityIndicator color={FACULTY_SUMMER_CAMP_COLOR.actionInk} />
            ) : (
              <Text style={localStyles.submitText}>Create camper account</Text>
            )}
          </Pressable>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  roleRow: { flexDirection: "row", gap: 8 },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  submitBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: "#ffffff", fontWeight: "600", fontSize: 16 },
})
