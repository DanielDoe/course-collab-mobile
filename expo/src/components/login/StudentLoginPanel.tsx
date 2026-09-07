import { useCallback, useEffect, useState } from "react"
import {
  Linking,
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { hexToRgba } from "../../constants/app-themes"
import { Ionicons } from "@/components/icons/AppIcon"
import { AuthFlowEnterItem, AuthFlowPanelTransition } from "../motion/AuthFlowPanelTransition"
import { PressableScale } from "../motion/PressableScale"
import { triggerMotionHaptic } from "../../lib/motion"
import {
  ApiError,
  api,
  type EnrollmentOption,
  type UniversityRecord,
  type UniversityStudentLoginResponse,
} from "../../lib/api"
import {
  clearRememberedStudentCredentials,
  clearRememberedUniversity,
  persistRememberedUniversity,
  readRememberedStudentAuth,
  readRememberedUniversity,
} from "../../lib/remembered-student-auth"
import { useSession } from "../../context/SessionProvider"
import { MfaLoginStep } from "../auth/MfaLoginStep"
import { ErrorBanner, LoginFieldGroup } from "./LoginCard"
import { LoginButton, LoginField, LoginPasswordToggle } from "./LoginButton"
import { LoginBrandHeader } from "./LoginBrandHeader"
import { LoginUniversityPicker } from "./LoginUniversityPicker"
import { LoginPortalStack, type RegisterAuthPanelBack } from "./login-chrome"
import { useLoginTheme } from "./login-theme"
import { parseAccessLifecyclePayload } from "../../lib/access-governance"
import { formatStudentLoginApiError } from "../../lib/student-login-errors"
import { normalizeLoginIdentifier, normalizeLoginPassword } from "../../lib/login-credentials"
import { completeStudentUniversityLogin } from "../../lib/student-login-completion"
import { stashPendingStudentCourseLogin } from "../../lib/student-login-pending"
import { AccessRequestStatusScreen } from "../auth/AccessRequestStatusScreen"
import { parseMfaCompletePayload, parseMfaLoginResponse, type MfaLoginState } from "../../lib/mfa-types"

type Step = "university" | "credentials" | "mfa"
type AuthMode = "login" | "activate"

type Props = {
  onBack?: () => void
  registerPanelBack?: RegisterAuthPanelBack
}

function isCourseSelectionResponse(
  data: UniversityStudentLoginResponse,
): data is Extract<UniversityStudentLoginResponse, { requiresCourseSelection: true }> {
  return "requiresCourseSelection" in data && data.requiresCourseSelection === true
}

export function StudentLoginPanel({ onBack, registerPanelBack }: Props) {
  const { signIn } = useSession()
  const router = useRouter()
  const { LOGIN, loginType } = useLoginTheme()

  const [step, setStep] = useState<Step>("university")
  const [mode, setMode] = useState<AuthMode>("login")

  const [selectedUniversity, setSelectedUniversity] = useState<UniversityRecord | null>(null)

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [activatePassword, setActivatePassword] = useState("")
  const [activateConfirm, setActivateConfirm] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [pendingCredentials, setPendingCredentials] = useState<{
    identifier: string
    password: string
  } | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [mfaState, setMfaState] = useState<MfaLoginState | null>(null)
  const [accessStatus, setAccessStatus] = useState<ReturnType<typeof parseAccessLifecyclePayload>>(null)

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const [uniData, remembered] = await Promise.all([
          api.getUniversities(),
          readRememberedStudentAuth(),
        ])
        if (!mounted) return
        const list = uniData.universities ?? []

        if (remembered?.university) {
          const fresh =
            list.find((u) => u.id === remembered.university.id) ?? remembered.university
          setSelectedUniversity(fresh)
          await persistRememberedUniversity(fresh)
          if (remembered.identifier) setIdentifier(remembered.identifier)
          setRememberMe(Boolean(remembered.rememberMe && remembered.identifier))
          setStep("credentials")
        } else {
          const storedUniversity = await readRememberedUniversity()
          if (storedUniversity) {
            const fresh =
              list.find((u) => u.id === storedUniversity.id) ?? storedUniversity
            setSelectedUniversity(fresh)
            await persistRememberedUniversity(fresh)
            setStep("credentials")
          }
        }
      } catch (err) {
        if (!mounted) return
        setError(err instanceof ApiError ? err.message : "Failed to load universities.")
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  /** Color Hunt link accent; school color only for university row identity. */
  const linkAccent = LOGIN.purple
  const schoolAccent = selectedUniversity?.primary_color ?? linkAccent

  async function finishLogin(data: Extract<UniversityStudentLoginResponse, { student: unknown }>) {
    await completeStudentUniversityLogin({
      data,
      selectedUniversity,
      identifier: pendingCredentials?.identifier ?? identifier,
      password: pendingCredentials?.password ?? password,
      rememberMe,
      signIn,
    })
  }

  function navigateToCourseSelection(
    id: string,
    pw: string,
    enrollmentList: EnrollmentOption[],
  ) {
    if (!selectedUniversity) return
    stashPendingStudentCourseLogin({
      university: selectedUniversity,
      identifier: id,
      password: pw,
      rememberMe,
      enrollments: enrollmentList,
    })
    router.push("/(auth)/student-select-course")
  }

  async function submitLogin(courseId?: number) {
    if (!selectedUniversity) {
      setError("Select your university to continue.")
      return
    }

    const id = normalizeLoginIdentifier(pendingCredentials?.identifier ?? identifier)
    const pw = normalizeLoginPassword(pendingCredentials?.password ?? password)
    if (id !== identifier) setIdentifier(id)
    if (pw !== password) setPassword(pw)

    setSubmitting(true)
    setError("")
    try {
      const data = await api.universityStudentLogin({
        universityId: selectedUniversity.id,
        identifier: id,
        password: pw,
        rememberMe,
        courseId,
      })

      if (isCourseSelectionResponse(data)) {
        navigateToCourseSelection(id, pw, data.enrollments ?? [])
        return
      }

      const mfa = parseMfaLoginResponse(data as Record<string, unknown>)
      if (mfa) {
        setMfaState(mfa)
        setStep("mfa")
        return
      }

      await finishLogin(data)
    } catch (err) {
      if (err instanceof ApiError) {
        const lifecycle = parseAccessLifecyclePayload(err.details)
        if (lifecycle && lifecycle.lifecycle !== "active" && lifecycle.lifecycle !== "not_found") {
          setAccessStatus(lifecycle)
          return
        }
        setError(formatStudentLoginApiError(err.message, err.details))
      } else {
        setError("Login failed. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMfaComplete(payload: Record<string, unknown>) {
    const normalized = parseMfaCompletePayload(payload)
    if (!normalized || !("student" in normalized) || !normalized.student) {
      throw new ApiError("Login failed after verification.", 500)
    }
    await finishLogin(normalized as Extract<UniversityStudentLoginResponse, { student: unknown }>)
  }

  function handleMfaBack() {
    setMfaState(null)
    setStep("credentials")
    setError("")
  }

  const handlePanelBack = useCallback((): boolean => {
    if (accessStatus) {
      setAccessStatus(null)
      return true
    }
    if (step === "mfa" && mfaState) {
      handleMfaBack()
      return true
    }
    if (step === "credentials") {
      setStep("university")
      setError("")
      return true
    }
    return false
  }, [accessStatus, mfaState, step])

  useEffect(() => {
    registerPanelBack?.(handlePanelBack)
    return () => registerPanelBack?.(null)
  }, [handlePanelBack, registerPanelBack])

  async function handleLogin() {
    const id = normalizeLoginIdentifier(identifier)
    const pw = normalizeLoginPassword(password)
    if (!id || !pw) {
      setError("Enter your student ID or email and password.")
      return
    }
    setIdentifier(id)
    setPassword(pw)
    setPendingCredentials(null)
    await submitLogin()
  }

  async function handleActivate() {
    if (!selectedUniversity) {
      setError("Select your university to continue.")
      return
    }
    if (!identifier.trim()) {
      setError("Enter your student ID or university email.")
      return
    }
    if (activatePassword.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (activatePassword !== activateConfirm) {
      setError("Passwords do not match.")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      await api.activateStudentAccount({
        universityId: selectedUniversity.id,
        identifier,
        newPassword: activatePassword,
        confirmPassword: activateConfirm,
      })
      setMode("login")
      setPassword(activatePassword)
      setPendingCredentials({ identifier, password: activatePassword })

      const data = await api.universityStudentLogin({
        universityId: selectedUniversity.id,
        identifier,
        password: activatePassword,
        rememberMe,
      })

      if (isCourseSelectionResponse(data)) {
        navigateToCourseSelection(identifier, activatePassword, data.enrollments ?? [])
        return
      }

      await finishLogin(data)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? formatStudentLoginApiError(err.message, err.details)
          : "Activation failed. Please try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleChangeUniversity() {
    void clearRememberedUniversity()
    setSelectedUniversity(null)
    setStep("university")
    setError("")
    setMode("login")
    setPendingCredentials(null)
  }

  function handleRequestAccess() {
    if (!selectedUniversity) {
      setError("Select your university first.")
      setStep("university")
      return
    }
    router.push({
      pathname: "/(auth)/student-signup",
      params: {
        universityId: String(selectedUniversity.id),
        universityName: selectedUniversity.name,
        universityShortName: selectedUniversity.short_name,
        universityDomain: selectedUniversity.domain ?? "",
        universityColor: selectedUniversity.primary_color ?? "",
      },
    })
  }

  if (step === "university") {
    return (
      <AuthFlowPanelTransition panelKey="student-university">
        <LoginUniversityPicker
          selectedUniversity={selectedUniversity}
          onSelect={setSelectedUniversity}
          onContinue={(university) => {
            setSelectedUniversity(university)
            void persistRememberedUniversity(university)
            setStep("credentials")
          }}
          onBack={onBack}
        />
      </AuthFlowPanelTransition>
    )
  }

  if (accessStatus) {
    return (
      <AccessRequestStatusScreen
        payload={accessStatus}
        portalLabel={selectedUniversity?.short_name ?? "Student"}
        onBack={() => setAccessStatus(null)}
      />
    )
  }

  if (step === "mfa" && mfaState) {
    return (
      <MfaLoginStep
        showChrome={false}
        backLabel="Back to login"
        state={mfaState}
        university={selectedUniversity}
        portalLabel={selectedUniversity?.short_name ?? "CourseCollab"}
        onComplete={(payload) => handleMfaComplete(payload)}
        onBack={handleMfaBack}
      />
    )
  }

  return (
    <AuthFlowPanelTransition panelKey="student-credentials">
    <LoginPortalStack>
      <AuthFlowEnterItem index={0}>
      <LoginBrandHeader
        university={selectedUniversity}
        title={mode === "login" ? "Student Login" : "Activate Account"}
        subtitle={selectedUniversity?.name}
        accent={schoolAccent}
      />
      </AuthFlowEnterItem>

      {error ? (
        <AuthFlowEnterItem index={1}>
          <ErrorBanner message={error} />
        </AuthFlowEnterItem>
      ) : null}

      {mode === "login" ? (
        <>
          <AuthFlowEnterItem index={2}>
          <LoginFieldGroup>
            <LoginField
              label="Student ID or Email"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="e.g. P12345678 or you@school.edu"
              autoCapitalize="none"
              leadingIcon="school-outline"
            />
            <LoginField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              trailing={
                <LoginPasswordToggle
                  visible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                />
              }
            />
          </LoginFieldGroup>
          </AuthFlowEnterItem>

          <AuthFlowEnterItem index={3}>
          <View style={styles.rememberRow}>
            <Switch
              value={rememberMe}
              onValueChange={(next) => {
                triggerMotionHaptic("selection")
                setRememberMe(next)
                if (!next) void clearRememberedStudentCredentials()
              }}
              trackColor={{
                false: LOGIN.separator,
                true: hexToRgba(LOGIN.cta, 0.55),
              }}
              thumbColor={
                Platform.OS === "android"
                  ? rememberMe
                    ? LOGIN.cta
                    : LOGIN.fill
                  : undefined
              }
              ios_backgroundColor={LOGIN.separator}
            />
            <Text style={[loginType.body, { color: LOGIN.secondaryLabel }]}>Remember me</Text>
          </View>
          </AuthFlowEnterItem>

          <AuthFlowEnterItem index={4}>
          <LoginButton
            label="Login"
            onPress={() => void handleLogin()}
            loading={submitting}
          />
          </AuthFlowEnterItem>

          <AuthFlowEnterItem index={5}>
          <PressableScale
            onPress={() =>
              setError("Forgot your password? Ask your instructor to approve a reset, then sign in and set a new password.")
            }
            haptic="selection"
            accessibilityRole="button"
          >
            <Text style={[loginType.link, { color: linkAccent, textAlign: "center" }]}>
              Forgot password?
            </Text>
          </PressableScale>
          </AuthFlowEnterItem>
        </>
      ) : (
        <>
          <AuthFlowEnterItem index={2}>
          <LoginFieldGroup>
            <LoginField
              label="Student ID or University Email"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="From your syllabus or instructor"
              autoCapitalize="none"
              leadingIcon="school-outline"
            />
            <LoginField
              label="Create Password"
              value={activatePassword}
              onChangeText={setActivatePassword}
              placeholder="At least 8 characters"
              secureTextEntry
            />
            <LoginField
              label="Confirm Password"
              value={activateConfirm}
              onChangeText={setActivateConfirm}
              placeholder="Re-enter password"
              secureTextEntry
            />
          </LoginFieldGroup>
          </AuthFlowEnterItem>

          <AuthFlowEnterItem index={3}>
          <LoginButton
            label="Activate & Sign In"
            onPress={() => void handleActivate()}
            loading={submitting}
          />
          </AuthFlowEnterItem>
        </>
      )}

      <View style={styles.actionsGroup}>
        <AuthFlowEnterItem index={6}>
        <PressableScale
          onPress={() => {
            setMode(mode === "login" ? "activate" : "login")
            setError("")
          }}
          haptic="selection"
          style={[
            styles.secondaryCta,
            {
              borderColor: LOGIN.softBorder,
              backgroundColor: LOGIN.soft,
            },
          ]}
          accessibilityRole="button"
        >
          <Text style={[loginType.link, { color: linkAccent, textAlign: "center" }]}>
            {mode === "login" ? "First time? Activate your account" : "Already activated? Sign in"}
          </Text>
        </PressableScale>
        </AuthFlowEnterItem>

        <AuthFlowEnterItem index={7}>
        <PressableScale
          onPress={handleRequestAccess}
          haptic="selection"
          style={[
            styles.secondaryCta,
            {
              borderColor: LOGIN.softBorder,
              backgroundColor: LOGIN.fill,
            },
          ]}
          accessibilityRole="button"
        >
          <Text style={[loginType.link, { color: linkAccent, textAlign: "center" }]}>
            New student? Request course access
          </Text>
        </PressableScale>
        </AuthFlowEnterItem>

        <AuthFlowEnterItem index={8}>
        <PressableScale
          onPress={handleChangeUniversity}
          haptic="selection"
          style={styles.navRow}
          accessibilityRole="button"
        >
          <Text style={[loginType.body, { color: LOGIN.label, flex: 1 }]}>
            Not your school? Change university
          </Text>
          <Ionicons name="chevron-forward" size={18} color={linkAccent} />
        </PressableScale>
        </AuthFlowEnterItem>

        {onBack ? (
          <AuthFlowEnterItem index={9}>
          <PressableScale
            onPress={onBack}
            haptic="selection"
            style={[styles.navRow, styles.navRowBorder, { borderTopColor: LOGIN.separator }]}
            accessibilityRole="button"
          >
            <Text style={[loginType.body, { color: LOGIN.label, flex: 1 }]}>Other sign-in options</Text>
            <Ionicons name="chevron-forward" size={18} color={linkAccent} />
          </PressableScale>
          </AuthFlowEnterItem>
        ) : null}
      </View>

      <AuthFlowEnterItem index={10}>
      <PressableScale
        onPress={() => {
          void Linking.openURL(
            "mailto:support@course-collab.com?subject=Student%20login%20help&body=I%20need%20help%20signing%20in%20to%20CourseCollab.",
          )
        }}
        haptic="selection"
        style={styles.helpBtn}
        accessibilityRole="link"
        accessibilityLabel="Need help? Contact support"
      >
        <Text style={[loginType.info, styles.helpText, { color: linkAccent }]}>
          Need help? Contact support
        </Text>
      </PressableScale>
      </AuthFlowEnterItem>
    </LoginPortalStack>
    </AuthFlowPanelTransition>
  )
}

const styles = StyleSheet.create({
  actionsGroup: { gap: 0, alignSelf: "stretch" },
  secondaryCta: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  navRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  helpBtn: {
    alignSelf: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  helpText: { textAlign: "center", fontWeight: "600" },
})
