import { useState } from "react"
import { ApiError, api } from "../../lib/api"
import { useSession } from "../../context/SessionProvider"
import { ErrorBanner, InfoBanner, LoginFieldGroup } from "./LoginCard"
import { LoginButton, LoginField, LoginPasswordToggle } from "./LoginButton"
import { LoginBackLink, LoginPortalHeader, LoginPortalStack } from "./login-chrome"

type Props = {
  onBack?: () => void
}

export function SummerLoginPanel({ onBack }: Props) {
  const { signIn } = useSession()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit() {
    setError("")
    if (!email.trim().includes("@")) {
      setError("Enter a valid email address.")
      return
    }
    if (!password) {
      setError("Enter your password.")
      return
    }

    setSubmitting(true)
    try {
      const data = await api.summerLogin(email, password)
      const student = data.student

      await signIn({
        portal: "summer",
        id: student.student_id,
        name: student.full_name,
        databaseId: String(student.id),
        email: typeof student.email === "string" ? student.email : email.trim(),
        studentProgramRole: student.student_program_role,
      })

    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LoginPortalStack>
      <LoginPortalHeader portal="summer" />

      <InfoBanner>
        Registration and password reset live on the web app. Wait for your approval email before signing in here.
      </InfoBanner>

      <LoginFieldGroup>
        <LoginField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
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

      <LoginButton
        label="Sign in to Summer Camp"
        onPress={() => void handleSubmit()}
        loading={submitting}
        variant="gold"
      />

      {onBack ? <LoginBackLink label="Other sign-in options" onPress={onBack} /> : null}
    </LoginPortalStack>
  )
}
