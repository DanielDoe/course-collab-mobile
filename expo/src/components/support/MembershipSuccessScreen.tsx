import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import type { StudentSession } from "../../lib/session"
import type { MembershipTier } from "../../types/dashboard"
import { getThemedMembershipPlan } from "../../lib/membership-plan-theme"
import { syncStudentMembershipFromStripe } from "../../lib/membership-checkout-api"

type Props = {
  plan?: MembershipTier
  sessionId?: string
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function MembershipSuccessScreen({ plan: planFromRoute }: Props) {
  const session = useStudentSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { membershipTier, refreshStudentData } = useStudentShell()
  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState("")

  const activeTier = planFromRoute ?? membershipTier
  const plan = useMemo(
    () => getThemedMembershipPlan(activeTier, tokens),
    [activeTier, tokens],
  )

  const verify = useCallback(async () => {
    if (!session) return
    setError("")
    setVerifying(true)
    try {
      await syncStudentMembershipFromStripe(session)
      await refreshStudentData?.({ force: true })
      setVerified(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Membership sync is still processing.")
      setVerified(false)
    } finally {
      setVerifying(false)
    }
  }, [refreshStudentData, session])

  useEffect(() => {
    void verify()
  }, [verify])

  const subtitle = verifying
    ? "Verifying your membership…"
    : verified
      ? "Your premium features are now active."
      : "Payment received. Your membership is being activated."

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Membership activated" fallbackHref="/membership" />
      <ModuleScreen disableTopInsetAdjustment error={error} onRetryError={verify}>
        <View style={[styles.hero, { backgroundColor: plan.headerBg, borderColor: plan.softBorder }]}>
          <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
            {verifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle" size={36} color="#fff" />
            )}
          </View>
          <Text style={styles.heroTitle}>Welcome to {plan.name}!</Text>
          <Text style={styles.heroSubtitle}>{subtitle}</Text>
        </View>

        <ModuleSection title="Your perks">
          {plan.perks.slice(0, 6).map((perk) => (
            <View key={perk} style={[styles.perkRow, { borderBottomColor: native.separator }]}>
              <Ionicons name="sparkles-outline" size={16} color={plan.accent} />
              <Text style={[styles.perkText, { color: tokens.text }]}>{perk}</Text>
            </View>
          ))}
        </ModuleSection>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/dashboard" as never)}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: tokens.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/membership" as never)}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { borderColor: tokens.accentBorder, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="ribbon-outline" size={18} color={tokens.accentDark} />
          <Text style={[styles.secondaryBtnText, { color: tokens.accentDark }]}>View Membership</Text>
        </Pressable>

        <Text style={[styles.note, { color: native.secondaryLabel }]}>
          Confirmation email sent if your account has an email on file.
        </Text>
      </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginBottom: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center" },
  heroSubtitle: { color: "rgba(255,255,255,0.88)", fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  perkText: { flex: 1, fontSize: 14, lineHeight: 20 },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "600" },
  note: { fontSize: 12, textAlign: "center", marginTop: 16 },
})
