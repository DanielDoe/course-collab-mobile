import { useCallback, useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { ApiError, api } from "../../lib/api"
import { parseAccessLifecyclePayload } from "../../lib/access-governance"
import { useSession } from "../../context/SessionProvider"
import { parseMfaCompletePayload, parseMfaLoginResponse, type MfaLoginState } from "../../lib/mfa-types"
import { persistMfaDeviceTrustFromLogin, studentMfaLoginKey } from "../../lib/mfa-device-trust"
import { MfaLoginStep } from "../auth/MfaLoginStep"
import { AccessRequestStatusScreen } from "../auth/AccessRequestStatusScreen"
import { ErrorBanner, InfoBanner, LoginFieldGroup } from "./LoginCard"
import { LoginButton, LoginField, LoginPasswordToggle } from "./LoginButton"
import { LoginAltActions, LoginPortalHeader, LoginPortalStack, type RegisterAuthPanelBack } from "./login-chrome"
import { useLoginTheme } from "./login-theme"

type Props = {
  onBack?: () => void
  registerPanelBack?: RegisterAuthPanelBack
}

type AuthTab = "login" | "register"

export function SummerLoginPanel({ onBack, registerPanelBack }: Props) {
  const { signIn } = useSession()
  const { LOGIN, loginType } = useLoginTheme()

  const [tab, setTab] = useState<AuthTab>("login")
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [school, setSchool] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [mfaState, setMfaState] = useState<MfaLoginState | null>(null)
  const [accessStatus, setAccessStatus] = useState<ReturnType<typeof parseAccessLifecyclePayload>>(null)

  const handlePanelBack = useCallback((): boolean => {
    if (accessStatus) {
      setAccessStatus(null)
      return true
    }
    if (mfaState) {
      setMfaState(null)
      return true
    }
    if (tab === "register") {
      setTab("login")
      setError("")
      setSuccess("")
      return true
    }
    return false
  }, [accessStatus, mfaState, tab])

  useEffect(() => {
    registerPanelBack?.(handlePanelBack)
    return () => registerPanelBack?.(null)
  }, [handlePanelBack, registerPanelBack])

  async function finishSummerLogin(data: Record<string, unknown>) {
    const normalized = parseMfaCompletePayload(data) ?? data
    const student = normalized.student as
      | {
          id: number
          student_id: string
          full_name: string
          email?: string
          student_program_role?: string
        }
      | undefined
    if (!student) throw new ApiError("Login failed", 500)

    const authId = email.trim().toLowerCase()
    await persistMfaDeviceTrustFromLogin({
      userType: "student",
      loginKey: studentMfaLoginKey(0, authId),
      payload: normalized,
    })

    await signIn({
      portal: "summer",
      id: String(student.student_id),
      name: String(student.full_name),
      databaseId: String(student.id),
      email: authId,
      studentProgramRole: String(student.student_program_role ?? "summer_student"),
    })
  }

  async function handleLogin() {
    setError("")
    setSuccess("")
    if (!email.trim().includes("@")) {
      setError("Enter a valid camp email.")
      return
    }
    if (!password) {
      setError("Enter your password.")
      return
    }

    setSubmitting(true)
    try {
      const data = (await api.summerLogin(email, password)) as Record<string, unknown>
      const mfa = parseMfaLoginResponse(data)
      if (mfa) {
        setMfaState(mfa)
        return
      }
      await finishSummerLogin(data)
    } catch (err) {
      if (err instanceof ApiError) {
        const lifecycle = parseAccessLifecyclePayload(err.details)
        if (lifecycle && lifecycle.lifecycle !== "active" && lifecycle.lifecycle !== "not_found") {
          setAccessStatus(lifecycle)
          return
        }
        setError(err.message)
      } else {
        setError("Sign in failed. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegister() {
    setError("")
    setSuccess("")
    if (!fullName.trim() || !email.trim().includes("@") || !school.trim()) {
      setError("Enter your name, school, and a valid email.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setSubmitting(true)
    try {
      const result = await api.requestSummerAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        school: school.trim(),
        password,
        confirmPassword,
      })

      if (result.autoApproved) {
        const loginData = (await api.summerLogin(email, password)) as Record<string, unknown>
        const mfa = parseMfaLoginResponse(loginData)
        if (mfa) {
          setMfaState(mfa)
          return
        }
        await finishSummerLogin(loginData)
        return
      }

      setAccessStatus({
        lifecycle: "pending_email_verification",
        accountType: "summer_student",
        request: {
          fullName: fullName.trim(),
          email: email.trim(),
          organization: school.trim(),
        },
      })
      setSuccess(result.message ?? "Request submitted.")
      setTab("login")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit camp account request.")
    } finally {
      setSubmitting(false)
    }
  }

  if (accessStatus) {
    return (
      <AccessRequestStatusScreen
        payload={accessStatus}
        portalLabel="Summer Camp"
        onBack={() => setAccessStatus(null)}
      />
    )
  }

  if (mfaState) {
    return (
      <MfaLoginStep
        state={mfaState}
        portalLabel="Summer Camp"
        backLabel="Back to Summer Camp sign in"
        onComplete={(payload) => finishSummerLogin(payload)}
        onBack={() => setMfaState(null)}
      />
    )
  }

  return (
    <LoginPortalStack>
      <LoginPortalHeader portal="summer" />

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, tab === "login" && { backgroundColor: LOGIN.gold, borderColor: LOGIN.gold }]}
          onPress={() => {
            setTab("login")
            setError("")
            setSuccess("")
          }}
        >
          <Text style={[styles.tabText, tab === "login" && { color: LOGIN.purpleDark }]}>Sign in</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === "register" && { backgroundColor: LOGIN.gold, borderColor: LOGIN.gold }]}
          onPress={() => {
            setTab("register")
            setError("")
            setSuccess("")
          }}
        >
          <Text style={[styles.tabText, tab === "register" && { color: LOGIN.purpleDark }]}>Request account</Text>
        </Pressable>
      </View>

      {tab === "login" ? (
        <>
          <InfoBanner>
            Sign in with the camp email and password from your welcome message.
          </InfoBanner>
          <LoginFieldGroup>
            <LoginField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="camper@school.edu"
              autoCapitalize="none"
              keyboardType="email-address"
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
        </>
      ) : (
        <>
          <InfoBanner>
            New campers can request access here. Verify your email, then wait for camp faculty approval if required.
          </InfoBanner>
          <LoginFieldGroup>
            <LoginField
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="First Last"
              grouped
            />
            <LoginField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="camper@school.edu"
              autoCapitalize="none"
              keyboardType="email-address"
              grouped
            />
            <LoginField
              label="School"
              value={school}
              onChangeText={setSchool}
              placeholder="Your school or organization"
              grouped
            />
            <LoginField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry={!showPassword}
              grouped
              trailing={<LoginPasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
            />
            <LoginField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              secureTextEntry={!showPassword}
              grouped
              last
            />
          </LoginFieldGroup>
        </>
      )}

      {error ? <ErrorBanner message={error} /> : null}
      {success ? (
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel, textAlign: "center" }]}>{success}</Text>
      ) : null}

      <LoginButton
        label={tab === "login" ? "Sign in" : "Submit request"}
        onPress={() => void (tab === "login" ? handleLogin() : handleRegister())}
        loading={submitting}
      />

      <LoginAltActions
        actions={[onBack ? { label: "Other sign-in options", onPress: onBack } : null]}
      />
    </LoginPortalStack>
  )
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(88, 44, 131, 0.18)",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#582c83",
  },
})
