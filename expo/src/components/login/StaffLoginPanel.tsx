import { useState } from "react"
import { useRouter } from "expo-router"
import { ApiError, api } from "../../lib/api"
import { parseMfaCompletePayload, parseMfaLoginResponse, type MfaLoginState } from "../../lib/mfa-types"
import { useSession } from "../../context/SessionProvider"
import { MfaLoginStep } from "../auth/MfaLoginStep"
import { ErrorBanner, LoginFieldGroup } from "./LoginCard"
import { LoginButton, LoginField, LoginPasswordToggle } from "./LoginButton"
import { LoginBackLink, LoginPortalHeader, LoginPortalStack } from "./login-chrome"

type Props = {
  onBack?: () => void
}

export function StaffLoginPanel({ onBack }: Props) {
  const router = useRouter()
  const { signIn } = useSession()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [mfaState, setMfaState] = useState<MfaLoginState | null>(null)

  async function finishStaffLogin(data: Record<string, unknown>) {
    const normalized = parseMfaCompletePayload(data) ?? data
    const instructor = (normalized.faculty ?? normalized.instructor) as
      | { id: number; username: string; name?: string; email?: string; role?: string }
      | undefined
    if (!instructor) throw new ApiError("Login failed", 500)

    await signIn({
      portal: "faculty",
      id: Number(instructor.id),
      username: instructor.username,
      name: instructor.name ?? instructor.username,
      email: instructor.email,
      role: instructor.role,
    })

    router.replace("/signing-in")
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
      await finishStaffLogin(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (mfaState) {
    return (
      <MfaLoginStep
        showChrome={false}
        backLabel="Back to login"
        state={mfaState}
        portalLabel="CourseCollab Faculty"
        onComplete={(payload) => finishStaffLogin(payload)}
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

      <LoginButton label="Continue to dashboard" onPress={() => void handleSubmit()} loading={submitting} />

      {onBack ? <LoginBackLink label="Other sign-in options" onPress={onBack} /> : null}
    </LoginPortalStack>
  )
}
