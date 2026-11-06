import { useEffect, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { AuthKeyboardShell } from "../motion/AuthKeyboardShell"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import {
  clearPendingLoginPassword,
  peekPendingLoginPassword,
} from "../../lib/pending-login-password"
import { resolvePostLoginRoute } from "../../lib/onboarding"
import { studentApi } from "../../lib/student-api"
import { advanceAuthOnboarding, navigatePostSignIn, replaceAuthRoute } from "../../lib/navigation-reset"
import { AUTH_FORM_PHONE_MAX_WIDTH } from "../../lib/responsive-layout"
import { AuthFlowScroll } from "./AuthFlowScroll"
import type { FacultySession, StudentSession } from "../../lib/session"
import { ErrorBanner, LoginFieldGroup } from "./LoginCard"
import { LoginButton, LoginField, LoginPasswordToggle } from "./LoginButton"
import { LoginPortalHeader, LoginPortalStack } from "./login-chrome"
import { useLoginTheme } from "./login-theme"

function validateNewPassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters."
  if (!/\d/.test(password)) return "Password must include at least one number."
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must include at least one special character."
  }
  return null
}

export function FirstLoginChangePasswordScreen() {
  const router = useRouter()
  const { session, signIn } = useSession()
  const { LOGIN, loginType } = useLoginTheme()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")

  useEffect(() => {
    if (!session) {
      replaceAuthRoute(router, "/login")
      return
    }
    const requiresPasswordChange = "requiresPasswordChange" in session && session.requiresPasswordChange === true
    if (!requiresPasswordChange) {
      void (async () => {
        navigatePostSignIn(router, await resolvePostLoginRoute(session))
      })()
      return
    }
    const stashed = peekPendingLoginPassword()
    if (stashed) setCurrentPassword(stashed)
  }, [router, session])

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: LOGIN.canvas,
        },
        lead: {
          ...loginType.body,
          color: LOGIN.secondaryLabel,
          marginBottom: 4,
        },
      }),
    [LOGIN, loginType.body],
  )

  async function continueAfterChange(nextSession: FacultySession | StudentSession) {
    clearPendingLoginPassword()
    advanceAuthOnboarding(router, await resolvePostLoginRoute(nextSession))
  }

  async function handleSubmit() {
    if (!session || (session.portal !== "faculty" && session.portal !== "student")) {
      setError("Sign in again to change your password.")
      return
    }
    setError("")
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Fill in all password fields.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.")
      return
    }
    const strength = validateNewPassword(newPassword)
    if (strength) {
      setError(strength)
      return
    }

    setSubmitting(true)
    try {
      if (session.portal === "faculty") {
        await instructorApi.changePassword(session.id, currentPassword, newPassword)
        const next: FacultySession = { ...session, requiresPasswordChange: false }
        const { expiresAt: _, ...payload } = next
        await signIn(payload)
        await continueAfterChange(next)
        return
      }

      await studentApi.changePassword(session, currentPassword, newPassword)
      const next: StudentSession = { ...session, requiresPasswordChange: false }
      const { expiresAt: _, ...payload } = next
      await signIn(payload)
      await continueAfterChange(next)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update password.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!session || (session.portal !== "faculty" && session.portal !== "student")) {
    return <View style={styles.root} />
  }

  return (
    <AuthKeyboardShell style={styles.root}>
      <AuthFlowScroll phoneMax={AUTH_FORM_PHONE_MAX_WIDTH}>
        <LoginPortalStack>
          <LoginPortalHeader portal={session.portal === "faculty" ? "faculty" : "student"} />
          <Text style={styles.lead}>
            First sign-in: choose a new password, then continue to your dashboard. Two-factor
            authentication is not required for this account.
          </Text>

          {error ? <ErrorBanner message={error} /> : null}

          <LoginFieldGroup>
            <LoginField
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Temporary password"
              secureTextEntry={!showCurrent}
              grouped
              trailing={
                <LoginPasswordToggle visible={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
              }
            />
            <LoginField
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 8 characters"
              secureTextEntry={!showNew}
              grouped
              trailing={
                <LoginPasswordToggle visible={showNew} onToggle={() => setShowNew((v) => !v)} />
              }
            />
            <LoginField
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              secureTextEntry={!showNew}
              grouped
              last
            />
          </LoginFieldGroup>

          <LoginButton
            label="Save password & continue"
            onPress={() => void handleSubmit()}
            loading={submitting}
          />
        </LoginPortalStack>
      </AuthFlowScroll>
    </AuthKeyboardShell>
  )
}
