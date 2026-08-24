import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { hexToRgba } from "../../constants/app-themes"
import { Ionicons } from "@/components/icons/AppIcon"
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
import { UniversityAuthLogoImage } from "./UniversityAuthLogoImage"
import { LoginBackLink, LoginPortalStack, type RegisterAuthPanelBack } from "./login-chrome"
import { useLoginTheme } from "./login-theme"
import { parseAccessLifecyclePayload } from "../../lib/access-governance"
import { formatStudentLoginApiError } from "../../lib/student-login-errors"
import { normalizeLoginIdentifier, normalizeLoginPassword } from "../../lib/login-credentials"
import { completeStudentUniversityLogin } from "../../lib/student-login-completion"
import { stashPendingStudentCourseLogin } from "../../lib/student-login-pending"
import { AccessRequestStatusScreen } from "../auth/AccessRequestStatusScreen"
import { parseMfaCompletePayload, parseMfaLoginResponse, type MfaLoginState } from "../../lib/mfa-types"

type Step = "university" | "credentials" | "mfa"

/** Mirrors web lib/universities-shared.ts — the catch-all "Other" picker row. */
function isOtherUniversity(uni: Pick<UniversityRecord, "short_name"> | null | undefined): boolean {
  return String(uni?.short_name ?? "").trim().toUpperCase() === "OTHER"
}

function sameUniversity(a: UniversityRecord | null, b: UniversityRecord): boolean {
  if (!a) return false
  if (a.id > 0 || b.id > 0) return a.id === b.id
  return a.name === b.name && (a.domain ?? "") === (b.domain ?? "")
}
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

  const [universities, setUniversities] = useState<UniversityRecord[]>([])
  const [loadingUniversities, setLoadingUniversities] = useState(true)
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityRecord | null>(null)
  const [uniQuery, setUniQuery] = useState("")
  const [uniResults, setUniResults] = useState<UniversityRecord[]>([])
  const [searchingUniversities, setSearchingUniversities] = useState(false)
  const [savingUniversity, setSavingUniversity] = useState(false)

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
        setUniversities(list)

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
      } finally {
        if (mounted) setLoadingUniversities(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const q = uniQuery.trim()
    if (q.length < 2) {
      setUniResults([])
      setSearchingUniversities(false)
      return
    }
    const handle = setTimeout(() => {
      void (async () => {
        setSearchingUniversities(true)
        try {
          const data = await api.searchUniversities(q)
          setUniResults(data.universities ?? [])
        } catch {
          setUniResults([])
        } finally {
          setSearchingUniversities(false)
        }
      })()
    }, 280)
    return () => clearTimeout(handle)
  }, [uniQuery])

  const featuredUniversities = useMemo(
    () => universities.filter((u) => !isOtherUniversity(u)),
    [universities],
  )
  const otherUniversity = useMemo(
    () => universities.find((u) => isOtherUniversity(u)) ?? null,
    [universities],
  )
  const showingUniversitySearch = uniQuery.trim().length >= 2

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

  async function handleContinueUniversity() {
    if (!selectedUniversity) {
      setError("Select your university to continue.")
      return
    }
    setError("")
    let university = selectedUniversity
    if (!university.id) {
      setSavingUniversity(true)
      try {
        const data = await api.ensureUniversity({
          name: university.name,
          domain: university.domain,
          shortName: university.short_name,
        })
        university = data.university
        setSelectedUniversity(university)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not save your school. Try again.")
        setSavingUniversity(false)
        return
      }
      setSavingUniversity(false)
    }
    void persistRememberedUniversity(university)
    setStep("credentials")
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
      <LoginPortalStack>
        <View style={styles.stepHeader}>
          <Text style={loginType.panelTitle}>Choose Your University</Text>
          <Text style={loginType.panelDescription}>
            Search thousands of schools, or pick Other if yours is not listed.
          </Text>
        </View>

        {loadingUniversities ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={linkAccent} />
          </View>
        ) : (
          <>
            <View
              style={[
                styles.searchBox,
                { borderColor: LOGIN.separator, backgroundColor: LOGIN.grouped },
              ]}
            >
              <Ionicons name="search" size={17} color={LOGIN.secondaryLabel} />
              <TextInput
                value={uniQuery}
                onChangeText={setUniQuery}
                placeholder="Search universities…"
                placeholderTextColor={LOGIN.secondaryLabel}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.searchInput, { color: LOGIN.label }]}
              />
              {searchingUniversities ? (
                <ActivityIndicator size="small" color={linkAccent} />
              ) : uniQuery ? (
                <Pressable onPress={() => setUniQuery("")} hitSlop={8} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={17} color={LOGIN.secondaryLabel} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.uniList}>
              {showingUniversitySearch && uniResults.length === 0 && !searchingUniversities ? (
                <Text style={[loginType.info, { color: LOGIN.secondaryLabel, textAlign: "center", paddingVertical: 10 }]}>
                  No matches. Choose Other below.
                </Text>
              ) : null}
              {(showingUniversitySearch ? uniResults : featuredUniversities).map((uni) => {
                const active = sameUniversity(selectedUniversity, uni)
                return (
                  <Pressable
                    key={`${uni.id}-${uni.domain ?? uni.name}`}
                    onPress={() => {
                      setSelectedUniversity(uni)
                      if (uni.id > 0) void persistRememberedUniversity(uni)
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
                    <UniversityAuthLogoImage university={uni} variant="list" />
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
              {otherUniversity ? (
                (() => {
                  const active = Boolean(selectedUniversity && isOtherUniversity(selectedUniversity))
                  return (
                    <Pressable
                      key="other-university"
                      onPress={() => {
                        setSelectedUniversity(otherUniversity)
                        void persistRememberedUniversity(otherUniversity)
                        setError("")
                      }}
                      style={({ pressed }) => [
                        styles.uniRow,
                        {
                          borderColor: active ? otherUniversity.primary_color : LOGIN.separator,
                          backgroundColor: active
                            ? hexToRgba(otherUniversity.primary_color, 0.1)
                            : LOGIN.grouped,
                        },
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <UniversityAuthLogoImage university={otherUniversity} variant="list" />
                      <View style={styles.uniText}>
                        <Text style={[loginType.stepLabel, { color: LOGIN.label }]} numberOfLines={1}>
                          {otherUniversity.name}
                        </Text>
                        <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
                          Independent, company, or school not listed
                        </Text>
                      </View>
                      {active ? (
                        <Ionicons name="checkmark-circle" size={22} color={otherUniversity.primary_color} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={LOGIN.secondaryLabel} />
                      )}
                    </Pressable>
                  )
                })()
              ) : null}
            </View>
          </>
        )}

        {error ? <ErrorBanner message={error} /> : null}

        <LoginButton
          label={savingUniversity ? "Saving…" : "Continue"}
          icon="arrow-forward"
          onPress={() => void handleContinueUniversity()}
          disabled={!selectedUniversity || loadingUniversities || savingUniversity}
        />

        {onBack ? <LoginBackLink label="Other sign-in options" onPress={onBack} /> : null}
      </LoginPortalStack>
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

          <LoginButton
            label="Login"
            onPress={() => void handleLogin()}
            loading={submitting}
          />

          <Pressable
            onPress={() =>
              setError("Forgot your password? Ask your instructor to approve a reset, then sign in and set a new password.")
            }
            accessibilityRole="button"
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Text style={[loginType.link, { color: linkAccent, textAlign: "center" }]}>
              Forgot password?
            </Text>
          </Pressable>
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
          <Text style={[loginType.link, { color: linkAccent, textAlign: "center" }]}>
            {mode === "login" ? "First time? Activate your account" : "Already activated? Sign in"}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleRequestAccess}
          style={({ pressed }) => [
            styles.secondaryCta,
            {
              borderColor: LOGIN.softBorder,
              backgroundColor: LOGIN.fill,
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={[loginType.link, { color: linkAccent, textAlign: "center" }]}>
            New student? Request course access
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
          <Ionicons name="chevron-forward" size={18} color={linkAccent} />
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
            <Ionicons name="chevron-forward" size={18} color={linkAccent} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={() => {
          void Linking.openURL(
            "mailto:support@course-collab.com?subject=Student%20login%20help&body=I%20need%20help%20signing%20in%20to%20CourseCollab.",
          )
        }}
        style={({ pressed }) => [styles.helpBtn, pressed && styles.pressed]}
        accessibilityRole="link"
        accessibilityLabel="Need help? Contact support"
      >
        <Text style={[loginType.info, styles.helpText, { color: linkAccent }]}>
          Need help? Contact support
        </Text>
      </Pressable>
    </LoginPortalStack>
  )
}

const styles = StyleSheet.create({
  stepHeader: { gap: 6, marginBottom: 2 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
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
  helpBtn: {
    alignSelf: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  helpText: { textAlign: "center", fontWeight: "600" },
})
