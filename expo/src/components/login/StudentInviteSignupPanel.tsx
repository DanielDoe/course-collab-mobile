import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { ApiError, api, type SessionOption } from "../../lib/api"
import {
  submitStudentAccessRequest,
  validateAccessInvitation,
  type AccessLifecyclePayload,
  type ValidatedAccessInvitation,
} from "../../lib/access-governance"
import { AccessRequestStatusScreen } from "../auth/AccessRequestStatusScreen"
import { ErrorBanner, InfoBanner, LoginFieldGroup } from "./LoginCard"
import { LoginButton, LoginField } from "./LoginButton"
import { LoginBackLink, LoginPortalHeader, LoginPortalStack } from "./login-chrome"
import { LoginSelect } from "./LoginSelect"
import { useLoginTheme } from "./login-theme"

type Props = {
  token: string
  onBack?: () => void
}

export function StudentInviteSignupPanel({ token, onBack }: Props) {
  const { LOGIN, loginType } = useLoginTheme()

  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState("")
  const [invitation, setInvitation] = useState<ValidatedAccessInvitation | null>(null)
  const [sessions, setSessions] = useState<SessionOption[]>([])
  const [sectionCode, setSectionCode] = useState("")

  const [fullName, setFullName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [accessStatus, setAccessStatus] = useState<AccessLifecyclePayload | null>(null)

  useEffect(() => {
    let mounted = true
    void (async () => {
      setLoadingInvite(true)
      setInviteError("")
      try {
        const validated = await validateAccessInvitation(token)
        if (!mounted) return
        if (validated.allowedAccountType !== "student") {
          setInviteError("This invitation is not for a student account.")
          return
        }
        setInvitation(validated)

        if (validated.courseId) {
          const data = await api.getSessions(validated.courseId)
          if (!mounted) return
          const list = (data.sessions ?? []).filter(
            (s) => String(s.code).trim().toUpperCase() !== "BETA",
          )
          setSessions(list)
          if (validated.sessionId) {
            const match = list.find((s) => s.id === validated.sessionId)
            if (match) setSectionCode(match.code)
          } else if (list.length === 1) {
            setSectionCode(list[0].code)
          }
        }
      } catch (err) {
        if (!mounted) return
        setInviteError(err instanceof ApiError ? err.message : "Could not validate invitation.")
      } finally {
        if (mounted) setLoadingInvite(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [token])

  const sectionOptions = useMemo(
    () => sessions.map((s) => ({ value: s.code, label: s.code })),
    [sessions],
  )

  const approvalHint =
    invitation?.approvalBehavior === "auto_approve_verified_invite"
      ? "After you verify your email, your account can activate automatically."
      : "After you verify your email, your instructor must approve your access request."

  async function handleSubmit() {
    setError("")
    if (!fullName.trim() || !studentId.trim() || !email.trim() || !sectionCode.trim()) {
      setError("Complete every field, including your lecture section.")
      return
    }
    if (!email.trim().includes("@")) {
      setError("Enter a valid university email.")
      return
    }

    setSubmitting(true)
    try {
      const result = await submitStudentAccessRequest({
        fullName: fullName.trim(),
        studentId: studentId.trim(),
        section: sectionCode.trim(),
        email: email.trim(),
        invitationToken: token,
      })
      setAccessStatus({
        lifecycle: "pending_email_verification",
        accountType: "student",
        request: {
          fullName: fullName.trim(),
          email: email.trim(),
          section: sectionCode.trim(),
        },
        error: result.message,
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your request.")
    } finally {
      setSubmitting(false)
    }
  }

  if (accessStatus) {
    return (
      <AccessRequestStatusScreen
        payload={accessStatus}
        portalLabel="Student"
        onBack={onBack}
      />
    )
  }

  if (loadingInvite) {
    return (
      <LoginPortalStack>
        <LoginPortalHeader portal="student" />
        <View style={styles.centered}>
          <ActivityIndicator color={LOGIN.purple} />
          <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>Checking invitation…</Text>
        </View>
      </LoginPortalStack>
    )
  }

  if (inviteError || !invitation) {
    return (
      <LoginPortalStack>
        <LoginPortalHeader portal="student" />
        <ErrorBanner message={inviteError || "This invitation link is invalid."} />
        {onBack ? <LoginBackLink label="Other sign-in options" onPress={onBack} /> : null}
      </LoginPortalStack>
    )
  }

  const sectionLocked = Boolean(invitation.sessionId && sectionCode)

  return (
    <LoginPortalStack>
      <LoginPortalHeader portal="student" />

      <InfoBanner>
        You were invited to join CourseCollab as a student. {approvalHint}
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
          label="Student ID"
          value={studentId}
          onChangeText={setStudentId}
          placeholder="University ID"
          autoCapitalize="characters"
          grouped
        />
        <LoginField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@school.edu"
          autoCapitalize="none"
          keyboardType="email-address"
          grouped
        />
      </LoginFieldGroup>

      <View style={styles.sectionBlock}>
        <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>Lecture section</Text>
        {sectionLocked ? (
          <View style={[styles.sectionPill, { backgroundColor: LOGIN.grouped, borderColor: LOGIN.separator }]}>
            <Text style={[loginType.input, { color: LOGIN.label }]}>{sectionCode}</Text>
          </View>
        ) : sectionOptions.length > 0 ? (
          <LoginSelect
            sheetTitle="Lecture section"
            sheetMessage="Choose the section from your invitation scope."
            placeholder="Select section"
            value={sectionCode}
            options={sectionOptions}
            onChange={setSectionCode}
            icon="school-outline"
          />
        ) : (
          <LoginField
            label="Section code"
            value={sectionCode}
            onChangeText={setSectionCode}
            placeholder="e.g. P01"
            autoCapitalize="characters"
          />
        )}
      </View>

      {error ? <ErrorBanner message={error} /> : null}

      <LoginButton label="Submit access request" onPress={() => void handleSubmit()} loading={submitting} />

      {onBack ? <LoginBackLink label="Other sign-in options" onPress={onBack} /> : null}
    </LoginPortalStack>
  )
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
})
