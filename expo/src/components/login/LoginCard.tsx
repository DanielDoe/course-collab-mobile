import type { ReactNode } from "react"
import { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useLoginTheme } from "./login-theme"
import {
  STUDENT_LOGIN_NOT_FOUND_ERROR,
  STUDENT_LOGIN_NOT_FOUND_HINT,
} from "../../lib/student-login-errors"

function splitLoginErrorMessage(message: string): { title: string; hint?: string } {
  const trimmed = message.trim()
  if (!trimmed) return { title: "Something went wrong." }

  if (/no account found/i.test(trimmed)) {
    return {
      title: STUDENT_LOGIN_NOT_FOUND_ERROR,
      hint: STUDENT_LOGIN_NOT_FOUND_HINT,
    }
  }

  const parts = trimmed.split(/\n\n+/).map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return { title: parts[0], hint: parts.slice(1).join("\n\n") }
  }
  return { title: trimmed }
}

function useLoginCardStyles() {
  const { LOGIN, loginType } = useLoginTheme()
  const tokens = useAppThemeTokens()
  return useMemo(
    () =>
      StyleSheet.create({
        stepSection: { gap: 10 },
        stepHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        },
        stepLabelRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
        stepBody: { gap: 10 },
        stepBadge: {
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
        },
        stepBadgeText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
        fieldGroup: {
          gap: 12,
        },
        formBlock: {
          gap: 12,
        },
        infoBanner: {
          backgroundColor: LOGIN.accentSoft,
          borderRadius: LOGIN.sectionRadius,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: LOGIN.softBorder,
        },
        infoText: {
          ...loginType.info,
          color: tokens.isDark ? tokens.native.label : tokens.native.secondaryLabel,
          lineHeight: 20,
        },
        passwordHint: {
          backgroundColor: LOGIN.goldSoft,
          borderRadius: LOGIN.sectionRadius,
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 4,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: `${tokens.warning}33`,
        },
        passwordHintTitle: { fontSize: 13, fontWeight: "600", color: LOGIN.purpleDark },
        passwordHintCode: { fontWeight: "700", color: LOGIN.purple },
      }),
    [LOGIN, loginType, tokens],
  )
}

export function StepBadge({ step }: { step: number }) {
  const { LOGIN } = useLoginTheme()
  const styles = useLoginCardStyles()
  return (
    <View style={[styles.stepBadge, { backgroundColor: LOGIN.purple }]}>
      <Text style={styles.stepBadgeText}>{step}</Text>
    </View>
  )
}

export function StepSection({
  step,
  label,
  action,
  children,
}: {
  step?: number
  label: string
  action?: ReactNode
  children: ReactNode
}) {
  const { loginType } = useLoginTheme()
  const styles = useLoginCardStyles()
  return (
    <View style={styles.stepSection}>
      <View style={styles.stepHeader}>
        <View style={styles.stepLabelRow}>
          {step != null ? <StepBadge step={step} /> : null}
          <Text style={loginType.stepLabel}>{label}</Text>
        </View>
        {action}
      </View>
      <View style={styles.stepBody}>{children}</View>
    </View>
  )
}

export function InfoBanner({ children }: { children: ReactNode }) {
  const styles = useLoginCardStyles()
  return (
    <View style={styles.infoBanner}>
      <Text style={styles.infoText}>{children}</Text>
    </View>
  )
}

export function LoginInlineError({ message }: { message: string }) {
  const { LOGIN, loginType } = useLoginTheme()
  const tokens = useAppThemeTokens()
  const { title, hint } = splitLoginErrorMessage(message)

  return (
    <View
      style={[
        loginInlineErrorStyles.box,
        {
          backgroundColor: tokens.isDark ? `${tokens.danger}14` : "#FEF2F2",
          borderColor: tokens.isDark ? `${tokens.danger}55` : `${tokens.danger}33`,
        },
      ]}
      accessibilityRole="alert"
    >
      <View
        style={[
          loginInlineErrorStyles.iconTile,
          { backgroundColor: tokens.isDark ? `${tokens.danger}24` : `${tokens.danger}18` },
        ]}
      >
        <Ionicons name="alert-circle" size={18} color={tokens.danger} />
      </View>
      <View style={loginInlineErrorStyles.copy}>
        <Text style={[loginInlineErrorStyles.title, { color: tokens.danger }]}>{title}</Text>
        {hint ? (
          <Text style={[loginType.info, loginInlineErrorStyles.hint, { color: LOGIN.secondaryLabel }]}>
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return <LoginInlineError message={message} />
}

export function PasswordHintBanner({ courseLabel, password }: { courseLabel: string; password: string }) {
  const { LOGIN, loginType } = useLoginTheme()
  const styles = useLoginCardStyles()
  return (
    <View style={styles.passwordHint}>
      <Text style={styles.passwordHintTitle}>Default roster password</Text>
      <Text style={loginType.info}>
        For {courseLabel}, first-time sign-in uses{" "}
        <Text style={styles.passwordHintCode}>{password}</Text> unless your instructor told you otherwise.
      </Text>
    </View>
  )
}

export function LoginFieldGroup({ children }: { children: ReactNode }) {
  const styles = useLoginCardStyles()
  return <View style={styles.fieldGroup}>{children}</View>
}

export function FormBlock({ children }: { children: ReactNode }) {
  const styles = useLoginCardStyles()
  return <View style={styles.formBlock}>{children}</View>
}

const loginInlineErrorStyles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  hint: {
    lineHeight: 20,
  },
})
