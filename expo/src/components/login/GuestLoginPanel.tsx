import { useCallback, useEffect, useState } from "react"
import { ApiError, api } from "../../lib/api"
import { parseAccessLifecyclePayload } from "../../lib/access-governance"
import { useSession } from "../../context/SessionProvider"
import { parseMfaCompletePayload, parseMfaLoginResponse, type MfaLoginState } from "../../lib/mfa-types"
import { persistMfaDeviceTrustFromLogin, studentMfaLoginKey } from "../../lib/mfa-device-trust"
import { MfaLoginStep } from "../auth/MfaLoginStep"
import { ErrorBanner, InfoBanner, LoginFieldGroup } from "./LoginCard"
import { LoginButton, LoginField, LoginPasswordToggle } from "./LoginButton"
import { LoginBackLink, LoginPortalHeader, LoginPortalStack, type RegisterAuthPanelBack } from "./login-chrome"
import { AccessRequestStatusScreen } from "../auth/AccessRequestStatusScreen"

type Props = {
  onBack?: () => void
  registerPanelBack?: RegisterAuthPanelBack
}

export function GuestLoginPanel({ onBack, registerPanelBack }: Props) {
  const { signIn } = useSession()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
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
    return false
  }, [accessStatus, mfaState])

  useEffect(() => {
    registerPanelBack?.(handlePanelBack)
    return () => registerPanelBack?.(null)
  }, [handlePanelBack, registerPanelBack])

  async function finishGuestLogin(data: Record<string, unknown>) {
    const normalized = parseMfaCompletePayload(data) ?? data
    const student = normalized.student as
      | {
          id: number
          student_id: string
          full_name: string
          guest_access_purpose?: string
        }
      | undefined
    if (!student) throw new ApiError("Login failed", 500)

    const purposeRaw =
      (normalized.guestAccessPurpose as string | undefined) ?? student.guest_access_purpose
    const guestAccessPurpose =
      purposeRaw === "recommendation_letter" || purposeRaw === "other" ? purposeRaw : "other"

    const authId = email.trim().toLowerCase()
    await persistMfaDeviceTrustFromLogin({
      userType: "student",
      loginKey: studentMfaLoginKey(0, authId),
      payload: normalized,
    })

    await signIn({
      portal: "guest",
      id: student.student_id,
      name: student.full_name,
      databaseId: String(student.id),
      email: authId,
      authIdentifier: authId,
      guestAccessPurpose,
    })
  }

  async function handleSubmit() {
    setError("")
    if (!email.trim().includes("@") || email.trim().length < 4) {
      setError("Enter a valid email address.")
      return
    }
    if (!password) {
      setError("Enter your password.")
      return
    }

    setSubmitting(true)
    try {
      const data = (await api.guestLogin(email, password)) as Record<string, unknown>
      const mfa = parseMfaLoginResponse(data)
      if (mfa) {
        setMfaState(mfa)
        return
      }
      await finishGuestLogin(data)
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

  if (accessStatus) {
    return (
      <AccessRequestStatusScreen
        payload={accessStatus}
        portalLabel="Career Member"
        onBack={() => setAccessStatus(null)}
      />
    )
  }

  if (mfaState) {
    return (
      <MfaLoginStep
        state={mfaState}
        portalLabel="Career Member"
        backLabel="Back to Career Member sign in"
        onComplete={(payload) => finishGuestLogin(payload)}
        onBack={() => setMfaState(null)}
      />
    )
  }

  return (
    <LoginPortalStack>
      <LoginPortalHeader portal="guest" />

      <InfoBanner>
        Sign in with your Career Member email and password. New accounts are created on the web at
        course-collab.com.
      </InfoBanner>

      <LoginFieldGroup>
        <LoginField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@school.edu"
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

      {error ? <ErrorBanner message={error} /> : null}

      <LoginButton label="Sign in" onPress={() => void handleSubmit()} loading={submitting} />

      {onBack ? <LoginBackLink label="Other sign-in options" onPress={onBack} /> : null}
    </LoginPortalStack>
  )
}
