import { useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import {
  accountTypeLabel,
  formatAccessSubmittedDate,
  resendAccessVerificationEmail,
  type AccessLifecyclePayload,
} from "../../lib/access-governance"
import { ApiError } from "../../lib/api"
import { LoginBackLink, LoginPortalStack } from "../login/login-chrome"
import { InfoBanner } from "../login/LoginCard"
import { LoginButton } from "../login/LoginButton"
import { useLoginTheme } from "../login/login-theme"

type Props = {
  payload: AccessLifecyclePayload
  portalLabel: string
  onBack?: () => void
}

function lifecycleTitle(lifecycle: AccessLifecyclePayload["lifecycle"]): string {
  switch (lifecycle) {
    case "pending_email_verification":
      return "Verify Your Email"
    case "pending_approval":
      return "Access Request Pending"
    case "rejected":
      return "Access Request Not Approved"
    case "suspended":
      return "Account Suspended"
    case "deactivated":
      return "Account Deactivated"
    default:
      return "Account Access"
  }
}

function lifecycleIcon(lifecycle: AccessLifecyclePayload["lifecycle"]): keyof typeof Ionicons.glyphMap {
  switch (lifecycle) {
    case "pending_email_verification":
      return "mail-outline"
    case "pending_approval":
      return "time-outline"
    case "rejected":
      return "close-circle-outline"
    case "suspended":
    case "deactivated":
      return "lock-closed-outline"
    default:
      return "information-circle-outline"
  }
}

function lifecycleBody(payload: AccessLifecyclePayload): string {
  switch (payload.lifecycle) {
    case "pending_approval":
      return "Your request is waiting for review. You cannot sign in until an authorized administrator or faculty member approves it."
    case "pending_email_verification":
      return "We sent a verification link to your email. Open it to confirm your address. After verification, your request will enter the approval queue if required."
    case "rejected":
      return payload.rejectionReason?.trim()
        ? `Your access request was reviewed and not approved.\n\nReason: ${payload.rejectionReason.trim()}`
        : "Your access request was reviewed and not approved. Contact your instructor or administrator if you believe this was a mistake."
    case "suspended":
      return "This account is suspended. Contact your institution administrator for assistance."
    case "deactivated":
      return "This account has been deactivated."
    default:
      return "You do not have platform access yet."
  }
}

export function AccessRequestStatusScreen({ payload, portalLabel, onBack }: Props) {
  const { LOGIN } = useLoginTheme()
  const request = payload.request
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const scopeLabel =
    request?.section?.trim() ||
    request?.program?.trim() ||
    request?.organization?.trim() ||
    null

  async function handleResendVerification() {
    if (!request?.email) return
    setResending(true)
    setResendMessage("")
    try {
      const result = await resendAccessVerificationEmail(request.email)
      setResendMessage(result.message)
    } catch (err) {
      setResendMessage(err instanceof ApiError ? err.message : "Could not resend verification email.")
    } finally {
      setResending(false)
    }
  }

  return (
    <LoginPortalStack>
      <View style={styles.hero}>
        <View style={[styles.iconWrap, { backgroundColor: LOGIN.accentSoft }]}>
          <Ionicons name={lifecycleIcon(payload.lifecycle)} size={28} color={LOGIN.purple} />
        </View>
        <Text style={[styles.title, { color: LOGIN.label }]}>{lifecycleTitle(payload.lifecycle)}</Text>
        <Text style={[styles.subtitle, { color: LOGIN.secondaryLabel }]}>{portalLabel}</Text>
      </View>

      <InfoBanner>{lifecycleBody(payload)}</InfoBanner>

      <View style={[styles.card, { borderColor: LOGIN.separator, backgroundColor: LOGIN.grouped }]}>
        <DetailRow label="Account type" value={accountTypeLabel(payload.accountType)} />
        {request?.fullName ? <DetailRow label="Name" value={request.fullName} /> : null}
        {request?.email ? <DetailRow label="Email" value={request.email} /> : null}
        {scopeLabel ? (
          <DetailRow
            label={request?.program ? "Program" : request?.section ? "Course / Section" : "Institution"}
            value={scopeLabel}
          />
        ) : null}
        {request?.submittedAt ? (
          <DetailRow label="Submitted" value={formatAccessSubmittedDate(request.submittedAt)} />
        ) : null}
        {payload.lifecycle === "pending_approval" || payload.lifecycle === "pending_email_verification" ? (
          <DetailRow
            label="Email verification"
            value={request?.emailVerified ? "Verified" : "Pending"}
            isLast
          />
        ) : (
          <View style={styles.lastSpacer} />
        )}
      </View>

      {payload.lifecycle === "pending_email_verification" && request?.email ? (
        <View style={styles.actions}>
          <LoginButton
            label={resending ? "Sending…" : "Resend verification email"}
            onPress={() => void handleResendVerification()}
            loading={resending}
            disabled={resending}
          />
          {resendMessage ? <Text style={[styles.resendMessage, { color: LOGIN.secondaryLabel }]}>{resendMessage}</Text> : null}
        </View>
      ) : null}

      {onBack ? <LoginBackLink label="Back to sign in" onPress={onBack} /> : null}
    </LoginPortalStack>
  )
}

function DetailRow({
  label,
  value,
  isLast = false,
}: {
  label: string
  value: string
  isLast?: boolean
}) {
  const { LOGIN } = useLoginTheme()
  return (
    <View style={[styles.row, !isLast && styles.rowBorder, { borderBottomColor: LOGIN.separator }]}>
      <Text style={[styles.rowLabel, { color: LOGIN.secondaryLabel }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: LOGIN.label }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "none",
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  lastSpacer: {
    height: 4,
  },
  actions: {
    gap: 8,
  },
  resendMessage: {
    fontSize: 13,
    textAlign: "center",
  },
})
