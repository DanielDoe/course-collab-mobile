import type { ReactNode } from "react"
import { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useLoginTheme } from "./login-theme"

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
  const { loginType } = useLoginTheme()
  const tokens = useAppThemeTokens()
  return (
    <View
      style={[
        loginInlineErrorStyles.box,
        {
          backgroundColor: `${tokens.danger}12`,
          borderColor: `${tokens.danger}33`,
        },
      ]}
      accessibilityRole="alert"
    >
      <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} style={loginInlineErrorStyles.icon} />
      <Text style={[loginType.info, loginInlineErrorStyles.text, { color: tokens.danger }]}>{message}</Text>
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
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    lineHeight: 18,
  },
})
