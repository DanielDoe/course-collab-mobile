import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import {
  ActivityIndicator,
  Image,
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
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BRAND } from "../../constants"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE, nativeType } from "../../constants/faculty-native-theme"
import { mfaApi, mfaErrorMessage } from "../../lib/mfa-api"
import { copyToClipboard } from "../../lib/copy-to-clipboard"
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

const AUTH_APPS = "Google Authenticator, Authy, or 1Password"
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

export function MfaLoginStep({
  state,
  portalLabel = "CourseCollab",
  university = null,
  backLabel = "Back to sign in",
  showChrome = true,
  onComplete,
  onBack,
}: Props) {
  const { LOGIN, loginType } = useLoginTheme()

  const [enroll, setEnroll] = useState<{
    qrDataUrl: string
    manualKey: string
    accountName: string
    issuer: string
  } | null>(null)
  const [code, setCode] = useState("")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [useRecovery, setUseRecovery] = useState(false)
  const [preparingQr, setPreparingQr] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState("")
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [copied, setCopied] = useState<"key" | "codes" | null>(null)
  const [showManualKey, setShowManualKey] = useState(false)
  const submitLock = useRef(false)
  const completedRef = useRef(false)
  const lastSubmittedCodeRef = useRef<string | null>(null)
  const pendingLoginPayload = useRef<Record<string, unknown> | null>(null)

  const loadEnrollment = useCallback(async () => {
    setPreparingQr(true)
    setError("")
    try {
      const data = await mfaApi.enrollStart(state.challengeToken)
      setEnroll(data)
    } catch (err) {
      setError(mfaErrorMessage(err, "Setup failed"))
    } finally {
      setPreparingQr(false)
    }
  }, [state.challengeToken])

  useEffect(() => {
    if (state.requiresSetup) void loadEnrollment()
  }, [state.requiresSetup, loadEnrollment])

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

  const submitEnroll = useCallback(async () => {
    if (submitLock.current || completedRef.current) return
    submitLock.current = true
    setAuthenticating(true)
    setError("")
    lastSubmittedCodeRef.current = `enroll:${code}`
    try {
      const data = await mfaApi.enrollConfirm(state.challengeToken, code)
      if (Array.isArray(data.recoveryCodes) && data.recoveryCodes.length > 0) {
        pendingLoginPayload.current = data
        setRecoveryCodes(data.recoveryCodes as string[])
      } else {
        await onComplete(data)
        completedRef.current = true
      }
    } catch (err) {
      lastSubmittedCodeRef.current = null
      setCode("")
      setError(mfaErrorMessage(err, "Setup failed"))
    } finally {
      submitLock.current = false
      setAuthenticating(false)
    }
  }, [code, onComplete, state.challengeToken])

  const runSubmit = useCallback(() => {
    if (useRecovery) {
      if (!recoveryCode.trim()) return
      void submitVerify()
      return
    }
    if (code.length !== 6) return
    void (state.requiresSetup ? submitEnroll() : submitVerify())
  }, [code.length, recoveryCode, state.requiresSetup, submitEnroll, submitVerify, useRecovery])

  useEffect(() => {
    if (useRecovery || authenticating || submitLock.current || completedRef.current) return
    if (code.length !== 6) return
    if (state.requiresSetup && !enroll) return
    const submittedKey = useRecovery ? `recovery:${recoveryCode.trim()}` : `totp:${code}`
    if (lastSubmittedCodeRef.current === submittedKey) return
    runSubmit()
  }, [authenticating, code, enroll, recoveryCode, runSubmit, state.requiresSetup, useRecovery])

  const copyText = async (text: string, kind: "key" | "codes") => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const finishAfterRecoveryCodes = () => {
    const payload = pendingLoginPayload.current
    pendingLoginPayload.current = null
    if (!payload || completedRef.current) return
    completedRef.current = true
    void Promise.resolve(onComplete(payload)).catch((err) => {
      completedRef.current = false
      setRecoveryCodes(null)
      setError(mfaErrorMessage(err, "Sign in failed after saving backup codes."))
    })
  }

  const title = state.requiresSetup ? "Set Up Authenticator" : "Two-Factor Code"
  const subtitle = state.requiresSetup
    ? `${portalLabel} requires an authenticator app to protect student records.`
    : "Enter the 6-digit code from your authenticator app."
  const showFieldLabel = state.requiresSetup

  if (recoveryCodes) {
    const recoveryBody = (
      <View style={styles.stack}>
        <View style={[styles.codesGroup, { backgroundColor: LOGIN.grouped, borderColor: LOGIN.separator }]}>
          {recoveryCodes.map((entry, index) => (
            <View
              key={entry}
              style={[
                styles.codeRow,
                index < recoveryCodes.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: LOGIN.separator,
                },
              ]}
            >
              <Text style={[styles.codeRowText, { color: LOGIN.label }]} selectable>
                {entry}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => void copyText(recoveryCodes.join("\n"), "codes")}
          style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={[loginType.link, { color: BRAND.purpleLight }]}>
            {copied === "codes" ? "Copied" : "Copy All Codes"}
          </Text>
        </Pressable>

        <LoginButton label="Continue" onPress={finishAfterRecoveryCodes} />
      </View>
    )

    if (!showChrome) {
      return (
        <MfaLayout
          showChrome={false}
          title="Save Backup Codes"
          subtitle="Each code works once. Store them somewhere safe before continuing."
          university={university}
          backLabel={backLabel}
          onBack={onBack}
        >
          {recoveryBody}
        </MfaLayout>
      )
    }

    return (
      <MfaLayout
        showChrome
        title="Save Backup Codes"
        subtitle="Each code works once. Store them somewhere safe before continuing."
        university={university}
        backLabel={backLabel}
        onBack={onBack}
      >
        {recoveryBody}
      </MfaLayout>
    )
  }

  const formBody = (
    <View style={styles.form}>
      {state.requiresSetup ? (
        <View style={styles.setupSection}>
          {preparingQr && !enroll ? (
            <View style={styles.loadingInline}>
              <ActivityIndicator color={MFA_ACCENT} />
              <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>Preparing QR code…</Text>
            </View>
          ) : null}

          {enroll ? (
            <View style={styles.enrollBlock}>
              <Text style={[nativeType.sectionHeader, styles.sectionLabel, { color: LOGIN.secondaryLabel }]}>
                Scan QR Code
              </Text>
              <View style={styles.qrBlock}>
                <Image
                  source={{ uri: enroll.qrDataUrl }}
                  style={styles.qrImage}
                  accessibilityLabel="Scan with authenticator app"
                />
                <Text style={[loginType.info, styles.qrHint, { color: LOGIN.secondaryLabel }]}>
                  Add a new account in {AUTH_APPS}, then scan this code.
                </Text>
                <Pressable
                  onPress={() => setShowManualKey((value) => !value)}
                  style={({ pressed }) => [styles.textActionInline, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Text style={[loginType.link, { color: BRAND.purpleLight }]}>
                    {showManualKey ? "Hide Setup Key" : "Enter Setup Key Instead"}
                  </Text>
                </Pressable>
              </View>

              {showManualKey ? (
                <View style={[styles.manualKeyGroup, { borderColor: LOGIN.separator }]}>
                  <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
                    Account: <Text style={{ color: LOGIN.label }}>{enroll.accountName}</Text>
                  </Text>
                  <View style={styles.manualKeyRow}>
                    <Text selectable style={[styles.manualKey, { color: LOGIN.label }]}>
                      {enroll.manualKey}
                    </Text>
                    <Pressable
                      onPress={() => void copyText(enroll.manualKey, "key")}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Copy setup key"
                    >
                      <Ionicons
                        name={copied === "key" ? "checkmark" : "copy-outline"}
                        size={20}
                        color={MFA_ACCENT}
                      />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={[styles.sectionDividerRow, { marginTop: 4 }]}>
                <View style={[styles.sectionDividerLine, { backgroundColor: LOGIN.separator }]} />
                <Text style={[loginType.info, styles.sectionDividerLabel, { color: LOGIN.secondaryLabel }]}>
                  Enter the 6-digit code
                </Text>
                <View style={[styles.sectionDividerLine, { backgroundColor: LOGIN.separator }]} />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {!useRecovery ? (
        <View style={styles.codeSection}>
          {showFieldLabel ? (
            <Text style={[loginType.fieldLabel, styles.codeLabel, { color: LOGIN.secondaryLabel }]}>
              Authentication code
            </Text>
          ) : null}
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
        <LoginButton label="Verify & Sign In" onPress={runSubmit} disabled={!recoveryCode.trim() || authenticating} />
      ) : null}

      {!state.requiresSetup ? (
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
      ) : null}
    </View>
  )

  return (
    <MfaLayout
      showChrome={showChrome}
      title={title}
      subtitle={subtitle}
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
  setupSection: { gap: 16, alignSelf: "stretch" },
  stack: { gap: 16, alignSelf: "stretch" },
  pressed: { opacity: Platform.OS === "ios" ? 0.55 : 0.88 },
  codeSection: {
    gap: 10,
    alignSelf: "stretch",
    alignItems: "center",
  },
  codeLabel: { alignSelf: "stretch", textAlign: "center" },
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
  enrollBlock: { gap: 12, alignSelf: "stretch" },
  sectionLabel: { textTransform: "none", textAlign: "center" },
  sectionDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
  },
  sectionDividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  sectionDividerLabel: { fontSize: 12, fontWeight: "500" },
  qrBlock: { alignItems: "center", gap: 10, alignSelf: "stretch" },
  qrImage: {
    width: 168,
    height: 168,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  qrHint: { textAlign: "center", lineHeight: 18 },
  textActionInline: { paddingVertical: 2, alignSelf: "center" },
  textAction: { alignSelf: "center", paddingVertical: 2 },
  manualKeyGroup: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 8,
  },
  manualKeyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  manualKey: {
    flex: 1,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 13,
    lineHeight: 18,
  },
  trustFootnote: { lineHeight: 18, textAlign: "center", maxWidth: 280 },
  loadingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  codesGroup: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  codeRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  codeRowText: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 15,
  },
})
