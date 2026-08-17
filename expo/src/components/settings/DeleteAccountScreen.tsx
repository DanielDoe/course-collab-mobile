import { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import { AppAlert } from "../../lib/app-alert"
import { ApiError } from "../../lib/api"
import { canDeleteAccount, requestAccountDeletion } from "../../lib/account-deletion-api"
import { ACCOUNT_DELETION_CONFIRM_PHRASE } from "../../config/legal"
import { AUTH_CONFIG } from "../../config/auth"
import { unregisterPushTokenForSession } from "../../lib/notifications/push-registration"

export function DeleteAccountScreen() {
  const router = useRouter()
  const { session, signOut } = useSession()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const [password, setPassword] = useState("")
  const [confirmPhrase, setConfirmPhrase] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const canDelete = useMemo(() => canDeleteAccount(session), [session])

  async function handleContinue() {
    if (!session || !canDelete) return
    setError("")

    if (!password.trim()) {
      AppAlert.alert("Password required", "Enter your current password to continue.")
      return
    }
    if (confirmPhrase.trim() !== ACCOUNT_DELETION_CONFIRM_PHRASE) {
      AppAlert.alert(
        "Confirmation required",
        `Type ${ACCOUNT_DELETION_CONFIRM_PHRASE} in the confirmation field to proceed.`,
      )
      return
    }

    AppAlert.alert(
      "Delete account permanently?",
      "Deleting your CourseCollab account will permanently remove or anonymize eligible personal information associated with your account. Some institutional academic records may be retained where required.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => {
            void submitDeletion()
          },
        },
      ],
    )
  }

  async function submitDeletion() {
    if (!session || !canDelete) return
    setSubmitting(true)
    setError("")
    try {
      const result = await requestAccountDeletion(session, {
        password,
        confirmPhrase: ACCOUNT_DELETION_CONFIRM_PHRASE,
      })
      if (!result.success) {
        setError(result.message ?? "CourseCollab did not confirm account deletion. Try again or contact support.")
        return
      }
      const sessionKey = `${session.portal}:${session.portal === "faculty" || session.portal === "admin" ? session.id : session.databaseId}`
      await unregisterPushTokenForSession(sessionKey)
      await signOut()
      AppAlert.alert(
        "Account deleted",
        result.message ??
          "Your account deletion request was processed. You have been signed out.",
        [{ text: "OK", onPress: () => router.replace("/login") }],
      )
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not delete your account. If this continues, contact support."
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!canDelete || !session) {
    return (
      <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
        <NotetakerScreenHeader title="Delete Account" fallbackHref="/settings/privacy-security" />
        <ModuleScreen error="Account deletion is not available for this account type." disableTopInsetAdjustment>
          <View />
        </ModuleScreen>
      </View>
    )
  }

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Delete Account" fallbackHref="/settings/privacy-security" />
      <ModuleScreen loading={submitting} error={error} disableTopInsetAdjustment>
        <View style={[styles.hero, { backgroundColor: `${tokens.danger}12`, borderColor: `${tokens.danger}33` }]}>
          <Ionicons name="warning-outline" size={22} color={tokens.danger} />
          <Text style={[type.body, styles.heroText, { color: native.label }]}>
            Deleting your CourseCollab account will permanently remove or anonymize eligible personal information
            associated with your account. Course records owned by your institution may be retained according to academic
            policy.
          </Text>
        </View>

        <Text style={[type.sectionHeader, styles.fieldLabel, { color: native.secondaryLabel }]}>Current password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Enter your password"
          placeholderTextColor={native.tertiaryLabel}
          style={[
            styles.input,
            { color: native.label, borderColor: native.separator, backgroundColor: native.secondaryGrouped },
          ]}
        />

        <Text style={[type.sectionHeader, styles.fieldLabel, { color: native.secondaryLabel }]}>
          Type {ACCOUNT_DELETION_CONFIRM_PHRASE} to confirm
        </Text>
        <TextInput
          value={confirmPhrase}
          onChangeText={setConfirmPhrase}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={ACCOUNT_DELETION_CONFIRM_PHRASE}
          placeholderTextColor={native.tertiaryLabel}
          style={[
            styles.input,
            { color: native.label, borderColor: native.separator, backgroundColor: native.secondaryGrouped },
          ]}
        />

        <Text style={[type.footnote, styles.hint, { color: native.tertiaryLabel }]}>
          Password must be at least {AUTH_CONFIG.minimumPasswordLength} characters. Reauthentication is required before
          deletion.
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={[styles.secondaryBtn, { borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}
            onPress={() => router.back()}
            disabled={submitting}
          >
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: tokens.danger }]}
            onPress={() => void handleContinue()}
            disabled={submitting}
          >
            <Text style={[type.bodyEmphasis, { color: "#fff" }]}>Continue</Text>
          </Pressable>
        </View>
      </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  hero: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  heroText: { flex: 1, lineHeight: 21 },
  fieldLabel: { marginBottom: 8, paddingHorizontal: 2 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  hint: { marginBottom: 20, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 12 },
  secondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: NATIVE.sectionRadius,
  },
})
