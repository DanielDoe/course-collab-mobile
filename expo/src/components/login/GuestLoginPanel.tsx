import { useState } from "react"
import { ApiError, api } from "../../lib/api"
import { useSession } from "../../context/SessionProvider"
import { ErrorBanner, InfoBanner, LoginFieldGroup } from "./LoginCard"
import { LoginButton, LoginField, LoginPasswordToggle } from "./LoginButton"
import { LoginBackLink, LoginPortalHeader, LoginPortalStack } from "./login-chrome"

type Props = {
  onBack?: () => void
}

export function GuestLoginPanel({ onBack }: Props) {
  const { signIn } = useSession()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

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
      const data = await api.guestLogin(email, password)
      const student = data.student
      const purposeRaw = data.guestAccessPurpose ?? student.guest_access_purpose
      const guestAccessPurpose =
        purposeRaw === "recommendation_letter" || purposeRaw === "other" ? purposeRaw : "other"

      await signIn({
        portal: "guest",
        id: student.student_id,
        name: student.full_name,
        databaseId: String(student.id),
        guestAccessPurpose,
      })

    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LoginPortalStack>
      <LoginPortalHeader portal="guest" />

      <InfoBanner>
        Use the email and password from your approval message. New guest requests are handled on the web app.
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

      <LoginButton label="Continue as guest" onPress={() => void handleSubmit()} loading={submitting} />

      {onBack ? <LoginBackLink label="Other sign-in options" onPress={onBack} /> : null}
    </LoginPortalStack>
  )
}
