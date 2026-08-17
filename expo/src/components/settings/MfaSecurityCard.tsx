import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NativeSelect } from "../NativeSelect"
import { NativeSwitch } from "../NativeSwitch"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useSession } from "../../context/SessionProvider"
import { copyToClipboard } from "../../lib/copy-to-clipboard"
import { mfaApi, mfaErrorMessage, mfaStatusLoginKey } from "../../lib/mfa-api"
import { MFA_TRUST_OPTIONS, type MfaUserType } from "../../lib/mfa-types"
import { useNativeType } from "../../lib/themed-module-theme"
import { useFacultySheetSurfaces } from "../faculty/faculty-collab-sheet-ui"

type Props = {
  userType: MfaUserType
  userId: number | string
  /** Email / username shown in authenticator apps. */
  accountName?: string
  variant?: "sheet" | "faculty"
}

type Phase = "status" | "enroll" | "recovery" | "disable"

/**
 * Settings → Security MFA card.
 * MFA is off by default; enable via QR + code, disable with a TOTP code.
 */
export function MfaSecurityCard({ userType, userId, accountName, variant = "sheet" }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const surfaces = useFacultySheetSurfaces()
  const { session } = useSession()

  const resolvedAccountName = useMemo(() => {
    if (accountName?.trim()) return accountName.trim()
    if (session?.portal === "student") {
      return (session.email ?? session.authIdentifier ?? session.id).trim()
    }
    if (session?.portal === "guest" || session?.portal === "summer") {
      return (session.name || session.id).trim()
    }
    if (session?.portal === "faculty") {
      return (session.email ?? session.authIdentifier ?? session.username).trim()
    }
    if (session?.portal === "admin") {
      return session.username.trim()
    }
    return `user-${userId}`
  }, [accountName, session, userId])

  const loginKey = useMemo(() => {
    if (userType === "student" && session?.portal === "student") {
      return mfaStatusLoginKey({
        userType: "student",
        universityId: session.universityId,
        authIdentifier: session.authIdentifier ?? session.email ?? session.id,
      })
    }
    if (userType === "student" && (session?.portal === "guest" || session?.portal === "summer")) {
      return mfaStatusLoginKey({
        userType: "student",
        universityId: 0,
        authIdentifier: session.id,
      })
    }
    if (userType === "instructor" && session?.portal === "faculty") {
      return mfaStatusLoginKey({
        userType: "instructor",
        authIdentifier: session.authIdentifier ?? session.email ?? session.username,
        username: session.username,
      })
    }
    if (userType === "admin" && session?.portal === "admin") {
      return mfaStatusLoginKey({
        userType: "admin",
        authIdentifier: session.username,
        username: session.username,
      })
    }
    return null
  }, [session, userType])

  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [required, setRequired] = useState(false)
  const [unusedRecoveryCodes, setUnusedRecoveryCodes] = useState(0)
  const [trustDurationDays, setTrustDurationDays] = useState("7")
  const [savedTrustDurationDays, setSavedTrustDurationDays] = useState("7")
  const [savingTrust, setSavingTrust] = useState(false)
  const [trustSaved, setTrustSaved] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>("status")
  const [enrollmentToken, setEnrollmentToken] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [manualKey, setManualKey] = useState<string | null>(null)
  const [showManualKey, setShowManualKey] = useState(false)
  const [code, setCode] = useState("")
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [copied, setCopied] = useState(false)

  const trustDirty = trustDurationDays !== savedTrustDurationDays

  const refreshStatus = async () => {
    const data = await mfaApi.getStatus(userType, userId, loginKey)
    setEnabled(Boolean(data.enabled))
    setRequired(Boolean(data.required))
    setUnusedRecoveryCodes(Number(data.unusedRecoveryCodes ?? 0))
    const days = String(data.trustDurationDays ?? 7)
    setTrustDurationDays(days)
    setSavedTrustDurationDays(days)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await refreshStatus()
      } catch (err) {
        if (!cancelled) setError(mfaErrorMessage(err, "Could not load MFA status."))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per identity
  }, [userType, userId, loginKey])

  const startEnroll = async () => {
    setBusy(true)
    setError("")
    setCode("")
    try {
      const data = await mfaApi.settingsEnrollStart({
        userType,
        userId,
        accountName: resolvedAccountName,
      })
      setEnrollmentToken(data.enrollmentToken)
      setQrDataUrl(data.qrDataUrl)
      setManualKey(data.manualKey)
      setPhase("enroll")
    } catch (err) {
      setError(mfaErrorMessage(err, "Could not start two-factor setup."))
    } finally {
      setBusy(false)
    }
  }

  const confirmEnroll = async () => {
    if (!enrollmentToken || code.trim().length !== 6) return
    setBusy(true)
    setError("")
    try {
      const data = await mfaApi.settingsEnrollConfirm({
        userType,
        userId,
        enrollmentToken,
        code,
      })
      setEnabled(true)
      setRecoveryCodes(data.recoveryCodes ?? [])
      setPhase("recovery")
      setCode("")
      setEnrollmentToken(null)
      setQrDataUrl(null)
      setManualKey(null)
    } catch (err) {
      setCode("")
      setError(mfaErrorMessage(err, "Could not enable two-factor."))
    } finally {
      setBusy(false)
    }
  }

  const finishRecovery = async () => {
    setRecoveryCodes(null)
    setPhase("status")
    try {
      await refreshStatus()
    } catch {
      /* keep enabled UI */
    }
  }

  const disableWithCode = async () => {
    if (code.trim().length !== 6) return
    setBusy(true)
    setError("")
    try {
      await mfaApi.settingsDisable({
        userType,
        userId,
        code,
        loginKey,
      })
      setEnabled(false)
      setUnusedRecoveryCodes(0)
      setPhase("status")
      setCode("")
    } catch (err) {
      setCode("")
      setError(mfaErrorMessage(err, "Could not disable two-factor."))
    } finally {
      setBusy(false)
    }
  }

  const onToggle = (next: boolean) => {
    setError("")
    if (next) {
      void startEnroll()
      return
    }
    setCode("")
    setPhase("disable")
  }

  const saveTrustDuration = async () => {
    if (!trustDirty || savingTrust) return
    setTrustSaved(false)
    setSavingTrust(true)
    setError("")
    try {
      const updated = await mfaApi.updateTrustDuration(
        userType,
        userId,
        Number(trustDurationDays),
        loginKey,
      )
      const days = String(updated)
      setTrustDurationDays(days)
      setSavedTrustDurationDays(days)
      setTrustSaved(true)
      setTimeout(() => setTrustSaved(false), 2500)
    } catch (err) {
      setError(mfaErrorMessage(err, "Could not update trust duration."))
    } finally {
      setSavingTrust(false)
    }
  }

  const cardStyle = variant === "faculty" ? styles.facultyCard : styles.sheetCard
  const cardBackground = variant === "faculty" ? surfaces.cardBg : tokens.surface
  const cardBorder = variant === "faculty" ? surfaces.cardBorder : tokens.border

  return (
    <View
      style={[
        cardStyle,
        {
          backgroundColor: cardBackground,
          borderColor: cardBorder,
        },
      ]}
    >
      <View style={styles.titleRow}>
        <View style={[styles.iconTile, { backgroundColor: `${tokens.success}18` }]}>
          <Ionicons name="shield-checkmark" size={18} color={tokens.success} />
        </View>
        <Text style={[type.bodyEmphasis, { flex: 1 }]}>Two-factor authentication</Text>
        {!loading && phase === "status" ? (
          <NativeSwitch
            value={enabled}
            onValueChange={onToggle}
            disabled={busy}
            accessibilityLabel="Enable two-factor authentication"
          />
        ) : null}
      </View>

      <Text style={[type.footnote, styles.description]}>Optional. Off by default — turn on to require an authenticator code at sign-in. Use Google
        Authenticator, Authy, or 1Password.
        {required ? " Your institution may still require MFA for some actions." : ""}
      </Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={tokens.accent} />
          <Text style={type.footnote}>Loading security status…</Text>
        </View>
      ) : null}

      {!loading && phase === "status" && enabled ? (
        <>
          <Text style={[type.footnote, { color: tokens.success, fontWeight: "600" }]}>
            Enabled on your account
          </Text>
          <Text style={type.footnote}>
            {unusedRecoveryCodes > 0
              ? `${unusedRecoveryCodes} unused backup code${unusedRecoveryCodes === 1 ? "" : "s"} remaining.`
              : "No backup codes left — contact support if you lose your authenticator device."}
          </Text>

          <View style={[styles.trustSection, { borderTopColor: native.separator }]}>
            <Text style={type.bodyEmphasis}>Remember this device</Text>
            <Text style={[type.footnote, styles.trustHint]}>
              After you verify once, this phone is trusted for the period below so the next sign-in
              only needs your password.
            </Text>
            <NativeSelect
              label="Trust duration"
              placeholder="Select duration"
              value={trustDurationDays}
              options={MFA_TRUST_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              onChange={setTrustDurationDays}
              disabled={savingTrust}
              variant="grouped"
            />
            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: trustDirty ? tokens.accent : tokens.native.fill },
                (!trustDirty || savingTrust) && styles.saveBtnDisabled,
              ]}
              onPress={() => void saveTrustDuration()}
              disabled={!trustDirty || savingTrust}
              accessibilityRole="button"
              accessibilityLabel="Save trust duration"
            >
              {savingTrust ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="save-outline"
                  size={16}
                  color={trustDirty ? "#FFFFFF" : native.tertiaryLabel}
                />
              )}
              <Text
                style={[styles.saveBtnLabel, { color: trustDirty ? "#FFFFFF" : native.tertiaryLabel }]}
              >
                {savingTrust ? "Saving…" : trustSaved ? "Saved" : "Save trust duration"}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {!loading && phase === "status" && !enabled ? (
        <Text style={type.footnote}>
          Not enabled. Toggle on to scan a QR code and protect future sign-ins.
        </Text>
      ) : null}

      {phase === "enroll" ? (
        <View style={styles.enrollBlock}>
          {busy && !qrDataUrl ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={tokens.accent} />
              <Text style={type.footnote}>Preparing QR code…</Text>
            </View>
          ) : null}
          {qrDataUrl ? (
            <>
              <Image
                source={{ uri: qrDataUrl }}
                style={styles.qrImage}
                accessibilityLabel="Scan with authenticator app"
              />
              <Pressable onPress={() => setShowManualKey((v) => !v)}>
                <Text style={[type.footnote, { color: native.tint, fontWeight: "600" }]}>
                  {showManualKey ? "Hide setup key" : "Enter setup key instead"}
                </Text>
              </Pressable>
              {showManualKey && manualKey ? (
                <Text selectable style={[styles.manualKey, { color: native.label }]}>
                  {manualKey}
                </Text>
              ) : null}
              <Text style={type.footnote}>
                Enter the 6-digit code from your authenticator to finish enabling.
              </Text>
              <TextInput
                value={code}
                onChangeText={(raw) => setCode(raw.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={native.tertiaryLabel}
                style={[
                  styles.codeInput,
                  {
                    color: native.label,
                    borderColor: native.separator,
                    backgroundColor: native.fill,
                  },
                ]}
              />
              <Pressable
                style={[styles.saveBtn, { backgroundColor: tokens.accent }, busy && styles.saveBtnDisabled]}
                onPress={() => void confirmEnroll()}
                disabled={busy || code.length !== 6}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.saveBtnLabel, { color: "#fff" }]}>Confirm & enable</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setPhase("status")
                  setEnrollmentToken(null)
                  setQrDataUrl(null)
                  setManualKey(null)
                  setCode("")
                }}
              >
                <Text style={[type.footnote, { color: native.tertiaryLabel, textAlign: "center" }]}>
                  Cancel
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      {phase === "recovery" && recoveryCodes ? (
        <View style={styles.enrollBlock}>
          <Text style={type.bodyEmphasis}>Save backup codes</Text>
          <Text style={type.footnote}>
            Each code works once. Store them somewhere safe before continuing.
          </Text>
          <View style={[styles.codesGroup, { borderColor: native.separator }]}>
            {recoveryCodes.map((entry) => (
              <Text key={entry} selectable style={[styles.codeRowText, { color: native.label }]}>
                {entry}
              </Text>
            ))}
          </View>
          <Pressable
            onPress={() => {
              void copyToClipboard(recoveryCodes.join("\n")).then((ok) => {
                if (ok) {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }
              })
            }}
          >
            <Text style={[type.footnote, { color: native.tint, fontWeight: "600" }]}>
              {copied ? "Copied" : "Copy all codes"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, { backgroundColor: tokens.accent }]}
            onPress={() => void finishRecovery()}
          >
            <Text style={[styles.saveBtnLabel, { color: "#fff" }]}>I’ve saved these</Text>
          </Pressable>
        </View>
      ) : null}

      {phase === "disable" ? (
        <View style={styles.enrollBlock}>
          <Text style={type.footnote}>
            Enter a current authenticator code to turn off two-factor.
          </Text>
          <TextInput
            value={code}
            onChangeText={(raw) => setCode(raw.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={native.tertiaryLabel}
            style={[
              styles.codeInput,
              {
                color: native.label,
                borderColor: native.separator,
                backgroundColor: native.fill,
              },
            ]}
          />
          <Pressable
            style={[styles.saveBtn, { backgroundColor: tokens.danger }, busy && styles.saveBtnDisabled]}
            onPress={() => void disableWithCode()}
            disabled={busy || code.length !== 6}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.saveBtnLabel, { color: "#fff" }]}>Turn off two-factor</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              setPhase("status")
              setCode("")
            }}
          >
            <Text style={[type.footnote, { color: native.tertiaryLabel, textAlign: "center" }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <Text style={[type.footnote, { color: tokens.danger, marginTop: 8 }]}>{error}</Text>
      ) : null}
    </View>
  )
}

/** Alias matching the mobile implementation guide name. */
export const MfaSecurityStatusCard = MfaSecurityCard

const styles = StyleSheet.create({
  sheetCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  facultyCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  description: { lineHeight: 18 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  trustSection: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  trustHint: { lineHeight: 18 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.72 },
  saveBtnLabel: { fontSize: 15, fontWeight: "600" },
  enrollBlock: { gap: 10, marginTop: 4 },
  qrImage: {
    width: 168,
    height: 168,
    borderRadius: 12,
    alignSelf: "center",
    backgroundColor: "#fff",
  },
  manualKey: {
    fontFamily: "Menlo",
    fontSize: 13,
    lineHeight: 18,
  },
  codeInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 6,
    textAlign: "center",
  },
  codesGroup: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  codeRowText: {
    fontFamily: "Menlo",
    fontSize: 14,
  },
})
