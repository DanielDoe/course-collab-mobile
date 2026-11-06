import { useEffect, useState } from "react"
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native"
import { hexToRgba } from "../../constants/app-themes"
import { ApiError, api, type UniversityRecord } from "../../lib/api"
import { parseAccessLifecyclePayload } from "../../lib/access-governance"
import { parseMfaCompletePayload, parseMfaLoginResponse, type MfaLoginState } from "../../lib/mfa-types"
import { persistMfaDeviceTrustFromLogin, instructorMfaLoginKey, instructorMfaAliasKeys } from "../../lib/mfa-device-trust"
import {
  clearRememberedFacultyCredentials,
  persistRememberedFacultyCredentials,
  persistRememberedFacultyUniversity,
  readRememberedFacultyCredentials,
  readRememberedFacultyUniversity,
} from "../../lib/remembered-faculty-auth"
import { stashPendingLoginPassword } from "../../lib/pending-login-password"
import { useSession } from "../../context/SessionProvider"
import { MfaLoginStep } from "../auth/MfaLoginStep"
import { ErrorBanner, LoginFieldGroup } from "./LoginCard"
import { LoginButton, LoginField, LoginPasswordToggle } from "./LoginButton"
import { LoginBackLink, LoginPortalHeader, LoginPortalStack } from "./login-chrome"
import { AccessRequestStatusScreen } from "../auth/AccessRequestStatusScreen"
import { useLoginTheme } from "./login-theme"
import { UniversityAuthLogoImage } from "./UniversityAuthLogoImage"

type Props = {
  onBack?: () => void
}

type Step = "campus" | "credentials"

export function StaffLoginPanel({ onBack }: Props) {
  const { signIn } = useSession()
  const { LOGIN, loginType } = useLoginTheme()

  const [step, setStep] = useState<Step>("campus")
  const [universities, setUniversities] = useState<UniversityRecord[]>([])
  const [loadingUniversities, setLoadingUniversities] = useState(true)
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityRecord | null>(null)
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
      const [remembered, rememberedUni] = await Promise.all([
        readRememberedFacultyCredentials(),
        readRememberedFacultyUniversity(),
      ])
      if (!mounted) return
      if (remembered?.username) setUsername(remembered.username)
      setRememberMe(Boolean(remembered?.rememberMe && remembered?.username))
      if (rememberedUni) {
        setSelectedUniversity(rememberedUni)
        setStep("credentials")
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    void api
      .getUniversities()
      .then((res) => {
        if (!mounted) return
        const featured = (res.universities ?? []).filter((u) => u.is_active && u.id > 0)
        setUniversities(featured)
      })
      .catch(() => {
        if (mounted) setUniversities([])
      })
      .finally(() => {
        if (mounted) setLoadingUniversities(false)
      })
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
          selectedUniversityId?: number
        }
      | undefined
    if (!instructor) throw new ApiError("Login failed", 500)
    if (!selectedUniversity) throw new ApiError("Select your university first.", 400)

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
    await persistRememberedFacultyUniversity(selectedUniversity)

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
      selectedUniversityId: selectedUniversity.id,
      universityName: selectedUniversity.name,
      universityShortName: selectedUniversity.short_name,
      requiresPasswordChange,
    })
  }

  async function handleSubmit() {
    setError("")
    if (!selectedUniversity) {
      setError("Select your university first.")
      setStep("campus")
      return
    }
    if (!username.trim() || !password) {
      setError("Enter your username and password.")
      return
    }

    setSubmitting(true)
    try {
      const data = (await api.instructorLogin(username, password, {
        universityId: selectedUniversity.id,
        rememberMe,
      })) as Record<string, unknown>
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

  if (step === "campus") {
    return (
      <LoginPortalStack>
        <LoginPortalHeader portal="faculty" />
        <Text style={[loginType.body, { color: LOGIN.secondaryLabel, marginBottom: 8 }]}>
          Choose your university — the same username can be used at each campus, but courses and data
          stay separate.
        </Text>
        {error ? <ErrorBanner message={error} /> : null}
        {loadingUniversities ? (
          <ActivityIndicator color={LOGIN.cta} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.campusList}>
            {universities.map((uni) => {
              const active = selectedUniversity?.id === uni.id
              return (
                <Pressable
                  key={uni.id}
                  onPress={() => {
                    setSelectedUniversity(uni)
                    setStep("credentials")
                    setError("")
                  }}
                  style={[
                    styles.campusRow,
                    {
                      borderColor: active ? LOGIN.cta : LOGIN.separator,
                      backgroundColor: active ? hexToRgba(LOGIN.cta, 0.08) : LOGIN.fill,
                    },
                  ]}
                >
                  <UniversityAuthLogoImage university={uni} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={[loginType.body, { color: LOGIN.label, fontWeight: "600" }]}>
                      {uni.name}
                    </Text>
                    <Text style={[loginType.caption, { color: LOGIN.secondaryLabel }]}>
                      {uni.short_name}
                    </Text>
                  </View>
                  <Text style={{ color: LOGIN.cta, fontSize: 18 }}>›</Text>
                </Pressable>
              )
            })}
          </View>
        )}
        {onBack ? <LoginBackLink label="Other sign-in options" onPress={onBack} /> : null}
      </LoginPortalStack>
    )
  }

  return (
    <LoginPortalStack>
      <LoginPortalHeader portal="faculty" />

      {selectedUniversity ? (
        <Pressable onPress={() => setStep("campus")} style={styles.campusBadge}>
          <UniversityAuthLogoImage university={selectedUniversity} size={28} />
          <Text style={[loginType.caption, { color: LOGIN.secondaryLabel, flex: 1 }]}>
            {selectedUniversity.short_name} · Tap to change campus
          </Text>
        </Pressable>
      ) : null}

      {error ? <ErrorBanner message={error} /> : null}

      <LoginFieldGroup>
        <LoginField
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="dmdoe"
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
  campusList: {
    gap: 10,
  },
  campusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  campusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
})
