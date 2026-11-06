import { useState } from "react"
import { Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated"
import {
  resendAccessVerificationEmail,
  type AccessLifecyclePayload,
} from "../../../lib/access-governance"
import { ApiError } from "../../../lib/api"
import { PRODUCTION_API_BASE_URL } from "../../../config/api"
import { LoginBackLink } from "../login-chrome"
import { LoginButton } from "../LoginButton"
import { useLoginTheme } from "../login-theme"
import { EMAIL_INBOX_HINT } from "./student-signup-artwork"

type Props = {
  payload: AccessLifecyclePayload
  accent: string
  portalLabel: string
  onBack?: () => void
}

const CHECKLIST = [
  { key: "verify", label: "Verify your email", active: true, done: false },
  { key: "approve", label: "Instructor approval", active: false, done: false },
  { key: "signin", label: "Sign in & activate", active: false, done: false },
] as const

export function StudentSignupVerifyStep({ payload, accent, portalLabel, onBack }: Props) {
  const { LOGIN, loginType } = useLoginTheme()
  const request = payload.request
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")

  async function handleResend() {
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
    <Animated.View entering={FadeIn.duration(280)} style={styles.wrap}>
      <View
        style={[
          styles.heroCard,
          {
            borderColor: `${accent}33`,
            backgroundColor: LOGIN.fill,
          },
        ]}
      >
        <View style={styles.heroTop}>
          <View style={[styles.mailIcon, { backgroundColor: accent }]}>
            <Ionicons name="mail" size={26} color="#fff" />
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.titleRow}>
              <Text style={[loginType.panelTitle, styles.title, { color: LOGIN.label }]}>Verify your email</Text>
              <View style={[styles.studentBadge, { borderColor: `${accent}55`, backgroundColor: `${accent}18` }]}>
                <Text style={[styles.studentBadgeText, { color: accent }]}>Student</Text>
              </View>
            </View>
            <Text style={[loginType.panelDescription, { color: LOGIN.secondaryLabel }]}>
              We sent a verification link to{" "}
              <Text style={{ color: LOGIN.label, fontWeight: "700" }}>{request?.email}</Text>. Open it to continue —
              then {portalLabel} can approve your enrollment.
            </Text>
          </View>
        </View>

        <View style={[styles.summary, { borderColor: LOGIN.separator, backgroundColor: LOGIN.grouped }]}>
          {request?.fullName ? (
            <SummaryRow label="Name" value={request.fullName} />
          ) : null}
          {request?.section ? (
            <SummaryRow label="Course / section" value={request.section} isLast />
          ) : null}
        </View>

        <View style={styles.checklist}>
          {CHECKLIST.map((item, index) => (
            <Animated.View
              key={item.key}
              entering={FadeInDown.delay(80 + index * 60).duration(260)}
              style={styles.checkRow}
            >
              <View
                style={[
                  styles.checkDot,
                  item.active
                    ? { backgroundColor: accent, borderColor: accent }
                    : { borderColor: LOGIN.separator, backgroundColor: "transparent" },
                ]}
              >
                <Text style={[styles.checkDotText, { color: item.active ? "#fff" : LOGIN.secondaryLabel }]}>
                  {item.active ? "1" : "·"}
                </Text>
              </View>
              <Text
                style={[
                  loginType.body,
                  {
                    color: item.active ? LOGIN.label : LOGIN.secondaryLabel,
                    fontWeight: item.active ? "700" : "500",
                  },
                ]}
              >
                {item.label}
              </Text>
            </Animated.View>
          ))}
        </View>

        <View style={[styles.hint, { borderColor: `${accent}44`, backgroundColor: `${accent}10` }]}>
          <Text style={[loginType.info, { color: LOGIN.secondaryLabel, lineHeight: 18 }]}>{EMAIL_INBOX_HINT}</Text>
        </View>
      </View>

      <LoginButton
        label={resending ? "Sending…" : "Resend verification email"}
        onPress={() => void handleResend()}
        loading={resending}
        disabled={resending || !request?.email}
        backgroundColor={accent}
      />
      {resendMessage ? (
        <Text style={[loginType.info, styles.resendMessage, { color: LOGIN.secondaryLabel }]}>{resendMessage}</Text>
      ) : null}

      <Pressable
        onPress={() => void Linking.openURL(`${PRODUCTION_API_BASE_URL}/student/help`)}
        style={({ pressed }) => [styles.helpLink, pressed && styles.pressed]}
        accessibilityRole="link"
      >
        <Ionicons name="help-circle-outline" size={18} color={accent} />
        <Text style={[loginType.link, { color: accent }]}>Help</Text>
      </Pressable>

      {onBack ? <LoginBackLink label="Back to sign in" onPress={onBack} /> : null}
    </Animated.View>
  )
}

function SummaryRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  const { LOGIN, loginType } = useLoginTheme()
  return (
    <View style={[styles.summaryRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LOGIN.separator }]}>
      <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>{label}</Text>
      <Text style={[loginType.body, styles.summaryValue, { color: LOGIN.label }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
    alignSelf: "stretch",
  },
  heroCard: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 24,
    padding: 18,
    gap: 16,
  },
  heroTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  mailIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  title: {
    textAlign: "left",
  },
  studentBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  studentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  summary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  summaryValue: {
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },
  checklist: {
    gap: 10,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkDotText: {
    fontSize: 12,
    fontWeight: "800",
  },
  hint: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resendMessage: {
    textAlign: "center",
  },
  helpLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.7,
  },
})
