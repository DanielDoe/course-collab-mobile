import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NativeSelect } from "../NativeSelect"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useSession } from "../../context/SessionProvider"
import { NATIVE, nativeType } from "../../constants/faculty-native-theme"
import { mfaApi, mfaErrorMessage, mfaStatusLoginKey } from "../../lib/mfa-api"
import { MFA_TRUST_OPTIONS, type MfaUserType } from "../../lib/mfa-types"

type Props = {
  userType: MfaUserType
  userId: number | string
  variant?: "sheet" | "faculty"
}

export function MfaSecurityCard({ userType, userId, variant = "sheet" }: Props) {
  const tokens = useAppThemeTokens()
  const { session } = useSession()
  const loginKey = useMemo(() => {
    if (userType === "student" && session?.portal === "student") {
      return mfaStatusLoginKey({
        userType: "student",
        universityId: session.universityId,
        authIdentifier: session.authIdentifier ?? session.email ?? session.id,
      })
    }
    if (userType === "instructor" && session?.portal === "faculty") {
      return mfaStatusLoginKey({
        userType: "instructor",
        authIdentifier: session.authIdentifier ?? session.email ?? session.username,
        username: session.username,
      })
    }
    return null
  }, [session, userType])

  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [unusedRecoveryCodes, setUnusedRecoveryCodes] = useState(0)
  const [trustDurationDays, setTrustDurationDays] = useState("7")
  const [savedTrustDurationDays, setSavedTrustDurationDays] = useState("7")
  const [savingTrust, setSavingTrust] = useState(false)
  const [trustSaved, setTrustSaved] = useState(false)
  const [error, setError] = useState("")

  const trustDirty = trustDurationDays !== savedTrustDurationDays

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await mfaApi.getStatus(userType, userId, loginKey)
        if (!cancelled) {
          setEnabled(Boolean(data.enabled))
          setUnusedRecoveryCodes(Number(data.unusedRecoveryCodes ?? 0))
          const days = String(data.trustDurationDays ?? 7)
          setTrustDurationDays(days)
          setSavedTrustDurationDays(days)
        }
      } catch (err) {
        if (!cancelled) setError(mfaErrorMessage(err, "Could not load MFA status."))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userType, userId, loginKey])

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

  return (
    <View
      style={[
        cardStyle,
        {
          backgroundColor: variant === "faculty" ? NATIVE.secondaryGrouped : tokens.surface,
          borderColor: tokens.border,
        },
      ]}
    >
      <View style={styles.titleRow}>
        <View style={[styles.iconTile, { backgroundColor: `${tokens.success}18` }]}>
          <Ionicons name="shield-checkmark" size={18} color={tokens.success} />
        </View>
        <Text style={[nativeType.bodyEmphasis, { color: tokens.text, flex: 1 }]}>
          Two-factor authentication
        </Text>
      </View>

      <Text style={[nativeType.footnote, styles.description, { color: tokens.textSecondary }]}>
        Required for all users to protect student records (FERPA). Use Google Authenticator, Authy, or any
        TOTP app.
      </Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={tokens.accent} />
          <Text style={[nativeType.footnote, { color: tokens.textSecondary }]}>Loading security status…</Text>
        </View>
      ) : enabled ? (
        <>
          <Text style={[nativeType.footnote, { color: tokens.success, fontWeight: "600" }]}>
            Enabled on your account
          </Text>
          <Text style={[nativeType.footnote, { color: tokens.textSecondary }]}>
            {unusedRecoveryCodes > 0
              ? `${unusedRecoveryCodes} unused backup code${unusedRecoveryCodes === 1 ? "" : "s"} remaining.`
              : "No backup codes left — contact support if you lose your authenticator device."}
          </Text>

          <View style={[styles.trustSection, { borderTopColor: tokens.border }]}>
            <Text style={[nativeType.bodyEmphasis, { color: tokens.text }]}>Remember this device</Text>
            <Text style={[nativeType.footnote, styles.trustHint, { color: tokens.textSecondary }]}>
              After you verify once, this phone is trusted for the period below. Saving a longer duration
              renews trust on this device immediately so the next sign-in only needs your password.
            </Text>
            <View style={styles.trustRow}>
              <View style={styles.trustSelect}>
                <NativeSelect
                  label="Trust duration"
                  placeholder="Select duration"
                  value={trustDurationDays}
                  options={MFA_TRUST_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  onChange={setTrustDurationDays}
                  disabled={savingTrust}
                  variant="grouped"
                />
              </View>
            </View>
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
                <Ionicons name="save-outline" size={16} color={trustDirty ? "#FFFFFF" : tokens.textMuted} />
              )}
              <Text
                style={[
                  styles.saveBtnLabel,
                  { color: trustDirty ? "#FFFFFF" : tokens.textMuted },
                ]}
              >
                {savingTrust ? "Saving…" : trustSaved ? "Saved" : "Save trust duration"}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Text style={[nativeType.footnote, { color: tokens.warning }]}>
          Not set up yet. You will be prompted to enroll the next time you sign in.
        </Text>
      )}

      {error ? (
        <Text style={[nativeType.footnote, { color: tokens.danger, marginTop: 8 }]}>{error}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  sheetCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  facultyCard: {
    borderRadius: 12,
    padding: 14,
    gap: 10,
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
  trustRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  trustSelect: { flex: 1 },
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
})
