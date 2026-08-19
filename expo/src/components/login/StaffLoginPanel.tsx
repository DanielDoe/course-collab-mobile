import { useEffect, useState } from "react"
import { Platform, StyleSheet, Switch, Text, View } from "react-native"
import { hexToRgba } from "../../constants/app-themes"
import { ApiError, api } from "../../lib/api"
import { parseAccessLifecyclePayload } from "../../lib/access-governance"
import { parseMfaCompletePayload, parseMfaLoginResponse, type MfaLoginState } from "../../lib/mfa-types"
import { persistMfaDeviceTrustFromLogin, instructorMfaLoginKey, instructorMfaAliasKeys } from "../../lib/mfa-device-trust"
import {
  clearRememberedFacultyCredentials,
  persistRememberedFacultyCredentials,
  readRememberedFacultyCredentials,
} from "../../lib/remembered-faculty-auth"
import { stashPendingLoginPassword } from "../../lib/pending-login-password"
import { useSession } from "../../context/SessionProvider"
import { MfaLoginStep } from "../auth/MfaLoginStep"
import { ErrorBanner, LoginFieldGroup } from "./LoginCard"
import { LoginButton, LoginField, LoginPasswordToggle } from "./LoginButton"
import { LoginBackLink, LoginPortalHeader, LoginPortalStack } from "./login-chrome"
import { AccessRequestStatusScreen } from "../auth/AccessRequestStatusScreen"
import { useLoginTheme } from "./login-theme"

type Props = {
  onBack?: () => void
}

export function StaffLoginPanel({ onBack }: Props) {
  const { signIn } = useSession()
  const { LOGIN, loginType } = useLoginTheme()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [mfaState, setMfaState] = useState<MfaLoginState | null>(null)
  const [accessStatus, setAccessStatus] = useState<ReturnType<typeof parseAccessLifecyclePayload>>(null)

  useEffect(() => {
    let mounted = true
    void (async () => {
      const remembered = await readRememberedFacultyCredentials()
      if (!mounted || !remembered) return
      if (remembered.username) setUsername(remembered.username)
      setRememberMe(Boolean(remembered.rememberMe && remembered.username))
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function finishStaffLogin(data: Record<string, unknown>, loginPassword?: string) {
    const normalized = parseMfaCompletePayload(data) ?? data
    const instructor = (normalized.faculty ?? normalized.instructor) as
      | {
          id: number
          username: string
          name?: string
          email?: string
          role?: string
          requiresPasswordChange?: boolean
          hasChangedPassword?: boolean
        }
      | undefined
    if (!instructor) throw new ApiError("Login failed", 500)

    const authId = username.trim()
    if (authId) {
      await persistMfaDeviceTrustFromLogin({
        userType: "instructor",
        loginKey: instructorMfaLoginKey(authId),
        payload: normalized,
        aliasKeys: instructorMfaAliasKeys(authId, instructor),
      })
    }

    await persistRememberedFacultyCredentials({
      username: authId || instructor.username,
      rememberMe,
    })

    const requiresPasswordChange = Boolean(
      instructor.requiresPasswordChange || instructor.hasChangedPassword === false,
    )
    if (requiresPasswordChange && loginPassword) {
      stashPendingLoginPassword(loginPassword)
    }

    await signIn({
      portal: "faculty",
      id: Number(instructor.id),
      username: instructor.username,
      name: instructor.name ?? instructor.username,
      email: instructor.email,
      role: instructor.role,
      authIdentifier: authId || instructor.username,
      requiresPasswordChange,
    })
  }

  async function handleSubmit() {
    setError("")
    if (!username.trim() || !password) {
      setError("Enter your username and password.")
      return
    }

    setSubmitting(true)
    try {
      const data = (await api.instructorLogin(username, password)) as Record<string, unknown>
      const mfa = parseMfaLoginResponse(data)
      if (mfa) {
        setMfaState(mfa)
        return
      }
      await finishStaffLogin(data, password)
    } catch (err) {
      if (err instanceof ApiError) {
        const lifecycle = parseAccessLifecyclePayload(err.details)
        if (lifecycle && lifecycle.lifecycle !== "active" && lifecycle.lifecycle !== "not_found") {
          setAccessStatus(lifecycle)
          return
        }
        setError(err.message)
      } else {
        setError("Login failed. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (accessStatus) {
    return (
      <AccessRequestStatusScreen
        payload={accessStatus}
        portalLabel="Faculty"
        onBack={() => setAccessStatus(null)}
      />
    )
  }

  if (mfaState) {
    return (
      <MfaLoginStep
        showChrome={false}
        backLabel="Back to login"
        state={mfaState}
        portalLabel="CourseCollab Faculty"
        onComplete={(payload) => finishStaffLogin(payload, password)}
        onBack={() => {
          setMfaState(null)
          setError("")
        }}
      />
    )
  }

  return (
    <LoginPortalStack>
      <LoginPortalHeader portal="faculty" />

      {error ? <ErrorBanner message={error} /> : null}

      <LoginFieldGroup>
        <LoginField
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your username"
          autoCapitalize="none"
          grouped
        />
        <LoginField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry={!showPassword}
          grouped
          last
          trailing={<LoginPasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
        />
      </LoginFieldGroup>

      <View style={styles.rememberRow}>
        <Switch
          value={rememberMe}
          onValueChange={(next) => {
            setRememberMe(next)
            if (!next) void clearRememberedFacultyCredentials()
          }}
          trackColor={{
            false: LOGIN.separator,
            true: hexToRgba(LOGIN.cta, 0.55),
          }}
          thumbColor={
            Platform.OS === "android" ? (rememberMe ? LOGIN.cta : LOGIN.fill) : undefined
          }
          ios_backgroundColor={LOGIN.separator}
        />
        <Text style={[loginType.body, { color: LOGIN.secondaryLabel }]}>Remember me</Text>
      </View>

      <LoginButton label="Continue to dashboard" onPress={() => void handleSubmit()} loading={submitting} />

      {onBack ? <LoginBackLink label="Other sign-in options" onPress={onBack} /> : null}
    </LoginPortalStack>
  )
}

const styles = StyleSheet.create({
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
})
