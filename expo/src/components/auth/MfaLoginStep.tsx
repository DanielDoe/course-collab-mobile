import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import * as Clipboard from "expo-clipboard"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BRAND } from "../../constants"
import { hexToRgba } from "../../constants/app-themes"
import { mfaApi, mfaErrorMessage } from "../../lib/mfa-api"
import type { MfaLoginState } from "../../lib/mfa-types"
import type { UniversityRecord } from "../../lib/api"
import { LoginInlineError } from "../login/LoginCard"
import { LoginButton, LoginField } from "../login/LoginButton"
import { LoginBrandHeader } from "../login/LoginBrandHeader"
import { useLoginTheme } from "../login/login-theme"
import { useReliableTextInputFocus } from "../../hooks/useReliableTextInputFocus"

type Props = {
  state: MfaLoginState
  portalLabel?: string
  university?: Pick<UniversityRecord, "logo" | "name" | "short_name" | "primary_color"> | null
  backLabel?: string
  /** When false, parent renders title/back (student login sheet). */
  showChrome?: boolean
  onComplete: (data: Record<string, unknown>) => void | Promise<void>
  onBack: () => void
}

/** MFA keeps CourseCollab brand accent — not the active university appearance theme. */
const MFA_ACCENT = BRAND.purple
const MFA_ACCENT_SOFT = hexToRgba(BRAND.purple, 0.12)

function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6)
}

function OtpCodeField({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const { LOGIN } = useLoginTheme()
  const inputRef = useRef<TextInput>(null)
  const [focused, setFocused] = useState(false)
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "")

  const { focusInput, onFocus, onBlur } = useReliableTextInputFocus(inputRef, !disabled)

  const handleFocus = useCallback(() => {
    onFocus()
    setFocused(true)
  }, [onFocus])

  const handleBlur = useCallback(() => {
    onBlur()
    setFocused(false)
  }, [onBlur])

  const pasteFromClipboard = useCallback(async () => {
    if (disabled) return
    try {
      const text = await Clipboard.getStringAsync()
      const next = normalizeCode(text)
      if (!next) return
      onChange(next)
      focusInput()
    } catch {
      /* ignore clipboard errors */
    }
  }, [disabled, focusInput, onChange])

  useEffect(() => {
    if (disabled) return
    const timer = setTimeout(() => focusInput(), 180)
    return () => clearTimeout(timer)
  }, [disabled, focusInput])

  return (
    <View style={styles.otpWrap}>
      <View style={styles.otpRow} pointerEvents="none">
        {digits.map((digit, index) => {
          const activeCell = focused && value.length === index
          return (
            <View
              key={index}
              style={[
                styles.otpCell,
                {
                  backgroundColor: activeCell ? MFA_ACCENT_SOFT : LOGIN.grouped,
                  borderColor: activeCell ? MFA_ACCENT : LOGIN.separator,
                  borderWidth: activeCell ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[styles.otpDigit, { color: LOGIN.label }]}>{digit}</Text>
            </View>
          )
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(raw) => onChange(normalizeCode(raw))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        editable={!disabled}
        caretHidden
        selectionColor={MFA_ACCENT}
        importantForAutofill="yes"
        contextMenuHidden={false}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={styles.otpInputOverlay}
        accessibilityLabel="Enter 6-digit authentication code"
        accessibilityHint="Type or paste the code from your authenticator app"
      />
      <Pressable
        onPress={() => void pasteFromClipboard()}
        disabled={disabled}
        style={({ pressed }) => [styles.pasteAction, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Paste authentication code"
      >
        <Text style={[styles.pasteActionText, { color: BRAND.purpleLight }]}>Paste code</Text>
      </Pressable>
    </View>
  )
}

function MfaBackButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { loginType } = useLoginTheme()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[loginType.link, styles.backButtonLabel, { color: BRAND.purpleLight }]}>{label}</Text>
    </Pressable>
  )
}

function MfaLayout({
  showChrome,
  title,
  subtitle,
  university,
  backLabel,
  onBack,
  children,
}: {
  showChrome: boolean
  title: string
  subtitle: string
  university?: Pick<UniversityRecord, "logo" | "name" | "short_name" | "primary_color"> | null
  backLabel: string
  onBack: () => void
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const { LOGIN } = useLoginTheme()

  const inner = (
    <View style={styles.layoutInner}>
      <LoginBrandHeader title={title} subtitle={subtitle} university={university} />
      {children}
      <MfaBackButton label={backLabel} onPress={onBack} />
    </View>
  )

  if (showChrome) {
    return (
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: LOGIN.canvas }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          style={styles.screenScroll}
          contentContainerStyle={[
            styles.screenBody,
            {
              paddingTop: insets.top + 28,
              paddingBottom: insets.bottom + 28,
              paddingHorizontal: 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  return <View style={styles.embeddedWrap}>{inner}</View>
}

/**
 * Login MFA gate — only shown when the user already enabled MFA in Settings.
 * Does not force authenticator enrollment at sign-in.
 */
export function MfaLoginStep({
  state,
  university = null,
  backLabel = "Back to sign in",
  showChrome = true,
  onComplete,
  onBack,
}: Props) {
  const { LOGIN, loginType } = useLoginTheme()

  const [code, setCode] = useState("")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [useRecovery, setUseRecovery] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState("")
  const submitLock = useRef(false)
  const completedRef = useRef(false)
  const lastSubmittedCodeRef = useRef<string | null>(null)

  const submitVerify = useCallback(async () => {
    if (submitLock.current || completedRef.current) return
    submitLock.current = true
    setAuthenticating(true)
    setError("")
    const submittedKey = useRecovery ? `recovery:${recoveryCode.trim()}` : `totp:${code}`
    lastSubmittedCodeRef.current = submittedKey
    try {
      const data = await mfaApi.verify({
        challengeToken: state.challengeToken,
        code: useRecovery ? undefined : code,
        recoveryCode: useRecovery ? recoveryCode : undefined,
      })
      await onComplete(data)
      completedRef.current = true
    } catch (err) {
      lastSubmittedCodeRef.current = null
      setCode("")
      setError(mfaErrorMessage(err, "Verification failed"))
    } finally {
      submitLock.current = false
      setAuthenticating(false)
    }
  }, [code, onComplete, recoveryCode, state.challengeToken, useRecovery])

  const runSubmit = useCallback(() => {
    if (useRecovery) {
      if (!recoveryCode.trim()) return
      void submitVerify()
      return
    }
    if (code.length !== 6) return
    void submitVerify()
  }, [code.length, recoveryCode, submitVerify, useRecovery])

  useEffect(() => {
    if (useRecovery || authenticating || submitLock.current || completedRef.current) return
    if (code.length !== 6) return
    const submittedKey = `totp:${code}`
    if (lastSubmittedCodeRef.current === submittedKey) return
    runSubmit()
  }, [authenticating, code, runSubmit, useRecovery])

  if (state.requiresSetup) {
    return (
      <MfaLayout
        showChrome={showChrome}
        title="Authenticator Not Configured"
        subtitle="Two-factor setup belongs in Settings → Password & security. Sign-in will not force enrollment."
        university={university}
        backLabel={backLabel}
        onBack={onBack}
      >
        <LoginInlineError message="Turn MFA on from Settings after password sign-in, or contact support if this account is stuck." />
      </MfaLayout>
    )
  }

  const formBody = (
    <View style={styles.form}>
      {!useRecovery ? (
        <View style={styles.codeSection}>
          <OtpCodeField
            value={code}
            disabled={authenticating}
            onChange={(next) => {
              setError("")
              setCode(next)
            }}
          />
          <Text style={[loginType.info, styles.codeHint, { color: LOGIN.secondaryLabel }]}>
            {authenticating
              ? "Verifying…"
              : code.length === 6
                ? "Verifying automatically…"
                : "Enter the code or tap Paste code after copying from your authenticator."}
          </Text>
        </View>
      ) : (
        <View style={styles.codeSection}>
          <LoginField
            label="Recovery code"
            value={recoveryCode}
            onChangeText={(value) => {
              setError("")
              setRecoveryCode(value)
            }}
            placeholder="XXXXXX-XXXXXX"
            autoCapitalize="characters"
            leadingIcon="key-outline"
          />
        </View>
      )}

      {error ? <LoginInlineError message={error} /> : null}

      {useRecovery ? (
        <LoginButton
          label="Verify & Sign In"
          onPress={runSubmit}
          disabled={!recoveryCode.trim() || authenticating}
        />
      ) : null}

      <View style={styles.footerSection}>
        <Pressable
          onPress={() => {
            setUseRecovery((value) => !value)
            setError("")
            setCode("")
          }}
          style={({ pressed }) => [styles.footerAction, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={[loginType.link, styles.footerLink, { color: BRAND.purpleLight }]}>
            {useRecovery ? "Use Authenticator Code" : "Use a Backup Recovery Code"}
          </Text>
        </Pressable>

        <Text style={[loginType.info, styles.trustFootnote, { color: LOGIN.secondaryLabel }]}>
          Trust duration can be changed in Settings → Password & security.
        </Text>
      </View>
    </View>
  )

  return (
    <MfaLayout
      showChrome={showChrome}
      title="Two-Factor Code"
      subtitle="Enter the 6-digit code from your authenticator app."
      university={university}
      backLabel={backLabel}
      onBack={onBack}
    >
      {formBody}
    </MfaLayout>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignSelf: "stretch", width: "100%" },
  screenScroll: { flex: 1 },
  screenBody: {
    flexGrow: 1,
    alignItems: "stretch",
  },
  embeddedWrap: {
    alignSelf: "stretch",
    paddingVertical: 8,
  },
  layoutInner: {
    gap: 20,
    alignSelf: "stretch",
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 8,
  },
  backButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  form: { gap: 20, alignSelf: "stretch" },
  pressed: { opacity: Platform.OS === "ios" ? 0.55 : 0.88 },
  codeSection: {
    gap: 10,
    alignSelf: "stretch",
    alignItems: "center",
  },
  codeHint: { textAlign: "center" },
  footerSection: {
    alignItems: "center",
    gap: 14,
    paddingTop: 16,
  },
  footerAction: { paddingVertical: 4, paddingHorizontal: 8 },
  footerLink: { textAlign: "center" },
  otpWrap: {
    position: "relative",
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    gap: 10,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  otpInputOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    opacity: 0.02,
    color: "transparent",
    fontSize: 16,
    zIndex: 2,
  },
  pasteAction: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pasteActionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  otpCell: {
    width: 46,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  trustFootnote: { lineHeight: 18, textAlign: "center", maxWidth: 280 },
})
