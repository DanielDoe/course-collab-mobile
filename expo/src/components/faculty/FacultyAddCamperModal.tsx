import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FACULTY_SUMMER_CAMP_COLOR,
  facultySummerCampActionSoft,
} from "../../lib/faculty-summer-camp-theme"
import {
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetModal,
  FacultySheetNotice,
  FacultySheetSection,
  sheetPlaceholderColor,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Props = {
  visible: boolean
  scope: { instructorId: number; courseId?: number } | null
  campId?: number | null
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

export function FacultyAddCamperModal({ visible, scope, campId, onClose, onCreated }: Props) {
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
  const fullNameRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const schoolRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const syncedRef = useRef({ fullName: "", email: "", school: "", password: "" })

  useEffect(() => {
    if (!visible) {
      setFullName("")
      setEmail("")
      setSchool("")
      setPassword("")
      setProgramRole("summer_camper")
      setError("")
      syncedRef.current = { fullName: "", email: "", school: "", password: "" }
      return
    }
    const generated = generatePassword()
    setPassword(generated)
    syncedRef.current.password = generated
  }, [visible])

  async function flushFields() {
    Keyboard.dismiss()
    for (const ref of [fullNameRef, emailRef, schoolRef, passwordRef]) {
      ref.current?.blur()
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }

  async function submit() {
    if (!scope) {
      setError("Select a course before adding campers.")
      return
    }
    await flushFields()

    const name = (syncedRef.current.fullName || fullName).trim()
    const mail = (syncedRef.current.email || email).trim()
    const org = (syncedRef.current.school || school).trim()
    const pass = (syncedRef.current.password || password).trim()

    if (!name || !mail || !org || !pass) {
      setError("Name, email, school, and password are required.")
      return
    }
    if (pass.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await instructorApi.createSummerCamperAccount(scope, {
        fullName: name,
        email: mail,
        school: org,
        password: pass,
        programRole,
        campId: campId ?? undefined,
      })
      AppAlert.alert(
        res.autoApproved ? "Camper approved" : "Camper request submitted",
        res.autoApproved
          ? `${name} can sign in now. Share the temporary password securely (not shown again).`
          : `${name} was added to the pending queue. Approve from the Requests tab when ready.`,
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
    <FacultySheetModal visible={visible} onRequestClose={onClose}>
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

        <FacultySheetSection key={visible ? "camper-form-open" : "camper-form-closed"} label="Camper profile" tone={SHEET_SECTION.edit}>
          <FacultySheetField label="Full name">
            <TextInput
              ref={fullNameRef}
              style={collabSheetStyles.fieldInput}
              value={fullName}
              onChangeText={(v) => {
                syncedRef.current.fullName = v
                setFullName(v)
                if (error) setError("")
              }}
              onEndEditing={(e) => {
                const t = e.nativeEvent.text ?? ""
                syncedRef.current.fullName = t
                setFullName(t)
              }}
              placeholder="Full name"
              accessibilityLabel="Full name"
              placeholderTextColor={sheetPlaceholderColor}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </FacultySheetField>
          <FacultySheetField label="Email">
            <TextInput
              ref={emailRef}
              style={collabSheetStyles.fieldInput}
              value={email}
              onChangeText={(v) => {
                syncedRef.current.email = v
                setEmail(v)
                if (error) setError("")
              }}
              onEndEditing={(e) => {
                const t = e.nativeEvent.text ?? ""
                syncedRef.current.email = t
                setEmail(t)
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="email@school.edu"
              accessibilityLabel="Email"
              placeholderTextColor={sheetPlaceholderColor}
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => schoolRef.current?.focus()}
            />
          </FacultySheetField>
          <FacultySheetField label="School / affiliation">
            <TextInput
              ref={schoolRef}
              style={collabSheetStyles.fieldInput}
              value={school}
              onChangeText={(v) => {
                syncedRef.current.school = v
                setSchool(v)
                if (error) setError("")
              }}
              onEndEditing={(e) => {
                const t = e.nativeEvent.text ?? ""
                syncedRef.current.school = t
                setSchool(t)
              }}
              placeholder="School or organization"
              accessibilityLabel="School / affiliation"
              placeholderTextColor={sheetPlaceholderColor}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </FacultySheetField>
          <FacultySheetField label="Temporary password">
            <TextInput
              ref={passwordRef}
              style={collabSheetStyles.fieldInput}
              value={password}
              onChangeText={(v) => {
                syncedRef.current.password = v
                setPassword(v)
                if (error) setError("")
              }}
              onEndEditing={(e) => {
                const t = e.nativeEvent.text ?? ""
                syncedRef.current.password = t
                setPassword(t)
              }}
              autoCapitalize="none"
              placeholder="Temporary password"
              accessibilityLabel="Temporary password"
              placeholderTextColor={sheetPlaceholderColor}
              autoCorrect={false}
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={role.label}
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
          accessibilityRole="button"
          accessibilityLabel="Create camper account"
          onPress={() => void submit()}
        >
          {submitting ? (
            <ActivityIndicator color={FACULTY_SUMMER_CAMP_COLOR.actionInk} />
          ) : (
            <Text style={localStyles.submitText}>Create camper account</Text>
          )}
        </Pressable>
      </ScrollView>
    </FacultySheetModal>
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
