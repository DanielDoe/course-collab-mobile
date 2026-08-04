import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native"
import { hexToRgba } from "../../constants/app-themes"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
  ApiError,
  api,
  type EnrollmentOption,
  type UniversityRecord,
  type UniversityStudentLoginResponse,
} from "../../lib/api"
import { primeMembershipTierCache } from "../../lib/membership-tier-cache"
import { universityLogoUri } from "../../lib/university-logo-uri"
import {
  clearRememberedStudentCredentials,
  clearRememberedUniversity,
  persistRememberedStudentAuth,
  persistRememberedUniversity,
  readRememberedStudentAuth,
} from "../../lib/remembered-student-auth"
import { useSession } from "../../context/SessionProvider"
import { MfaLoginStep } from "../auth/MfaLoginStep"
import { ErrorBanner, LoginFieldGroup } from "./LoginCard"
import { LoginButton, LoginField, LoginPasswordToggle } from "./LoginButton"
import { LoginBrandHeader } from "./LoginBrandHeader"
import { LoginBackLink, LoginPortalStack } from "./login-chrome"
import { useLoginTheme } from "./login-theme"
import { parseMfaCompletePayload, parseMfaLoginResponse, type MfaLoginState } from "../../lib/mfa-types"

type Step = "university" | "credentials" | "course" | "mfa"
type AuthMode = "login" | "activate"

type Props = {
  onBack?: () => void
}

function isCourseSelectionResponse(
  data: UniversityStudentLoginResponse,
): data is Extract<UniversityStudentLoginResponse, { requiresCourseSelection: true }> {
  return "requiresCourseSelection" in data && data.requiresCourseSelection === true
}

export function StudentLoginPanel({ onBack }: Props) {
  const router = useRouter()
  const { signIn } = useSession()
  const { LOGIN, loginType } = useLoginTheme()

  const [step, setStep] = useState<Step>("university")
  const [mode, setMode] = useState<AuthMode>("login")

  const [universities, setUniversities] = useState<UniversityRecord[]>([])
  const [loadingUniversities, setLoadingUniversities] = useState(true)
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityRecord | null>(null)

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [activatePassword, setActivatePassword] = useState("")
  const [activateConfirm, setActivateConfirm] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [enrollments, setEnrollments] = useState<EnrollmentOption[]>([])
  const [pendingCredentials, setPendingCredentials] = useState<{
    identifier: string
    password: string
  } | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [mfaState, setMfaState] = useState<MfaLoginState | null>(null)

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
        setUniversities(list)

        if (remembered?.university) {
          const fresh =
            list.find((u) => u.id === remembered.university.id) ?? remembered.university
          setSelectedUniversity(fresh)
          await persistRememberedUniversity(fresh)
          if (remembered.identifier) setIdentifier(remembered.identifier)
          setRememberMe(Boolean(remembered.rememberMe && remembered.identifier))
          setStep("credentials")
        }
      } catch (err) {
        if (!mounted) return
        setError(err instanceof ApiError ? err.message : "Failed to load universities.")
      } finally {
        if (mounted) setLoadingUniversities(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  /** Theme accent for chrome/CTAs; school color only for university selection identity. */
  const themeAccent = LOGIN.purple
  const schoolAccent = selectedUniversity?.primary_color ?? themeAccent

  async function finishLogin(data: Extract<UniversityStudentLoginResponse, { student: unknown }>) {
    const student = data.student
    const enrollment = data.enrollment
    const university = data.university ?? selectedUniversity

    await primeMembershipTierCache(String(student.id), data.effectiveMembershipTier)

    if (university) {
      await persistRememberedUniversity(university)
    }
    if (rememberMe) {
      await persistRememberedStudentAuth({
        university: university ?? selectedUniversity!,
        identifier: identifier.trim() || String(student.student_id ?? ""),
        rememberMe: true,
      })
    } else {
      await clearRememberedStudentCredentials()
    }

    await signIn({
      portal: "student",
      id: student.student_id,
      name: student.full_name,
      section: student.section ?? enrollment?.section ?? "",
      databaseId: String(student.id),
      courseId: enrollment?.courseId ?? (student.course_id != null ? Number(student.course_id) : undefined),
      courseCode: enrollment?.courseCode,
      courseTitle: enrollment?.courseTitle,
      universityId: university?.id,
      universityName: university?.name,
      universityShortName: university?.short_name,
    })

    router.replace("/signing-in")
  }

  async function submitLogin(courseId?: number) {
    if (!selectedUniversity) {
      setError("Select your university to continue.")
      return
    }

    const id = pendingCredentials?.identifier ?? identifier
    const pw = pendingCredentials?.password ?? password

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
        setEnrollments(data.enrollments ?? [])
        setPendingCredentials({ identifier: id, password: pw })
        setStep("course")
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
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.")
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
    setStep(pendingCredentials ? "course" : "credentials")
    setError("")
  }

  async function handleLogin() {
    if (!identifier.trim() || !password) {
      setError("Enter your student ID or email and password.")
      return
    }
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
        setEnrollments(data.enrollments ?? [])
        setStep("course")
        return
      }

      await finishLogin(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Activation failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleContinueUniversity() {
    if (!selectedUniversity) {
      setError("Select your university to continue.")
      return
    }
    setError("")
    void persistRememberedUniversity(selectedUniversity)
    setStep("credentials")
  }

  function handleChangeUniversity() {
    void clearRememberedUniversity()
    setSelectedUniversity(null)
    setStep("university")
    setError("")
    setMode("login")
    setEnrollments([])
    setPendingCredentials(null)
  }

  if (step === "university") {
    return (
      <LoginPortalStack>
        <View style={styles.stepHeader}>
          <Text style={loginType.panelTitle}>Choose Your University</Text>
          <Text style={loginType.panelDescription}>
            Select the institution where you are enrolled.
          </Text>
        </View>

        {loadingUniversities ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={themeAccent} />
          </View>
        ) : (
          <View style={styles.uniList}>
            {universities.map((uni) => {
              const active = selectedUniversity?.id === uni.id
              const logoUri = universityLogoUri(uni.logo)
              return (
                <Pressable
                  key={uni.id}
                  onPress={() => {
                    setSelectedUniversity(uni)
                    setError("")
                  }}
                  style={({ pressed }) => [
                    styles.uniRow,
                    {
                      borderColor: active ? uni.primary_color : LOGIN.separator,
                      backgroundColor: active
                        ? hexToRgba(uni.primary_color, 0.1)
                        : LOGIN.grouped,
                    },
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={styles.uniLogoWrap}>
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.uniLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.uniLogoFallback, { backgroundColor: uni.primary_color }]}>
                        <Text style={styles.uniLogoFallbackText}>{uni.short_name.slice(0, 2)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.uniText}>
                    <Text style={[loginType.stepLabel, { color: LOGIN.label }]} numberOfLines={1}>
                      {uni.name}
                    </Text>
                    <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
                      {uni.short_name}
                      {uni.domain ? ` · ${uni.domain}` : ""}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={22} color={uni.primary_color} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={LOGIN.secondaryLabel} />
                  )}
                </Pressable>
              )
            })}
          </View>
        )}

        {error ? <ErrorBanner message={error} /> : null}

        <LoginButton
          label="Continue"
          icon="arrow-forward"
          onPress={handleContinueUniversity}
          disabled={!selectedUniversity || loadingUniversities}
          backgroundColor={themeAccent}
        />

        {onBack ? <LoginBackLink label="Other sign-in options" onPress={onBack} /> : null}
      </LoginPortalStack>
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

  if (step === "course") {
    return (
      <LoginPortalStack>
        <View style={styles.stepHeader}>
          <Text style={loginType.panelTitle}>Select a Course</Text>
          <Text style={loginType.panelDescription}>
            You are enrolled in multiple courses. Choose one to continue.
          </Text>
        </View>

        <View style={styles.uniList}>
          {enrollments.map((course) => (
            <Pressable
              key={course.courseId}
              disabled={submitting}
              onPress={() => void submitLogin(course.courseId)}
              style={({ pressed }) => [
                styles.uniRow,
                {
                  borderColor: LOGIN.separator,
                  backgroundColor: LOGIN.fill,
                },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <View style={styles.uniText}>
                <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>{course.courseTitle}</Text>
                <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>{course.courseCode}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={themeAccent} />
            </Pressable>
          ))}
        </View>

        {error ? <ErrorBanner message={error} /> : null}
        {submitting ? <ActivityIndicator color={themeAccent} /> : null}

        <LoginBackLink
          label="Back to login"
          onPress={() => {
            setStep("credentials")
            setPendingCredentials(null)
            setError("")
          }}
        />
      </LoginPortalStack>
    )
  }

  return (
    <LoginPortalStack>
      <LoginBrandHeader
        university={selectedUniversity}
        title={mode === "login" ? "Student Login" : "Activate Account"}
        subtitle={selectedUniversity?.name}
        accent={schoolAccent}
      />

      {error ? <ErrorBanner message={error} /> : null}

      {mode === "login" ? (
        <>
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

          <View style={styles.rememberRow}>
            <Switch
              value={rememberMe}
              onValueChange={(next) => {
                setRememberMe(next)
                if (!next) void clearRememberedStudentCredentials()
              }}
              trackColor={{
                false: LOGIN.separator,
                true: hexToRgba(themeAccent, 0.55),
              }}
              thumbColor={
                Platform.OS === "android"
                  ? rememberMe
                    ? themeAccent
                    : LOGIN.fill
                  : undefined
              }
              ios_backgroundColor={LOGIN.separator}
            />
            <Text style={[loginType.body, { color: LOGIN.secondaryLabel }]}>Remember me</Text>
          </View>

          <LoginButton
            label="Login"
            onPress={() => void handleLogin()}
            loading={submitting}
            backgroundColor={themeAccent}
          />
        </>
      ) : (
        <>
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

          <LoginButton
            label="Activate & Sign In"
            onPress={() => void handleActivate()}
            loading={submitting}
            backgroundColor={themeAccent}
          />
        </>
      )}

      <View style={styles.actionsGroup}>
        <Pressable
          onPress={() => {
            setMode(mode === "login" ? "activate" : "login")
            setError("")
          }}
          style={({ pressed }) => [
            styles.secondaryCta,
            {
              borderColor: LOGIN.softBorder,
              backgroundColor: LOGIN.soft,
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={[loginType.link, { color: themeAccent, textAlign: "center" }]}>
            {mode === "login" ? "First time? Activate your account" : "Already activated? Sign in"}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleChangeUniversity}
          style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={[loginType.body, { color: LOGIN.label, flex: 1 }]}>
            Not your school? Change university
          </Text>
          <Ionicons name="chevron-forward" size={18} color={themeAccent} />
        </Pressable>

        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.navRow,
              styles.navRowBorder,
              { borderTopColor: LOGIN.separator },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={[loginType.body, { color: LOGIN.label, flex: 1 }]}>Other sign-in options</Text>
            <Ionicons name="chevron-forward" size={18} color={themeAccent} />
          </Pressable>
        ) : null}
      </View>

      <Text style={[loginType.info, styles.helpText]}>Need help? Contact your instructor.</Text>
    </LoginPortalStack>
  )
}

const styles = StyleSheet.create({
  stepHeader: { gap: 6, marginBottom: 2 },
  loadingBox: { paddingVertical: 36, alignItems: "center" },
  uniList: { gap: 10 },
  uniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  uniLogoWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  uniLogo: { width: 40, height: 40 },
  uniLogoFallback: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  uniLogoFallbackText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  uniText: { flex: 1, gap: 2, minWidth: 0 },
  pressed: { opacity: 0.85 },
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
  helpText: { textAlign: "center" },
})
