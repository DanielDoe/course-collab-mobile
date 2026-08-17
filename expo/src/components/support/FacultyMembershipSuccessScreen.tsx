import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import type { FacultySession } from "../../lib/session"
import type { FacultyMembershipTier } from "../../types/dashboard"
import { getThemedFacultyMembershipPlan } from "../../lib/faculty-membership-plan-theme"
import { syncFacultyMembershipFromStripe } from "../../lib/membership-checkout-api"

type Props = {
  plan?: FacultyMembershipTier
  sessionId?: string
}

export function FacultyMembershipSuccessScreen({ plan: planFromRoute, sessionId }: Props) {
  const { session } = useSession()
  const facultySession = session?.portal === "faculty" ? (session as FacultySession) : null
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { membershipTier, refreshFacultyData } = useFacultyShell()
  const [verifying, setVerifying] = useState(Boolean(sessionId))
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState("")

  const activeTier = planFromRoute ?? membershipTier
  const plan = useMemo(
    () => getThemedFacultyMembershipPlan(activeTier, tokens),
    [activeTier, tokens],
  )

  const verify = useCallback(async () => {
    if (!facultySession) return
    setError("")
    setVerifying(true)
    try {
      if (sessionId) {
        await syncFacultyMembershipFromStripe(facultySession.id, sessionId)
      }
      await refreshFacultyData?.(undefined, { force: true })
      setVerified(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "License sync is still processing.")
      setVerified(false)
    } finally {
      setVerifying(false)
    }
  }, [facultySession, refreshFacultyData, sessionId])

  useEffect(() => {
    void verify()
  }, [verify])

  const subtitle = verifying
    ? "Activating your license…"
    : verified
      ? "Cora Teaching Copilot and authoring tools are ready."
      : "Payment received. Your license is being activated."

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
          <Text style={styles.heroTitle}>{verifying ? "Activating…" : "You're all set!"}</Text>
          <Text style={styles.heroSubtitle}>
            {plan.name} · {subtitle}
          </Text>
        </View>

        <ModuleSection title="Unlocked">
          {plan.perks.slice(0, 5).map((perk) => (
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
})
